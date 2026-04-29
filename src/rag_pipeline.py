from typing import Optional
from chromadb import Collection
from sentence_transformers import SentenceTransformer

from .retriever import retrieve
from .prompt_builder import build_prompt
from .llm_client import call_llm

NOT_FOUND_ANSWER = "I could not find enough information in the documentation."
ERROR_ANSWER = "Service temporarily unavailable."


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
        return {"status": "not_found", "answer": NOT_FOUND_ANSWER, "sources": []}

    messages = build_prompt(question, chunks, history=history)

    try:
        answer = call_llm(messages)
    except RuntimeError:
        return {"status": "error", "answer": ERROR_ANSWER, "sources": []}

    sources = [
        {"document": c["metadata"].get("document", ""), "page": c["metadata"].get("page")}
        for c in chunks
    ]

    return {"status": "success", "answer": answer, "sources": sources}
