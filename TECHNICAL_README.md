# SmartFix — Technical README

Setup, run, ingest manuals, rebuild the index.

---

## 1. Stack

| Component | Tech |
|---|---|
| Backend | FastAPI (Python 3.10+) |
| Vector DB | ChromaDB (persistent, local) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| LLM | Groq — `llama-3.1-70b-versatile` |
| PDF parsing | `pypdf` |
| Frontend | Vite + React (in `frontend/`) |
| Email (admin auth, alerts) | Resend |

---

## 2. One-time setup

```bash
# clone & enter
git clone <repo-url> smartfix
cd smartfix

# Python env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend deps (if you'll run the UI)
cd frontend && npm install && cd ..
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

```
GROQ_API_KEY=gsk_...               # required — Groq LLM
RESEND_API_KEY=re_...              # required for admin magic-link auth and alerts
ADMIN_EMAILS=you@example.com       # comma-separated whitelist of admin emails
APP_BASE_URL=http://localhost:5173 # frontend origin (used in email links)
# MAIL_FROM=SmartFix <noreply@yourdomain.com>   # optional, only if you've verified a domain on Resend
```

> **Run every command below from the project root** so the relative paths (`./cache`, `./chroma_db`, `./data`) resolve.

---

## 3. Quick start

```bash
# 1. Ingest the bundled manuals (or your own — see §5)
python3 -m scripts.build_index

# 2. Start the API
python3 -m uvicorn src.api:app --host 0.0.0.0 --port 8000

# 3. In another terminal, start the frontend
cd frontend && npm run dev
# → http://localhost:5173
```

A demo path that needs no real PDFs:

```bash
python3 -m scripts.demo
```

---

## 4. Project layout

```
src/
  api.py              FastAPI app (routes, auth, alerts, admin endpoints)
  retriever.py        Hybrid retrieval (keyword pin + vector search)
  rag_pipeline.py     Orchestration: retrieve → prompt → LLM → response
  prompt_builder.py   System prompt + per-turn user message
  llm_client.py       Groq SDK wrapper (lazy singleton)
  db.py               ChromaDB collection accessor
  mailer.py           Resend wrapper (magic-link, alert emails)
  workstations.py     Workstation ↔ machine mapping (IP-based)
  ingestion/
    parser_chunker.py PDF → section-aware chunks (see CHUNKING_STRATEGY.md)
scripts/
  build_index.py      Read data/processed/*.json → embed → ChromaDB
  demo.py             Self-contained pipeline demo (no real PDFs needed)
  seed_analytics.py   Backfill alert log for the admin dashboard
data/
  raw/                Drop PDFs here for ingestion
  processed/          Chunked JSON output (one file per source PDF)
chroma_db/            Persistent ChromaDB store (created on first build)
frontend/             Vite + React UI
```

---

## 5. Adding a new machine

Three steps: drop the PDF, chunk it, rebuild the index.

### 5.1 Drop the PDF

```bash
cp /path/to/IMM-900.pdf data/raw/
```

### 5.2 Chunk it

You have two options.

**A. Admin UI (recommended for non-engineers):**
Sign in at `/admin/login`, go to **Machines**, click **Upload manual**, and select the PDF. The backend chunks it, embeds the chunks, and writes them to ChromaDB in one step. Done.

**B. CLI:**

```bash
# Chunk the PDF → data/processed/IMM-900_chunks.json
python3 -c "
from src.ingestion.parser_chunker import process_and_chunk, save_chunks_to_json
chunks = process_and_chunk('data/raw/IMM-900.pdf', 'IMM-900.pdf', machine_id='IMM-900')
save_chunks_to_json(chunks, 'data/processed/IMM-900_chunks.json')
print(f'wrote {len(chunks)} chunks')
"
```

### 5.3 Rebuild the index

```bash
python3 -m scripts.build_index
```

`build_index.py` is idempotent — it reads every file in `data/processed/`, normalises metadata, and upserts into ChromaDB. Re-running it after adding a new machine adds that machine's chunks without touching the others.

### 5.4 Map workstations to the new machine

Edit `data/workstations.json` (or use the admin UI) to point a workstation's IP at the new `machine_id`. Workers signing in from that IP will then see this machine.

---

## 6. Rebuilding the index from scratch

If chunking logic or metadata schema changed, wipe and rebuild:

```bash
rm -rf chroma_db/
python3 -m scripts.build_index
```

That re-creates the collection (`machine_docs`) and re-embeds every chunk in `data/processed/`. Expect ~1–2 min per 100 chunks on CPU.

---

## 7. Running tests / verifying the pipeline

```bash
python3 verify_pipeline.py
```

Sanity-checks that the collection loads, retrieval returns results above threshold, and the LLM is reachable.

---

## 8. Deployment notes

- **Streamlit Cloud / equivalent:** the bundled `Dockerfile` builds the backend; the frontend can be deployed separately (Vercel/Netlify) and pointed at the backend URL via `VITE_API_BASE`.
- **Persisting ChromaDB:** mount `./chroma_db` as a volume so it survives restarts.
- **Secrets:** `GROQ_API_KEY` and `RESEND_API_KEY` belong in the host's secret store, not in the image.

---

## 9. Key constants (cheat sheet)

| File | Name | Value | Why |
|---|---|---|---|
| `src/retriever.py` | `RELEVANCE_THRESHOLD` | `0.35` | Min cosine similarity for a chunk to pass to the LLM |
| `src/retriever.py` | `TOP_K` | `5` | Chunks per query |
| `src/llm_client.py` | `MODEL` | `llama-3.1-70b-versatile` | Groq model |
| `src/db.py` | `CHROMA_PATH` | `./chroma_db` | Vector store location |
| `src/db.py` | `COLLECTION_NAME` | `machine_docs` | ChromaDB collection |
| `src/prompt_builder.py` | `HISTORY_TURN_LIMIT` | `8` | Conversation turns kept as context |
| `src/ingestion/parser_chunker.py` | `MIN_CHUNK_CHARS` | `60` | Drop chunks shorter than this |
