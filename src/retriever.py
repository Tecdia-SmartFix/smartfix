from typing import Optional
from chromadb import Collection
from sentence_transformers import SentenceTransformer

RELEVANCE_THRESHOLD = 0.35
TOP_K = 5


def retrieve(
    query: str,
    embedder: SentenceTransformer,
    collection: Collection,
    machine_filter: Optional[str] = None,
    top_k: int = TOP_K,
    history: Optional[list[dict]] = None,
) -> list[dict]:
    # Prepend the last user turn so follow-ups like "how do I fix it?"
    # carry the prior topic into the embedding query.
    retrieval_query = query
    if history:
        last_user = next(
            (t for t in reversed(history) if t.get("role") == "user"), None
        )
        if last_user and last_user.get("content"):
            retrieval_query = f"{last_user['content']} {query}"

    embedding = embedder.encode(retrieval_query).tolist()

    where = {"machine": machine_filter} if machine_filter else None

    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        # ChromaDB cosine distance: 0 = identical, 2 = opposite
        # Convert to similarity: 1 - (dist / 2)
        similarity = 1 - (dist / 2)
        if similarity >= RELEVANCE_THRESHOLD:
            chunks.append({"text": doc, "metadata": meta, "score": similarity})

    return chunks
