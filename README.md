# Tecdia SmartFix

AI-powered fault diagnostics for industrial machinery. Workers describe a symptom in plain English; SmartFix retrieves the relevant pages from indexed manuals, an LLM explains what's happening, and a severity-weighted alert fires to managers when the issue is critical.

The system is a Retrieval-Augmented Generation (RAG) pipeline behind a FastAPI service, paired with a React control panel for workers and admins.

---

## Tech stack

**Backend** (`src/`)
- **FastAPI** — single-file app at [src/api.py](src/api.py), uvicorn on port 8000
- **ChromaDB** — persistent local vector store at `./chroma_db`
- **sentence-transformers** — `all-MiniLM-L6-v2` for query/chunk embeddings
- **Groq** — `llama-3.3-70b-versatile` for answer generation
- **Pydantic v2** — request/response schemas

**Frontend** ([frontend/](frontend/))
- **React 19** + **Vite 8** (no TypeScript)
- **Tailwind CSS 3.4** + `@tailwindcss/typography`
- **react-router-dom 7** — client-side routing
- **framer-motion** — page transitions
- **lucide-react** — icon set
- **react-markdown** + **remark-gfm** — render AI answers

**Auth** — cookie-based sessions (`worker_session`, `stub_session`); HttpOnly, SameSite=Lax. Magic-link admin login is stubbed for development.

---

## Project structure

