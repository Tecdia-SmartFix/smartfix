# Chunking & Parsing Strategy
## Hardware RAG — Tecdia Project

---

## Important Notice on Document Scope

> **The parser and chunker in this repository are built and validated against a fixed set of five test manuals provided during development.** We were not provided with the full range of actual production documentation that will be ingested in the live system. As a result, the document format detection patterns, heading recognition logic, and error code regex patterns are tuned to the formats observed in these five documents. **They will need to be reviewed and extended when integrated with real production documentation.**

The five test documents and their structural formats are:

| Document | Error Code Format | Causes Label | Resolution Label |
|---|---|---|---|
| LC-2040 Laser Cutter | `E-01` … `E-08` | `Common causes:` | `Resolution Steps:` |
| IMM-750 Injection Moulder | `E-01` … `E-08` | `Common causes (low/high):` | `Resolution Steps:` |
| FDM-X300 3D Printer | `ERR-01` … `ERR-07` | `Why it happens:` | `How to fix it:` |
| RA-6200 Robot Arm | `F-01` … `F-07` | `Common causes:` | `Diagnostic steps and resolution:` |
| HP-500 Hydraulic Press | `A-01` … `A-07` | `CAUSES:` | `RESOLUTION:` |

---

## Architecture Overview

```
PDF File
   ↓
parser_chunker.py  ─── pypdf (text extraction, page by page)
   ↓                   ↓
   Text cleaning    Paragraph reconstruction
   ↓
   Section boundary detection (heading patterns)
   ↓
   Fault chunk merging (causes + steps → same chunk)
   ↓
   Metadata enrichment
   ↓
chunks.json
```

The final implementation lives in a single file: `src/ingestion/parser_chunker.py`. It exposes `process_and_chunk()` and `save_chunks_to_json()`, and also mounts a FastAPI endpoint at `POST /parse-manual`.

---

## What Was Tried

### Attempt 1 — Docling + MarkdownHeaderTextSplitter

**Approach:** Use Docling (a deep learning PDF layout detection library) to convert PDFs to markdown. Then use LangChain's `MarkdownHeaderTextSplitter` to split on `##` boundaries.

**Chunk size:** Variable — one chunk per markdown heading. Typical range: 200–1500 characters.

**Overlap:** None — purely header-boundary splits.

**Why it failed:**
- `MarkdownHeaderTextSplitter` splits on exact heading text. A sub-heading like `Common causes:` became a separate chunk from its parent error code. Each error code fragmented into 3–5 pieces (description chunk, causes chunk, resolution chunk), none of which contained enough context to be a useful retrieval result.
- The IMM-750 manual uses `Common causes (low pressure):` and `Common causes (high pressure):` — parenthetical variants that the exact-match splitter never merged back.
- Docling's element tree API changed between versions. Code accessing `.label.name`, `.prov`, `.level` on elements failed silently, causing the entire pipeline to fall back to PyMuPDF on every page.
- `do_table_structure=True` caused `std::bad_alloc` (C++ heap allocation failure) on dense pages, silently dropping pages 6–10 of the IMM-750 manual. Maintenance schedule, safety precautions, and spare parts were lost with no warning.

---

### Attempt 2 — Docling + Custom Merge Pass (Regex Prefix Matching)

**Approach:** Keep Docling for extraction. Replace `MarkdownHeaderTextSplitter` with a custom merge pass: after splitting, detect sub-headings by prefix and fold them back into their parent error-code chunk.

**Chunk size:** One chunk per error code (merged), one chunk per top-level section. Typical range: 400–2000 characters.

**Overlap:** None.

**Why it failed:**
- The sub-heading prefix list (`["common causes:", "resolution steps:", "why it happens:", "how to fix it:", ...]`) was a manually maintained vocabulary that required extension for every new document. Any manual author using different phrasing broke the merge.
- The FDM-X300 3D Printer uses `If temperature rose above set point:` and `If spool is empty:` as sub-headings. These are conditional branches, not named sub-sections — no prefix list could enumerate all possible conditionals.
- Docling was still failing on dense pages, and the markdown normaliser that was added to fix PyMuPDF fallback output (injecting `##` headers into raw text) itself required a large list of section-name patterns, reintroducing the same fragility.

---

### Attempt 3 — pypdf + LLM Segmentation (Groq / Llama)

**Approach:** Drop Docling entirely. Use pypdf for text extraction (lightweight, no ML models, no memory issues). Send page text to an LLM (Llama 3.3 70B via Groq) in sliding-window batches and ask the LLM to simultaneously identify section boundaries and extract metadata.

**Chunk size:** LLM-determined per section. Error code chunks: ~600–1800 characters. Maintenance chunks: ~200–600 characters. Specification chunks: ~400–1200 characters.

**Overlap:** 1 page between consecutive 2-page batches.

