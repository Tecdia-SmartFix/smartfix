# Backend Integration Guide for Claude Code

This file is a self-contained instruction set for Claude Code.
Drop it into the teammate's cloned repo root and open Claude Code there.
Claude Code should read this file first, survey the repo layout, then implement everything below.

---

## What to do

1. Read this entire file before writing anything.
2. Run `find . -type f | sort` to understand the existing repo structure.
3. Identify where chunked docs live (likely a `cache/` folder with `.jsonl` files) and where the parser/chunker code lives.
4. Create the directory structure below, adapting paths only if the repo already uses different conventions (e.g. `data/` instead of `cache/`). If in doubt, keep the names below.
5. Write every file listed in the **Files to create** section with exactly the content shown.
6. Merge `requirements.txt` — do not overwrite if one already exists; append only the missing packages.
7. Merge `.gitignore` — append only entries not already present.
8. If a `CLAUDE.md` already exists, append the **CLAUDE.md content** section below to it. Otherwise create it fresh.
9. Do not delete, rename, or modify any existing parser/chunker files.

---

## Directory structure to create

```
<repo-root>/
├── src/
│   ├── __init__.py
│   ├── api.py
│   ├── db.py
│   ├── llm_client.py
│   ├── prompt_builder.py
│   ├── rag_pipeline.py
│   └── retriever.py
├── scripts/
│   ├── build_index.py
│   └── demo.py
├── .env.example          (create if missing)
├── .gitignore            (merge if exists)
└── requirements.txt      (merge if exists)
```

`cache/` is where the teammate's chunked JSONL files should already live.
`chroma_db/` will be generated at runtime — do not create it manually.

---

## Files to create

### `src/__init__.py`
```python
```
(empty file — just needs to exist so `src` is a package)

---

### `src/db.py`
```python
import chromadb

CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "machine_docs"


def get_chroma_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return collection
```

---

### `src/retriever.py`
```python
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
) -> list[dict]:
    embedding = embedder.encode(query).tolist()

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
```

---

### `src/prompt_builder.py`
```python
SYSTEM_PROMPT = """You are a technical support assistant for industrial machinery.
Answer questions strictly using the provided context excerpts from official documentation.
Rules:
- Only use information from the context below. Never guess or add outside knowledge.
- Cite the page number(s) from the source when giving an answer.
- If the context does not contain enough information, say so clearly.
- Be concise and precise."""


def build_prompt(question: str, chunks: list[dict]) -> list[dict]:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        context_parts.append(
            f"[Excerpt {i} — {meta.get('document', 'unknown')}, page {meta.get('page', '?')}]\n{chunk['text']}"
        )

    context_block = "\n\n".join(context_parts)

    user_message = f"""Context from documentation:

{context_block}

Question: {question}

Answer (cite page numbers):"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]
```

---

### `src/llm_client.py`
```python
import os
from groq import Groq, APIError, APIConnectionError, RateLimitError

MODEL = "llama-3.1-70b-versatile"
MAX_TOKENS = 512
TEMPERATURE = 0.1

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        _client = Groq(api_key=api_key)
    return _client


def call_llm(messages: list[dict]) -> str:
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )
        return response.choices[0].message.content.strip()
    except RateLimitError:
        raise RuntimeError("rate_limit")
    except APIConnectionError:
        raise RuntimeError("connection_error")
    except APIError as e:
        raise RuntimeError(f"api_error:{e.status_code}")
```

---

### `src/rag_pipeline.py`
```python
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
) -> dict:
    chunks = retrieve(question, embedder, collection, machine_filter)

    if not chunks:
        return {"status": "not_found", "answer": NOT_FOUND_ANSWER, "sources": []}

    messages = build_prompt(question, chunks)

    try:
        answer = call_llm(messages)
    except RuntimeError:
        return {"status": "error", "answer": ERROR_ANSWER, "sources": []}

    sources = [
        {"document": c["metadata"].get("document", ""), "page": c["metadata"].get("page")}
        for c in chunks
    ]

    return {"status": "success", "answer": answer, "sources": sources}
```

---

### `src/api.py`
```python
import time
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from .db import get_chroma_collection
from .rag_pipeline import run_query

load_dotenv()

ml_models: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.time()
    ml_models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2")
    ml_models["collection"] = get_chroma_collection()
    print(f"startup complete in {time.time() - start:.2f}s", flush=True)
    yield
    ml_models.clear()


app = FastAPI(title="Machine Troubleshooting RAG API", lifespan=lifespan)


class QueryRequest(BaseModel):
    question: str
    machine_filter: Optional[str] = None


class Source(BaseModel):
    document: str
    page: Optional[int]


class QueryResponse(BaseModel):
    status: str
    answer: str
    sources: list[Source]


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    result = run_query(
        question=req.question,
        embedder=ml_models["embedder"],
        collection=ml_models["collection"],
        machine_filter=req.machine_filter,
    )
    return result
```

---

