"""
Reads all JSON files from ./data/processed/, embeds each chunk, and stores them in ChromaDB.
Run from the project root: python -m scripts.build_index
"""
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db import get_chroma_collection

load_dotenv()

CACHE_DIR = Path("./data/processed")
BATCH_SIZE = 64


def normalize_chunk(raw: dict, source_stem: str) -> dict:
    """Map the chunker's schema to {id, text, metadata} expected by the retriever."""
    meta_in = raw.get("metadata", {}) or {}

    machine = meta_in.get("machine_id") or meta_in.get("machine") or source_stem
    document = meta_in.get("source_file") or meta_in.get("document") or f"{source_stem}.pdf"
    page = meta_in.get("page_number") or meta_in.get("page_start") or meta_in.get("page")

    chunk_id = raw.get("id") or raw.get("chunk_id")
    stable_id = f"{machine}_chunk_{chunk_id}"

    metadata = {"machine": machine, "document": document}
    if page is not None:
        metadata["page"] = page
    # Carry through any remaining primitive metadata; ChromaDB rejects lists/dicts/None.
    for k, v in meta_in.items():
        if k in metadata or k in {"machine_id", "source_file", "page_number", "page_start"}:
            continue
        if isinstance(v, (str, int, float, bool)):
            metadata[k] = v

    return {
        "id": stable_id,
        "text": raw.get("text") or raw.get("content") or "",
        "metadata": metadata,
    }


def load_chunks(cache_dir: Path) -> list[dict]:
    chunks = []
    for json_file in sorted(cache_dir.glob("*.json")):
        print(f"Reading {json_file.name}...")
        with json_file.open() as f:
            data = json.load(f)
        for raw in data:
            chunks.append(normalize_chunk(raw, json_file.stem.replace("_chunks", "")))
    return chunks


def build_index():
    if not CACHE_DIR.exists():
        print(f"Cache directory '{CACHE_DIR}' does not exist. Nothing to index.")
        sys.exit(1)

    chunks = load_chunks(CACHE_DIR)
    if not chunks:
        print(f"No chunks found in {CACHE_DIR}. Nothing to do.")
        sys.exit(0)

    print(f"Loaded {len(chunks)} chunks. Loading embedder...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    collection = get_chroma_collection()

    existing_ids = set(collection.get(include=[])["ids"])
    new_chunks = [c for c in chunks if c["id"] not in existing_ids]

    if not new_chunks:
        print("All chunks already indexed. Nothing to do.")
        return

    print(f"Embedding {len(new_chunks)} new chunks...")
    texts = [c["text"] for c in new_chunks]
    embeddings = embedder.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=True)

    ids = [c["id"] for c in new_chunks]
    metadatas = [c["metadata"] for c in new_chunks]

    collection.add(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=texts,
        metadatas=metadatas,
    )

    print(f"Indexed {len(new_chunks)} chunks. Collection size: {collection.count()}")


if __name__ == "__main__":
    build_index()