**Why it partially failed:**
- Groq's free tier TPM (tokens per minute) limit of 12,000 was exceeded when the entire 9-page laser cutter manual (~17,700 characters) was sent in one call. The API returned HTTP 413.
- With a 2-page batch and 1-page overlap, the LLM could not see complete error code sections that spanned 2–3 pages. Causes and resolution steps that fell on the next page were returned in the following batch as orphaned fragments.
- Hash-based deduplication removed the longer (more complete) version of a chunk when the shorter version appeared first from an earlier batch.

**Partial fixes applied:**
- Adaptive batch sizing (small documents → single call, large → smaller batches).
- Smarter deduplication: keep the longest version of each error code chunk across all batches, not the first.
- `temperature=0` for deterministic JSON output.
- Explicit prompt instruction: do not return an error code chunk if its resolution steps are not visible in the current batch.

---

### Attempt 4 — pypdf + Rule-Based Segmentation (Final Chosen Approach)

**Approach:** Keep pypdf for extraction. Replace LLM segmentation with a deterministic rule-based approach using document-format-aware heading patterns and a step-merging pass. No LLM calls at chunking time.

**Why this was chosen:**
- No API dependency, no token limits, no rate limiting.
- Deterministic and reproducible — same input always produces same output.
- Fast — a 10-page manual processes in under 1 second.
- Explainable — every chunk boundary decision can be traced to a specific pattern match.
- Sufficient for the test documents provided. The patterns are documented and can be extended.

---

## Final Implementation Details

### Text Extraction

**Library:** `pypdf` (`PdfReader`)

pypdf extracts text page by page as a raw string. For digitally-generated PDFs (not scanned), it reliably recovers all text content without OCR. One known artefact: pypdf sometimes emits body text one word per line rather than as full sentences. A paragraph reconstruction step addresses this.

### Paragraph Reconstruction

pypdf's raw output splits some body text into one word per line. The `_reconstruct_paragraphs()` function collapses these fragments back into full logical lines:

- Lines that are "standalone" (headings, numbered steps, bullet points, sentence-ending lines) are kept as-is.
- All other short continuation fragments are accumulated in a buffer and flushed as one line when a standalone line is encountered.

The `_is_standalone()` function classifies each line using:
1. Fault heading pattern match (always standalone)
2. Section heading pattern match (standalone if ≤ 8 words)
3. Maintenance frequency heading match
4. Sub-heading match (`Common causes:`, `Resolution Steps:`, etc.)
5. Numbered step match (`1. …`, `2) …`)
6. Bullet prefix match (`●`, `—`, `-`)
7. ALL-CAPS heading match (HP-500 style)
8. Sentence-ending check (ends with `.!?` and has > 3 words)
9. Short fragment detection (≤ 2 words → continuation, not standalone)

### Section Boundary Detection

Headings are classified into four types by `_heading_type()`:

| Type | Patterns | Examples |
|---|---|---|
| `fault` | Error/Fault/Alarm code heading patterns | `Error Code E-01 —`, `Fault Code F-03 —`, `ALARM A-04 —`, `ERR-07 —` |
| `section` | Numbered section headings ≤ 8 words | `1. Machine Overview`, `Section 2 — Technical Specifications`, `SECTION 5 — ALARM CODES` |
| `maintenance` | Frequency keywords at line start | `Daily`, `Weekly`, `Monthly`, `Every 6 Months`, `After Every Print` |
| `none` | Everything else | Body text, numbered steps, bullet points, sub-headings |

### Fault Chunk Merging

This is the core design decision that makes each error code a self-contained retrieval unit.

When `_split_into_sections()` encounters a `fault` heading, it opens a new chunk. Every subsequent line — including numbered steps, bullet points, and sub-headings (`Common causes:`, `Resolution Steps:`, `Why it happens:`, etc.) — is appended to that chunk until the next `fault`, `section`, or `maintenance` heading is encountered.

This means:
- `Common causes:` followed by bullet points → stays in the error chunk
- `Resolution Steps:` followed by numbered steps → stays in the error chunk
- `If temperature rose above set point:` → stays in the error chunk
- `Diagnostic steps and resolution:` → stays in the error chunk

Sub-headings are detected by `_SUB_HEADING_RE` but they do not trigger a chunk boundary — they only affect the `_is_standalone()` classification so the text formatter keeps them as distinct lines rather than collapsing them into the previous paragraph.

### Chunk Parameters

| Parameter | Value | Rationale |
|---|---|---|
| `MIN_CHUNK_CHARS` | 60 | Drops bare-header sections with no body content |
| Chunk size (error codes) | ~600–1800 chars | Natural — one complete error code including description, causes, all steps |
| Chunk size (maintenance) | ~200–600 chars | Natural — one frequency group (Daily, Weekly, etc.) |
| Chunk size (specifications) | ~400–1200 chars | Natural — one spec table or parameter section |
| Overlap | None | Sections do not overlap. Each chunk maps to exactly one logical section. |

