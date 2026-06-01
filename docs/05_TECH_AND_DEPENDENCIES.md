# 05 — Tech, Libraries & Dependencies

> What's installed, what each thing is doing, and why it was picked.

## Runtime requirements

| Component | Version | Why |
|---|---|---|
| **Python** | 3.11 | Match Dockerfile; needed for `from __future__ import annotations` style + newer typing syntax used in `store.py`. |
| **Node.js** | 22 (LTS) | Vite 8 requires Node 20.19+ or 22.12+. Edge box uses Node 22 in the frontend container. |
| **SQLite** | bundled with Python | No external server. WAL mode for concurrent reads. |
| **Disk** | ~2 GB | sentence-transformers wheels + Chroma index + uploaded PDFs grow over time. |
| **RAM** | ~2 GB | SentenceTransformer resident set, embeddings during ingestion. |

---

## Python dependencies (`requirements.txt`)

```
docling
langchain
langchain-text-splitters
langchain-openai
langchain-community
qdrant-client
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
streamlit
python-dotenv>=1.0.0
chromadb>=0.5.0
sentence-transformers>=3.0.0
groq>=0.9.0
resend>=2.0.0
pypdf>=4.0.0
pydantic[email]>=2.0.0
python-multipart>=0.0.9
email-validator>=2.0.0
```

### Used at runtime

| Package | Where | Why |
|---|---|---|
| `fastapi` | `src/api.py` | HTTP framework. Pydantic models for request/response shapes. |
| `uvicorn[standard]` | entrypoint | ASGI server. `[standard]` pulls `httptools` + `uvloop` for perf. |
| `python-dotenv` | `src/api.py` (`load_dotenv()`) | Reads `.env` at boot — `GROQ_API_KEY`, `RESEND_API_KEY`, `ADMIN_EMAILS`, `APP_BASE_URL`, `ALERT_THRESHOLD`, `ALERT_DEDUP_SECONDS`. |
| `chromadb` | `src/db.py`, `src/api.py` | Local vector index with cosine similarity. Persistent client at `./chroma_db`. |
| `sentence-transformers` | `src/api.py` lifespan + retriever | Loads `all-MiniLM-L6-v2` (384-dim embeddings) in-process. ~90 MB model. |
| `groq` | `src/llm_client.py` | Hosted Llama-3.1-70B for the completion step. Lazy singleton client. |
| `resend` | `src/mailer.py` | Transactional email — magic-link + alert emails. |
| `docling` | `src/ingestion/parser_chunker.py` | PDF → structured chunks. Replaces a raw `pypdf` approach. |
| `pypdf` | indirect, via docling | PDF text extraction fallback. |
| `pydantic[email]` | request models | Validation. `[email]` for `EmailStr`. |
| `python-multipart` | `POST /admin/machines` | Needed by FastAPI to parse multipart form uploads. |
| `email-validator` | indirect | Backs `EmailStr`. |
| `langchain-text-splitters` | ingestion | Recursive character splitter for fallback chunking. |

### Currently present but underused

| Package | Status |
|---|---|
| `langchain`, `langchain-openai`, `langchain-community` | Imported in places but not load-bearing. Could be trimmed once ingestion is rewritten or wrapped in optional extras. |
| `qdrant-client` | Not used. Earlier exploration of Qdrant before settling on Chroma. **Safe to remove.** |
| `streamlit` | Not used in production. Was an early prototype UI. **Safe to remove.** |

A cleanup PR could drop `qdrant-client` + `streamlit` + the three `langchain-*` packages if no one's relying on them — saves ~150 MB on the docker image.

---

## Frontend dependencies (`frontend/package.json`)

```json
"dependencies": {
  "@tailwindcss/typography": "^0.5.19",
  "autoprefixer": "^10.5.0",
  "framer-motion": "^12.38.0",
  "lucide-react": "^1.8.0",
  "postcss": "^8.5.10",
  "react": "^19.2.5",
  "react-dom": "^19.2.5",
  "react-markdown": "^10.1.0",
  "react-router-dom": "^7.14.1",
  "remark-gfm": "^4.0.1",
  "tailwindcss": "^3.4.19"
}
```

