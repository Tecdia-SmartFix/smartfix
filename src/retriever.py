import re
from typing import Optional
from chromadb import Collection
from sentence_transformers import SentenceTransformer

RELEVANCE_THRESHOLD = 0.35
TOP_K = 5

# Patterns that should trigger an EXACT chunk-content match in addition to the
# usual vector search. Embeddings can't reliably distinguish near-identical
# tokens like "A-05" vs "A-06" vs "E-04" — the right chunk often ranks 6th-10th
# by cosine similarity, losing to other "ALARM A-NN" / "ERROR E-NN" chunks.
# When one of these patterns appears in the question, we guarantee its chunk
# is in context by combining it with the vector search via hybrid retrieval.
#
# These are intentionally broad — anything that LOOKS like an alphanumeric code
# (1–4 uppercase letters, dash optional, 2–4 digits) gets pinned. This catches:
#   E-04, A-06, e-08              ← error / alarm codes (IMM, LASER, HP)
#   ERR-04, FLT-12, ALM-02        ← codes used by other manuals (FDM_X300)
#   FL-001, BT-007, HC-004        ← part-number-style references
#   IMM-750, LC-2040, HP-500      ← model codes
# Specific machine-code patterns kept as separate entries for readability.
_EXACT_MATCH_PATTERNS: tuple[re.Pattern, ...] = (
    # Generic code pattern — 1-4 letters, optional dash, 2-4 digits.
    re.compile(r"\b[A-Z]{1,4}-?\d{2,4}\b", re.IGNORECASE),
    # Single-letter dashed codes — kept explicit because the generic pattern
    # above won't match "E-04" reliably when written lowercase as "e-04".
    re.compile(r"\b[EA]-\d{1,3}\b", re.IGNORECASE),
)


def _extract_exact_keywords(query: str) -> list[str]:
    """Pull strings like 'E-04', 'A-06', 'IMM-750' from the query — these need
    exact substring matching against chunk content, not just embedding sim."""
    keywords: list[str] = []
    for pattern in _EXACT_MATCH_PATTERNS:
        for m in pattern.finditer(query):
            kw = m.group().upper()
            if kw not in keywords:
                keywords.append(kw)
    return keywords


def retrieve(
    query: str,
    embedder: SentenceTransformer,
    collection: Collection,
    machine_filter: Optional[str] = None,
    top_k: int = TOP_K,
    history: Optional[list[dict]] = None,
) -> list[dict]:
    """Hybrid retrieval: keyword-pinned chunks for any exact codes in the
    query, then vector-search results to fill the remaining slots.

    Why hybrid: with pure vector search, asking "what is alarm A-06" on a
    machine that has A-01..A-07 ranks A-06 around 9th — outside TOP_K=5 —
    because the embedding model treats every "ALARM A-NN" line as roughly
    equivalent. Substring matching guarantees the right chunk is in context
    when the user explicitly cites a code.

    Token budget: NET ZERO. Pinned chunks displace lower-ranked vector
    chunks; total chunks sent to the LLM stays at `top_k`.
    """
    # Prepend the last user turn so follow-ups like "how do I fix it?"
    # carry the prior topic into the embedding query.
    retrieval_query = query
    if history:
        last_user = next(
            (t for t in reversed(history) if t.get("role") == "user"), None
        )
        if last_user and last_user.get("content"):
            retrieval_query = f"{last_user['content']} {query}"

    where = {"machine": machine_filter} if machine_filter else None
    embedding = embedder.encode(retrieval_query).tolist()

    # ── Pass 1: exact-keyword pins ────────────────────────────────────────
    pinned: list[dict] = []
    seen_ids: set[str] = set()
    for kw in _extract_exact_keywords(retrieval_query):
        try:
            kw_res = collection.query(
                query_embeddings=[embedding],
                n_results=2,                            # at most 2 chunks per code
                where=where,
                where_document={"$contains": kw},       # literal substring match
                include=["documents", "metadatas", "distances"],
            )
        except Exception:
            # ChromaDB raises if no document matches the substring filter.
            continue
        for doc, meta, dist in zip(
            kw_res["documents"][0],
            kw_res["metadatas"][0],
            kw_res["distances"][0],
        ):
            cid = f"{meta.get('document','?')}::{meta.get('page','?')}::{doc[:50]}"
            if cid in seen_ids:
                continue
            seen_ids.add(cid)
            pinned.append({
                "text": doc,
                "metadata": meta,
                "score": 1 - (dist / 2),
            })

    # ── Pass 2: vector search ─────────────────────────────────────────────
    vector_results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k + len(pinned),  # over-fetch so we can fill TOP_K after dedupe
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    # ── Merge: pinned first, then vector results, dedupe, threshold, cap ─
    chunks: list[dict] = list(pinned)
    for doc, meta, dist in zip(
        vector_results["documents"][0],
        vector_results["metadatas"][0],
        vector_results["distances"][0],
    ):
        cid = f"{meta.get('document','?')}::{meta.get('page','?')}::{doc[:50]}"
        if cid in seen_ids:
            continue
        similarity = 1 - (dist / 2)
        if similarity < RELEVANCE_THRESHOLD:
            continue
        seen_ids.add(cid)
        chunks.append({"text": doc, "metadata": meta, "score": similarity})
        if len(chunks) >= top_k:
            break

    return chunks[:top_k]