```
smartfix/
├── src/                       # FastAPI backend
│   ├── api.py                 # All routes (auth, /query, /machines, /admin/*)
│   ├── rag_pipeline.py        # Orchestrates retrieve → prompt → LLM → severity parse
│   ├── retriever.py           # Embed query, ChromaDB similarity search
│   ├── prompt_builder.py      # System + user prompt assembly, severity rubric
│   ├── llm_client.py          # Lazy Groq client
│   ├── db.py                  # ChromaDB collection (CHROMA_PATH, COLLECTION_NAME)
│   └── ingestion/
│       └── parser_chunker.py  # PDF → JSON chunks (unified)
│
├── scripts/
│   ├── build_index.py         # Index ./data/processed/*.json into ChromaDB
│   └── demo.py                # Self-contained pipeline demo (no real PDFs needed)
│
├── data/
│   ├── uploads/               # Source PDFs
│   └── processed/             # Chunked JSON output from parser_chunker
│
├── chroma_db/                 # Vector store (persistent, gitignored)
│
├── frontend/                  # React + Vite app (see frontend/README if present)
│   ├── src/
│   │   ├── pages/             # AdminDashBoard,AdminLogin,ChatPage,CompanyPolicy,FeaturesPage, IntegrationsPage,LandingPage, LegalNotice, MachinesPage, PrivacyPolicy
│   │   ├── context/           # AuthContext, AdminAuthContext, MachineContext, AlertContext
│   │   ├── api/apiClient.js   # Centralized fetch + credentials: 'include'
│   │   ├── hooks/             # useChatHistory, useChatSession
│   │   └── components/        # ProtectedAdminRoute, Sidebar, MessageContent
│   └── vite.config.js         # Dev proxy → :8000 for backend paths
│
├── postman/                   # Executable API examples (collection v2.1)
├── API_CONTRACT.md            # ★ Authoritative API contract (read this first)
├── BACKEND_SETUP.md           # Backend onboarding walkthrough
├── CHANGELOG_API_CHANGES.md   # Contract changelog
├── CLAUDE.md                  # Project instructions for Claude Code
├── requirements.txt
├── verify_pipeline.py         # Pipeline sanity check
└── README.md                  # this file
```

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** (for the frontend)
- **Groq API key** — get one at [console.groq.com](https://console.groq.com)

---

## Quick start

All commands run from the **project root** so relative paths (`./chroma_db`, `./data/processed`) resolve correctly.

### 1. Backend

```bash
# Install Python deps
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set the Groq key
cp .env.example .env
# edit .env and paste your GROQ_API_KEY

# Build the vector index from ./data/processed/*.json
python3 -m scripts.build_index

# Start the API
python3 -m uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
```

The API is now at `http://localhost:8000`. Swagger UI: `http://localhost:8000/docs`. Health check: `http://localhost:8000/health`.

> No PDFs yet? Run `python3 -m scripts.demo` for a self-contained smoke test of the retrieve → LLM flow.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The React app is now at `http://localhost:5173`. Vite proxies API paths (`/auth`, `/admin/machines|jobs|alerts`, `/query`, `/health`, `/machines`) to the backend — see [frontend/vite.config.js](frontend/vite.config.js).

### 3. Try it

- Worker flow: open [http://localhost:5173](http://localhost:5173) → pick a domain → choose a machine → ask a diagnostic question.
- Admin flow: open [http://localhost:5173/admin](http://localhost:5173/admin) (the magic-link login is stubbed in dev — see `STUB_ROLE` in [src/api.py](src/api.py)).

---

## Query flow

```
POST /query
  │
  ├─► retriever.py       embed question + ChromaDB similarity search
  │                      (optional where={"machine": machine_filter})
  │                      drops chunks below RELEVANCE_THRESHOLD
  │
  ├─► rag_pipeline.py    decides response shape:
  │                      • no chunks pass threshold      → status: "not_found"
  │                      • LLM RuntimeError              → status: "error"
  │                      • otherwise                     → status: "success"
  │
  ├─► prompt_builder.py  system prompt + last 8 history turns + retrieved excerpts
  │                      LLM appends "SEVERITY: <1-5>" → parsed & stripped server-side
  │
  └─► llm_client.py      Groq llama-3.3-70b-versatile, temp 0.1, max_tokens 512
                         raises "rate_limit" | "connection_error" | "api_error:NNN"
```

Response is shaped by Pydantic in [src/api.py](src/api.py):

```json
{
  "status": "success",
  "answer": "Error E-04 indicates the clamping force…",
  "sources": [{"document": "INJECTION_MOLDING_MACHINE.pdf", "page": 5}],
  "severity_level": 4,
  "alert_score": 20,
  "machine_significance": 5,
  "alert_fired": true
}
```

### Alert scoring

`alert_score = severity_level × machine_significance`, both on a 1–5 scale. When `alert_score ≥ ALERT_THRESHOLD` (default 12) and the response is a success, a record is appended to `_alerts` and surfaced in the admin dashboard.

---

## API surface (summary)

The authoritative reference is **[API_CONTRACT.md](API_CONTRACT.md)** (v2). Quick map:

| Group | Endpoint | Notes |
|---|---|---|
| Health | `GET /health` | No auth |
| Auth — worker | `POST /auth/worker-session` | Body `{domain}`, sets `worker_session` cookie |
| Auth — admin | `POST /auth/request-link`, `GET /auth/verify?token=…` | Magic link, stubbed |
| Auth — both | `GET /auth/me`, `POST /auth/logout` | Single source of truth for session state |
| Worker | `GET /machines` | Lists indexed machines (filtered by role) |
| Worker | `POST /query` | Body `{question, machine_filter?, history?}` |
| Admin | `GET/POST /admin/machines`, `DELETE /admin/machines/{id}` | Multipart upload returns `{job_id}` |
| Admin | `GET /admin/jobs/{job_id}` | Poll every ~2s |
| Admin | `GET/DELETE /admin/alerts`, `POST /admin/alerts/test` | Alert history + test injection |

Allowed worker domains: `General`, `Manufacturing`, `Additive Manufacturing`, `Fabrication`, `Automation`, `Heavy Machinery`, `All Access`. "All Access" bypasses per-machine category checks.

Error envelope (all non-2xx):

```json
{"detail": "human-readable message", "code": "machine_readable_code"}
```

---

## Input data format

Chunked JSON files live in `./data/processed/`. The parser+chunker writes one chunk per record:

```json
{
  "id": "IMM-750_p12_c03",
  "text": "Error code E-04 indicates that clamping force has not been reached…",
  "metadata": {
    "machine": "INJECTION_MOLDING_MACHINE",
    "document": "INJECTION_MOLDING_MACHINE.pdf",
    "page": 12,
    "section": "troubleshooting"
  }
}
```

The `machine` field maps directly to `machine_filter` in `POST /query`.

---

## Key constants

| File | Constant | Default | Purpose |
|---|---|---|---|
| [src/retriever.py](src/retriever.py) | `RELEVANCE_THRESHOLD` | `0.35` | Min cosine similarity to pass to the LLM |
| [src/retriever.py](src/retriever.py) | `TOP_K` | `5` | Max chunks per query |
| [src/llm_client.py](src/llm_client.py) | `MODEL` | `llama-3.3-70b-versatile` | Groq model |
| [src/db.py](src/db.py) | `CHROMA_PATH` | `./chroma_db` | Vector store on disk |
| [src/db.py](src/db.py) | `COLLECTION_NAME` | `machine_docs` | ChromaDB collection |
| [src/api.py](src/api.py) | `ALERT_THRESHOLD` | `12` (env-overridable) | Min `alert_score` to fire |
| [src/api.py](src/api.py) | `DEFAULT_SIGNIFICANCE` | `3` | Used when `machine_significance` isn't set |
| [src/prompt_builder.py](src/prompt_builder.py) | `HISTORY_TURN_LIMIT` | `8` | Max history turns sent to LLM |

---

## Environment variables

```env
# .env (see .env.example)
GROQ_API_KEY=gsk_…           # required
ALERT_THRESHOLD=12           # optional, integer
```

---

## Currently indexed machines

Seeded in `_machine_metadata` ([src/api.py](src/api.py)):

| ID | Category | Significance | Manual |
|---|---|---|---|
| `INJECTION_MOLDING_MACHINE` | Manufacturing | 5 | IMM-750 series |
| `LASER_CUTTING_MACHINE` | Fabrication | 4 | LC-2040 series |

Add more via `POST /admin/machines` (multipart) — see [API_CONTRACT.md §4.3](API_CONTRACT.md).

### Error codes covered (IMM-750)

`E-01` Barrel zone temperature deviation · `E-02` Hydraulic oil temperature high · `E-03` Injection pressure not reached · `E-04` Clamping force not reached · `E-05` Screw rotation fault · `E-06` Hydraulic system pressure fault · `E-07` Cooling water flow fault

---

## Architecture notes

- **`src/api.py`** uses FastAPI `lifespan` to pre-load the embedding model and ChromaDB collection into `ml_models` once at startup. Both are passed explicitly into `run_query` — nothing is initialized inside route handlers.
- **CORS** is set to `allow_origin_regex=r"http://localhost(:\d+)?"` with `allow_credentials=True` (any localhost port). Tighten for deployment.
- **In-memory stores** — `_worker_sessions`, `_jobs`, `_alerts`, `_machine_metadata` — are reset on every server restart. These are placeholders for proper persistence (Postgres/Redis) when auth is hardened.
- **Severity parsing** — the LLM is instructed to append `SEVERITY: <1-5>` to its answer. [src/rag_pipeline.py](src/rag_pipeline.py) regex-extracts it and strips it from the user-facing answer before returning.
- **Domain access control** — only enforced for active `worker_session` cookies. Admin and unauthenticated callers (curl, Postman) bypass the check.

---

## Verifying the pipeline

```bash
# Spin up the API, then in another shell:
python3 verify_pipeline.py
```

For Postman / Bruno users, import [postman/SmartFix.postman_collection.json](postman/SmartFix.postman_collection.json) — it covers every endpoint in demo order.

---

## Documentation index

- **[API_CONTRACT.md](API_CONTRACT.md)** — every request/response shape, error code, and stability guarantee
- **[BACKEND_SETUP.md](BACKEND_SETUP.md)** — backend onboarding for new contributors
- **[CHANGELOG_API_CHANGES.md](CHANGELOG_API_CHANGES.md)** — what changed between contract revisions
- **[CLAUDE.md](CLAUDE.md)** — project context for Claude Code

---

## Contributing

1. Branch from `dev`.
2. Run the backend (`uvicorn src.api:app --reload`) and frontend (`npm run dev`) side-by-side.
3. Match the existing patterns in [src/api.py](src/api.py) — every error is raised through `APIError(status, detail, code)` so it goes through the contract's error envelope.
4. Update [API_CONTRACT.md](API_CONTRACT.md) and [CHANGELOG_API_CHANGES.md](CHANGELOG_API_CHANGES.md) if you change any request/response shape.
5. Open a PR against `dev`.

---

## License

Proprietary — Tecdia SmartFix.

## Support

- Issues: <https://github.com/Tecdia-SmartFix/smartfix/issues>