Overlap is zero because the segmentation is deterministic — once a fault heading is detected, all following content belongs to that fault until the next heading. There is no ambiguity about where one section ends and the next begins. Overlapping chunks would duplicate content without adding retrieval value.

### Metadata Fields

Every chunk carries the following metadata:

| Field | Type | Description |
|---|---|---|
| `machine_id` | `str` | Normalised document identifier (spaces/hyphens → underscores, uppercased) |
| `source_file` | `str` | Original PDF filename |
| `source` | `str` | Original PDF filename (duplicate for API compatibility) |
| `section` | `str` | Raw heading text of this section |
| `section_id` | `str` | Same as `section` — label for retrieval filtering |
| `page_numbers` | `list[int]` | All physical page numbers this chunk spans |
| `page_start` | `int` | First physical page (1-based) |
| `page_number` | `int` | Last physical page (1-based) |
| `is_table` | `bool` | True if content contains markdown table syntax (`|` and `---`) |
| `is_safety` | `bool` | True if content matches any safety keyword |
| `is_troubleshooting` | `bool` | True if `chunk_type == "error_code"` or troubleshooting keywords present |
| `chunk_type` | `str` | Enum: `error_code`, `maintenance`, `specification`, `safety`, `spare_parts`, `overview` |
| `error_code` | `str \| null` | Bare error code (`E-01`, `F-03`, `A-04`, `ERR-07`) or `null` |
| `cross_references` | `list[str]` | Other error codes cited in this chunk's content |

### Coverage Validation

After all chunks are produced, `_validate_coverage()` scans the full PDF text for all error code patterns and cross-checks them against the chunk set. Any error code present in the PDF but absent from all chunks is reported as a `COVERAGE WARNING` to stderr. This catches silent data loss.

---

## Limitations and Required Extensions for Production

The following items are explicitly scoped out and must be addressed before integrating with production documentation:

1. **Error code format patterns** (`_FAULT_HEADING_PATTERNS`) cover only the five observed formats (`E-NN`, `ERR-NN`, `F-NN`, `A-NN`). Any other format (e.g. `FAULT_001`, `[ERR-12]`, `Code: T-005`) will not be detected as a fault heading and will be treated as body text.

2. **Section heading patterns** (`_SECTION_HEADING_PATTERNS`) detect numbered sections and `SECTION N —` format. Unnumbered sections, letter-indexed sections (`A. Overview`, `B. Safety`), and non-Latin headings will not be detected.

3. **Maintenance frequency patterns** detect the six frequencies observed in the test set. Documents using different intervals (e.g. `Every Quarter`, `Bi-Weekly`, `Every 2000 Hours`) will not trigger maintenance chunk boundaries.

4. **Table extraction** is detected heuristically (presence of `|` and `---`). Docling's table structure recognition was disabled due to memory issues. Complex multi-column tables may not extract correctly from pypdf.

5. **Scanned PDFs** are not supported. pypdf cannot extract text from scanned images. OCR integration would be required.

6. **Multi-language documents** are not tested. All patterns assume English headings.

7. **The `apply_universal_heuristics()` function** is a no-op shim retained for API compatibility with earlier versions. It can be removed once callers are updated.

---

## Output Format

Each entry in the output JSON file follows this structure:

```json
{
    "chunk_id": 6,
    "content": "Error Code E-01 - Laser Output Power Low\nDescription: ...\nCommon causes:\n- ...\nResolution Steps:\n1. ...",
    "metadata": {
        "machine_id": "LASER_CUTTING_MACHINE",
        "source_file": "LASER_CUTTING_MACHINE.pdf",
        "source": "LASER CUTTING MACHINE.pdf",
        "section": "Error Code E-01 - Laser Output Power Low",
        "section_id": "Error Code E-01 - Laser Output Power Low",
        "page_numbers": [3],
        "page_start": 3,
        "page_number": 3,
        "is_table": false,
        "is_safety": false,
        "is_troubleshooting": true,
        "chunk_type": "error_code",
        "error_code": "E-01",
        "cross_references": ["E-03"]
    }
}
```

---

## Running the Pipeline

### As a Python function

```python
from src.ingestion.parser_chunker import process_and_chunk, save_chunks_to_json

chunks = process_and_chunk(
    pdf_path   = "data/uploads/LASER_CUTTING_MACHINE.pdf",
    filename   = "LASER_CUTTING_MACHINE.pdf",
    machine_id = "LASER_CUTTING_MACHINE",   # optional, inferred from filename if omitted
)

save_chunks_to_json(chunks, "data/processed/LASER_CUTTING_MACHINE_chunks.json")
```

### As an API

```bash
uvicorn src.ingestion.parser_chunker:app --host 0.0.0.0 --port 8000

curl -X POST http://localhost:8000/parse-manual \
     -F "file=@data/uploads/LASER_CUTTING_MACHINE.pdf"
```

### Dependencies

```
pypdf
fastapi
uvicorn
```

No LLM API keys required. No GPU or ML model downloads required.