| Package | Where | Why |
|---|---|---|
| `react` + `react-dom` | everywhere | Core framework. v19. |
| `react-router-dom` | `App.jsx` | Client-side routing. v7. |
| `framer-motion` | `Navbar`, `MachineCard`, `LandingPage`, modals | All animations + scroll-hijack carousel + layout transitions. |
| `tailwindcss` + `postcss` + `autoprefixer` | `tailwind.config.js` | Utility-first CSS. Most styling is inline `className`. |
| `@tailwindcss/typography` | for the `prose` class | Used on marketing pages + chat answer rendering. |
| `lucide-react` | every component | Icons. Tree-shakable; only the imported icons bundle. |
| `react-markdown` + `remark-gfm` | `MessageContent` | Renders LLM answers with GFM (tables, strikethrough, task lists). |

### Dev dependencies

| Package | Purpose |
|---|---|
| `vite` | Dev server + build. `vite build` outputs to `frontend/dist/`. |
| `@vitejs/plugin-react` | React + JSX support. |
| `eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | Linting. `npm run lint`. |
| `@types/react` + `@types/react-dom` | Type hints for IDE / TS-aware linters. (Project is JSX, not TS.) |
| `globals` | ESLint global declarations. |

---

## External services

| Service | Used for | Failure mode |
|---|---|---|
| **Groq** | LLM completion in `/query` | Returns `status: "error"` to the chat; doesn't crash. Workers see an error message. |
| **Resend** | Magic-link sign-in + alert emails | Fire-and-forget — alert paths log + persist record with `email_notified: false`. Magic-link uses an Resend API call directly — failure returns 502 to the admin. |

Both are cloud services. **The edge box needs outbound HTTPS** for normal operation. Air-gap viable for: machine list, shift logging, parameter editing, analytics — anything that doesn't hit `/query`.

### Required `.env` keys

```ini
GROQ_API_KEY=…
RESEND_API_KEY=re_…
ADMIN_EMAILS=alice@tecdia.com,bob@tecdia.com   # comma-separated allowlist
APP_BASE_URL=http://localhost:5173             # what gets baked into magic-link URLs
# Optional
MAIL_FROM=Tecdia SmartFix <admin@your-verified-domain.com>
ALERT_THRESHOLD=12
ALERT_DEDUP_SECONDS=300
STORE_PATH=./smartfix.db                       # SQLite location; auto-set in compose
```

See `.env.example` for the full annotated template.

---

## Build + deploy tooling

| File | Role |
|---|---|
| `Dockerfile` | Backend image (Python 3.11 slim + uvicorn). |
| `frontend/Dockerfile` | Two-stage frontend image (Node 22 build → nginx alpine runtime). |
| `frontend/nginx.conf` | Mirrors Vite dev proxy so prod and dev behave the same. |
| `docker-compose.yml` | Wires both services + three named volumes (`chroma_db`, `data`, `sqlite_store`). |
| `scripts/build_index.py` | Offline ingestion (build Chroma from local JSONL chunks). |
| `scripts/backup_sqlite.sh` | WAL-safe nightly SQLite backup with 14-day rotation. |
| `scripts/demo.py` | Self-contained demo without real PDFs. |
| `postman/SmartFix.postman_collection.json` | API testing collection (current as of the v2 contract; may need refresh for the new admin routes). |

---

## Versions snapshot

These are the versions that were running as of the last handover. If you need to upgrade, do it one at a time and re-run `npm run build` + `pytest` (when tests exist).

| Layer | Version |
|---|---|
| Python | 3.11.x |
| FastAPI | ≥ 0.111 |
| ChromaDB | ≥ 0.5 |
| sentence-transformers | ≥ 3.0 |
| Groq SDK | ≥ 0.9 |
| Resend SDK | ≥ 2.0 |
| Node | 22 |
| Vite | ^8.0.9 |
| React | ^19.2.5 |
| framer-motion | ^12.38.0 |
| tailwindcss | ^3.4.19 |