### `scripts/build_index.py`
```python
"""
Reads all JSONL files from ./cache/, embeds each chunk, and stores them in ChromaDB.
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

CACHE_DIR = Path("./cache")
BATCH_SIZE = 64


def load_chunks(cache_dir: Path) -> list[dict]:
    chunks = []
    for jsonl_file in sorted(cache_dir.glob("*.jsonl")):
        print(f"Reading {jsonl_file.name}...")
        with jsonl_file.open() as f:
            for line in f:
                line = line.strip()
                if line:
                    chunks.append(json.loads(line))
    return chunks


def build_index():
    if not CACHE_DIR.exists():
        print(f"Cache directory '{CACHE_DIR}' does not exist. Nothing to index.")
        sys.exit(1)

    chunks = load_chunks(CACHE_DIR)
    if not chunks:
        print("No chunks found in cache/. Nothing to do.")
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
```

**Important:** If the teammate's repo uses a different folder name than `cache/` for chunked JSONL files, update `CACHE_DIR` in this file to match.

---

### `scripts/demo.py`
```python
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
```

---

### `.env.example`
```
GROQ_API_KEY=your_groq_api_key_here
```

---

### Packages to add to `requirements.txt`
Append these lines if not already present:
```
chromadb>=0.5.0
sentence-transformers>=3.0.0
groq>=0.9.0
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
python-dotenv>=1.0.0
pydantic>=2.0.0
```

---

### Lines to add to `.gitignore`
Append these if not already present:
```
.env
__pycache__/
*.pyc
chroma_db/
.venv/
venv/
*.egg-info/
dist/
build/
```

---

## CLAUDE.md content

If a `CLAUDE.md` already exists in this repo, append the following section to it.
If it does not exist, create `CLAUDE.md` with this as the full content.

```markdown
## Backend (RAG pipeline)

```bash
# Install all dependencies
pip install -r requirements.txt

# Index chunked JSONL files from cache/ into ChromaDB
python3 -m scripts.build_index

# Run self-contained demo (no real PDFs needed)
python3 -m scripts.demo

# Start the API server
python3 -m uvicorn src.api:app --host 0.0.0.0 --port 8000
```

All commands must be run from the **project root** so relative paths (`./cache`, `./chroma_db`) resolve correctly.

### Query flow

```
POST /query
  → retriever.py      embed query + ChromaDB similarity search (filtered by machine)
  → rag_pipeline.py   threshold check → not_found if no relevant chunks
  → prompt_builder.py format system+user prompt with retrieved excerpts
  → llm_client.py     Groq API call (llama-3.1-70b-versatile)
  → response          success | not_found | error
```

### Key constants

| File | Name | Value | Purpose |
|---|---|---|---|
| `src/retriever.py` | `RELEVANCE_THRESHOLD` | `0.35` | Min cosine similarity to pass a chunk to LLM |
| `src/retriever.py` | `TOP_K` | `5` | Max chunks retrieved per query |
| `src/llm_client.py` | `MODEL` | `llama-3.1-70b-versatile` | Groq model used |
| `src/db.py` | `CHROMA_PATH` | `./chroma_db` | Persistent vector store location |
| `src/db.py` | `COLLECTION_NAME` | `machine_docs` | ChromaDB collection name |

### Input data format

JSONL files in `cache/` — one chunk per line:
```json
{"id": "IMM-750_p12_c03", "text": "...", "metadata": {"machine": "IMM-750", "document": "IMM-750.pdf", "page": 12, "section": "troubleshooting"}}
```

The `machine` metadata field maps to `machine_filter` in the API.

### Environment

Requires `GROQ_API_KEY` in `.env` (see `.env.example`).

### Architecture notes

- **`src/api.py`** — FastAPI app. Uses `lifespan` to pre-load the sentence-transformer model and ChromaDB collection at startup into `ml_models`. Both are passed explicitly into `run_query` — nothing is initialised inside route handlers.
- **`src/retriever.py`** — Embeds the query with `all-MiniLM-L6-v2`, queries ChromaDB with an optional `where={"machine": machine_filter}` metadata filter, converts cosine distance to similarity (`1 - dist/2`), drops chunks below `RELEVANCE_THRESHOLD`.
- **`src/rag_pipeline.py`** — Only place that decides response shape. Empty chunk list → `not_found`. LLM `RuntimeError` → `error`. Otherwise `success` with sources.
- **`src/llm_client.py`** — Lazy singleton Groq client. Raises `RuntimeError("rate_limit" | "connection_error" | "api_error:NNN")`.
```

---

## Verification steps

After creating all files, run these checks:

```bash
# Confirm package structure is importable
python3 -c "from src.db import get_chroma_collection; print('OK')"

# Run the demo end-to-end (requires GROQ_API_KEY in .env)
python3 -m scripts.demo

# Start the server and hit the endpoint
python3 -m uvicorn src.api:app --host 0.0.0.0 --port 8000 &
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What does error E-04 mean?", "machine_filter": "IMM-750"}'
```

If the import check fails, confirm `src/__init__.py` exists and you are running from the project root.
If the demo fails with a GROQ error, confirm `.env` contains a valid `GROQ_API_KEY`.
