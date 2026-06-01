# SmartFix — Chunking Strategy

How we turn machine manuals (PDFs) into the chunks that ChromaDB indexes, what we tried, and why we landed where we did.

Source: `src/ingestion/parser_chunker.py`.

---

## TL;DR

We do **not** use fixed-size chunking with a sliding overlap. We use **section-aware chunking** where each chunk corresponds to one logical unit of the manual — usually one error code (description + causes + all resolution steps) or one procedural section. Average chunk size after this process is ~600–1200 characters; the minimum is 60 characters.

This choice is driven by what users *actually ask* on the shop floor: "what is error E-04 and how do I fix it" maps perfectly to one self-contained fault entry, but maps badly to "chunk #37 of a 400-character window."

---

## The five manual formats we support

All five PDFs in the dataset use slightly different heading conventions:

| Manual | Section heading | Fault heading |
|---|---|---|
| LASER, IMM | `N. Section Title` | `Error Code E-NN — Description` |
| HP-500 | `SECTION N — TITLE` | `ALARM A-NN — DESCRIPTION` |
| FDM-X300 | `Section N — Title` | `ERR-NN — Description` |
| RA-6200 | `N. Title` | `Fault Code F-NN — Description` |

The chunker detects which format a manual uses and applies the matching regex set — see `_EXACT_MATCH_PATTERNS` style detection in `parser_chunker.py`.

---

## The pipeline

```
PDF
  │
  │ 1. pypdf extracts text page-by-page
  ▼
raw text
  │
  │ 2. collapse double-spaces (pypdf artefact)
  │ 3. reconstruct word-per-line extractions into logical lines
  ▼
clean text
  │
  │ 4. detect section boundaries via document-aware heading regex
  ▼
raw sections
  │
  │ 5. merge numbered resolution steps + sub-headings ("Common causes",
  │    "Resolution Steps", "Why it happens") INTO the parent fault chunk
  ▼
merged sections
  │
  │ 6. attach classification metadata (machine_id, page, section type,
  │    safety flag, maintenance frequency, error code…)
  │ 7. drop chunks shorter than MIN_CHUNK_CHARS (60)
  ▼
final chunks → data/processed/<machine>_chunks.json
```

---

## Why section-aware (not fixed-size)

### Step 5 is the load-bearing one

Most generic RAG examples chunk by ~500 tokens with a 50-token overlap. We tried that first. It broke in a way that is specific to fault-code manuals:

A typical fault entry in these manuals looks like this:

```
Error Code E-04 — Hydraulic Pressure Out of Range

The hydraulic system pressure has fallen below the operating threshold of …

Common causes:
  • Low oil level in the reservoir
  • Clogged return-line filter
  • …

Resolution Steps:
  1. STOP the machine and engage the emergency lock.
  2. Check oil level …
  3. …
  7. Restart the machine and confirm pressure reads above 80 bar.
```

With a 500-token window, this entry got split into 2–3 chunks. The chunk containing the *description* didn't contain the *resolution steps*. Retrieval for "how do I fix E-04" returned the description chunk; the model produced a confident answer about what E-04 *is* but said nothing about how to fix it.

Section-aware merging keeps the whole entry as one chunk. Retrieval returns one chunk; the model sees description, causes, and all 7 steps. Answer quality jumped substantially.

### "Average chunk size" is a side effect, not a target

Because chunks are sized by content boundaries, length varies:

- Short safety callouts: 80–200 chars
- Maintenance procedures: 400–800 chars
- Fault entries: 600–1500 chars (most common)
- A few long sections: 1500–2500 chars

We do not enforce a maximum. ChromaDB and `all-MiniLM-L6-v2` handle these sizes fine, and any forced split would re-introduce the problem step 5 exists to solve.

---

## Overlap

**Zero. There is no sliding-window overlap.**

Sliding overlap is a workaround for fixed-size chunking — it tries to make sure no concept gets split awkwardly across a window boundary. Section-aware chunking doesn't have window boundaries, so it doesn't need overlap.

This also keeps the chunk count lower, which makes the index smaller and retrieval faster.

---

## Minimum chunk size: 60 chars

`MIN_CHUNK_CHARS = 60`. Anything shorter is dropped.

This filters out:
- Page headers / footers that pypdf extracts as their own text block
- Single-word section dividers
- Stray figure captions like "Fig. 3"

Below 60 chars there is rarely enough text to embed meaningfully — and these short fragments tend to rank misleadingly high in cosine similarity because they share almost all their tokens with the query.

---

## Metadata attached to each chunk

Every chunk carries:

| Field | Purpose |
|---|---|
| `machine` (or `machine_id`) | Used as the ChromaDB `where` filter so retrieval is scoped to the worker's machine |
| `document` | Source PDF filename (rendered in the answer's source chips) |
| `page` | Page number (rendered as the page-NN citation) |
| `section` (if detected) | E.g. "troubleshooting", "maintenance", "overview" |
| `error_code` (if detected) | E.g. "E-04", "A-06" — used by exact-match retrieval (see below) |
| `safety_flag` (if detected) | True if the section contains keywords like DANGER, LOCK OUT, HIGH VOLTAGE |
| `maintenance_freq` (if detected) | "daily", "weekly", "every 500 print hours", etc. |

ChromaDB only accepts primitive metadata values, so lists / dicts / `None` are filtered out at index time (`scripts/build_index.py:normalize_chunk`).

---

## Why this chunking decision is tied to retrieval

The retriever (`src/retriever.py`) uses **hybrid search**: it pins any chunk whose content literally contains an error code mentioned in the query (e.g. "E-04"), then fills the remaining `TOP_K` slots from vector search.

This works *because* our chunks are self-contained fault entries. If chunks were arbitrary 500-token windows, the substring "E-04" might appear in three different windows (description, steps, cross-reference) and the pin would be ambiguous. Section-aware chunking gives the keyword pin a single, correct target per error code.

---

## What we tried before this

| Approach | Result | Why we moved on |
|---|---|---|
| Fixed 500-token chunks, 50-token overlap (LangChain default) | Resolution steps got separated from fault descriptions | The whole point of a fault entry is description + steps together |
| Fixed 1000-token chunks, no overlap | Better, but long maintenance sections were truncated mid-procedure | Same root issue — token boundaries don't match document semantics |
| Paragraph-based chunking | Better than fixed-size, but lost multi-paragraph fault entries | Step 5 (merge sub-headings into parents) fixed this and we kept it |
| Section-aware + 200-token overlap | No measurable retrieval improvement, +20% storage | Overlap is a fixed-size workaround; we don't need it |
| One chunk per page | Pages contain unrelated content; retrieval got noisy | Page boundaries are visual, not semantic |

---

## When you should re-tune this

- **New manual format** with headings the regex doesn't recognise → add the heading pattern to `parser_chunker.py` and re-ingest.
- **Manuals with much longer fault entries (>3000 chars)** → consider splitting at the "Resolution Steps" sub-heading, but only if you also extend the retriever to pull *both halves* when one is pinned.
- **Manuals without error codes** (e.g. operating-manual-only) → the keyword-pin path in the retriever simply doesn't fire; vector search handles it. No chunking change needed.

---

## Quick parameter reference

| Param | Where | Value | Effect |
|---|---|---|---|
| `MIN_CHUNK_CHARS` | `src/ingestion/parser_chunker.py:48` | `60` | Drop chunks below this length |
| (no max size) | — | — | Chunks end where the section ends |
| (no overlap) | — | `0` | Section-aware chunking doesn't need it |
| `BATCH_SIZE` | `scripts/build_index.py` | `64` | Embedding batch size — performance only |
