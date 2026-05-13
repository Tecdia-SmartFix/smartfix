import re
from typing import Optional
from chromadb import Collection
from sentence_transformers import SentenceTransformer

from .retriever import retrieve
from .prompt_builder import build_prompt
from .llm_client import call_llm

NOT_FOUND_ANSWER = "I could not find enough information in the documentation."
ERROR_ANSWER = "Service temporarily unavailable."

_SEVERITY_RE = re.compile(r"SEVERITY:\s*([1-5])", re.IGNORECASE)


def _parse_severity(raw: str) -> tuple[str, int]:
    """Strip the SEVERITY: <n> tail from the answer and return (clean_answer, severity)."""
    match = _SEVERITY_RE.search(raw)
    if not match:
        return raw.strip(), 1
    severity = int(match.group(1))
    clean = _SEVERITY_RE.sub("", raw).strip()
    return clean, severity


def run_query(
    question: str,
    embedder: SentenceTransformer,
    collection: Collection,
    machine_filter: Optional[str] = None,
    history: Optional[list[dict]] = None,
) -> dict:
    chunks = retrieve(
        question, embedder, collection, machine_filter, history=history
    )

    if not chunks:
        return {
            "status": "not_found",
            "answer": NOT_FOUND_ANSWER,
            "sources": [],
            "severity_level": 1,
        }

    messages = build_prompt(question, chunks, history=history)

    try:
        raw_answer = call_llm(messages)
    except RuntimeError:
        return {
            "status": "error",
            "answer": ERROR_ANSWER,
            "sources": [],
            "severity_level": 1,
        }

    answer, severity = _parse_severity(raw_answer)

    # Be flexible about metadata key naming so chunks ingested via either
    # path (scripts/build_index OR admin upload) render correctly.
    # Admin uploads before this normalisation landed used `source_file` /
    # `page_number`; offline builds and new uploads use `document` / `page`.
    sources = [
        {
            "document": (
                c["metadata"].get("document")
                or c["metadata"].get("source_file")
                or c["metadata"].get("source")
                or ""
            ),
            "page": (
                c["metadata"].get("page")
                or c["metadata"].get("page_number")
                or c["metadata"].get("page_start")
            ),
        }
        for c in chunks
    ]

    return {
        "status": "success",
        "answer": answer,
        "sources": sources,
        "severity_level": severity,
    }
