"""
Demo script: indexes 5 hardcoded sample chunks and runs 3 sample questions.
Run from the project root: python -m scripts.demo
"""
import sys
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from src.db import get_chroma_collection
from src.rag_pipeline import run_query

SAMPLE_CHUNKS = [
    {
        "id": "IMM-750_p12_c01",
        "text": "Error code E-04 indicates feeder pressure imbalance. To resolve: check hopper valve, recalibrate pressure sensor.",
        "metadata": {"machine": "IMM-750", "document": "IMM-750.pdf", "page": 12, "section": "troubleshooting"},
    },
    {
        "id": "IMM-750_p15_c01",
        "text": "Preventive maintenance: lubricate barrel screw every 500 operating hours.",
        "metadata": {"machine": "IMM-750", "document": "IMM-750.pdf", "page": 15, "section": "maintenance"},
    },
    {
        "id": "HP-500_p08_c01",
        "text": "Alarm A-02 indicates low hydraulic pressure. First check hydraulic fluid level, then inspect pump seals.",
        "metadata": {"machine": "HP-500", "document": "HP-500.pdf", "page": 8, "section": "troubleshooting"},
    },
    {
        "id": "HP-500_p09_c01",
        "text": "Safety: always depressurize system before opening any hydraulic line. Use PPE at all times.",
        "metadata": {"machine": "HP-500", "document": "HP-500.pdf", "page": 9, "section": "safety"},
    },
    {
        "id": "LC-2040_p05_c01",
        "text": "Laser power calibration must be performed monthly. Refer to section 4.2 for procedure.",
        "metadata": {"machine": "LC-2040", "document": "LC-2040.pdf", "page": 5, "section": "calibration"},
    },
]

SAMPLE_QUESTIONS = [
    ("What does error E-04 mean on the IMM-750?", "IMM-750"),
    ("How do I fix alarm A-02 on the hydraulic press?", "HP-500"),
    ("What is the warranty period for the IMM-750?", "IMM-750"),
]


def index_samples(embedder, collection):
    existing_ids = set(collection.get(include=[])["ids"])
    new_chunks = [c for c in SAMPLE_CHUNKS if c["id"] not in existing_ids]

    if not new_chunks:
        print("Sample chunks already indexed.\n")
        return

    texts = [c["text"] for c in new_chunks]
    embeddings = embedder.encode(texts).tolist()

    collection.add(
        ids=[c["id"] for c in new_chunks],
        embeddings=embeddings,
        documents=texts,
        metadatas=[c["metadata"] for c in new_chunks],
    )
    print(f"Indexed {len(new_chunks)} sample chunks.\n")


def main():
    print("Loading embedder and ChromaDB...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    collection = get_chroma_collection()

    index_samples(embedder, collection)

    for question, machine_filter in SAMPLE_QUESTIONS:
        result = run_query(question, embedder, collection, machine_filter=machine_filter)

        print(f"Q: {question}")
        print(f"Status: {result['status']}")
        print(f"Answer: {result['answer']}")
        if result["sources"]:
            src_strs = [f"{s['document']}, page {s['page']}" for s in result["sources"]]
            print(f"Sources: {' | '.join(src_strs)}")
        else:
            print("Sources: none")
        print("---")


if __name__ == "__main__":
    main()
