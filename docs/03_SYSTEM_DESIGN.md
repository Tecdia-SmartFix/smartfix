# 03 — System Design

> High-level architecture of SmartFix — what process owns what, how a request flows, and what state lives where.

## Architecture at a glance

```mermaid
graph TB
    subgraph Browser
        UI[React SPA<br/>Vite + Tailwind]
    end

    subgraph EdgeBox["Edge box (factory floor)"]
        subgraph Frontend["frontend container"]
            NGINX[nginx<br/>SPA + reverse proxy]
        end
        subgraph Backend["backend container"]
            API[FastAPI<br/>uvicorn]
            EMB[SentenceTransformer<br/>all-MiniLM-L6-v2]
        end
        VOL_CHROMA[(ChromaDB<br/>vector index)]
        VOL_SQL[(SQLite<br/>smartfix.db)]
        VOL_DATA[(data/<br/>audit.jsonl<br/>uploads/)]
    end

    subgraph Cloud
        GROQ[Groq API<br/>Llama-3.1-70B]
        RESEND[Resend<br/>transactional email]
    end

    UI -- HTTP --> NGINX
    NGINX -- "/admin, /shifts,<br/>/query, /machines, …" --> API
    NGINX -- "static SPA" --> UI
    API --> EMB
    API <--> VOL_CHROMA
    API <--> VOL_SQL
    API <--> VOL_DATA
    API -- "/query<br/>RAG completion" --> GROQ
    API -- "magic-link +<br/>alert emails" --> RESEND
```

### Components in one line each

| Component | Role |
|---|---|
| **React SPA** (`frontend/src/`) | Worker chat UI + admin dashboard. Built by Vite, served by nginx in prod. |
| **nginx** (`frontend/nginx.conf`) | Serves the SPA, reverse-proxies API paths to FastAPI. Matches the Vite dev proxy 1:1. |
| **FastAPI / uvicorn** (`src/api.py`) | The whole backend. All RAG, auth, admin endpoints, and SQLite/Chroma access live here. |
| **SentenceTransformer** | Local embedder; runs in-process inside the FastAPI worker. ~80 MB resident. |
| **ChromaDB** | Persistent vector index for manual chunks. File-backed at `./chroma_db/`. |
| **SQLite** | Machine parameters, shift logs, app config. WAL mode, per-thread connections. |
| **Groq** | Hosted Llama for the completion step of RAG. Only required for `/query`. |
| **Resend** | Magic-link sign-in + alert emails. Optional — backend degrades gracefully if not configured. |

---

## Request flows

### 1. Worker asks a question (`POST /query`)

```mermaid
sequenceDiagram
    autonumber
    participant W as Worker (browser)
    participant N as nginx
    participant API as FastAPI
    participant EMB as Embedder
    participant CHR as ChromaDB
    participant GRQ as Groq
    participant ML as mailer.py

    W->>N: POST /query {question, machine_filter, history}
    N->>API: forward
    API->>API: workstation-binding override (IP-based)
    API->>EMB: embed(question)
    EMB-->>API: 384-dim vector
    API->>CHR: query (where machine=…, top_k=5)
    CHR-->>API: top chunks + cosine scores
    API->>API: drop chunks below RELEVANCE_THRESHOLD (0.35)
    alt no relevant chunks
        API-->>W: {status: not_found, answer, sources: []}
    else has chunks
        API->>GRQ: chat.completions.create(prompt + history)
        GRQ-->>API: answer + severity_level
        API->>API: compute alert_score = sev × significance
        opt alert_score ≥ threshold AND not deduped AND not snoozed
            API->>ML: send_alert(admin_emails, record)
            ML->>Resend: send email
            API->>API: _alerts.append(record)
        end
        API->>API: _query_log.append(query)
        API-->>W: {status: success, answer, sources, severity_level, alert_fired}
    end
```

### 2. Worker submits an end-of-shift log (`POST /shifts/log`)

```mermaid
sequenceDiagram
    autonumber
    participant W as Worker
    participant API as FastAPI
    participant ST as store.py
    participant DB as SQLite

    W->>API: POST /shifts/log {machine_id, readings, visual_checks, notes, phase}
    API->>ST: get_machine_parameters(machine_id)
    ST->>DB: SELECT machine_parameters WHERE machine_id=?
    DB-->>ST: spec
    API->>ST: compute_anomalies(spec, readings, visual_checks)
    Note over API,ST: Out-of-range readings + flagged visual checks<br/>=> {title, detail, key, direction}
    ST-->>API: anomalies, severity
    API->>API: _derive_worker_label(payload, session, ip)
    API->>ST: insert_shift_log(... frozen anomalies + severity)
    ST->>DB: INSERT INTO shift_logs
    DB-->>ST: row
    ST-->>API: row
    API-->>W: 201 + log row
```

### 3. Admin signs in (magic link)

```mermaid
sequenceDiagram
    autonumber
    participant Adm as Admin (browser)
    participant API as FastAPI
    participant M as mailer.py
    participant R as Resend
    participant MB as Mailbox

    Adm->>API: POST /auth/request-link {email}
    API->>API: check email ∈ ADMIN_EMAILS<br/>(silently OK either way)
    API->>API: secrets.token_urlsafe(32)<br/>store in _magic_tokens (TTL 15min)
    API->>M: send_magic_link(email, token)
    M->>R: POST email
    R->>MB: deliver
    Adm->>MB: opens link
    MB->>API: GET /auth/verify?token=…
    API->>API: pop token, check expiry
    alt valid
        API->>API: create _admin_sessions[stub_session]
        API-->>Adm: 302 / + Set-Cookie stub_session
    else expired or unknown
        API-->>Adm: 302 /admin/login?login_error=expired
    end
```

### 4. Admin ingests a new machine

```mermaid
sequenceDiagram
    autonumber
    participant Adm as Admin
    participant API as FastAPI
    participant TH as BG thread
    participant FS as data/uploads
    participant CHR as ChromaDB

    Adm->>API: POST /admin/machines (multipart: PDF + metadata)
    API->>API: validate file type, size, admin_id
    API->>FS: archive PDF as {machine_id}.pdf
    API->>API: create _jobs[job_id] {status: queued}
    API->>TH: spawn _run_ingestion(job_id, machine_id, pdf_path)
    API-->>Adm: 202 {job_id}
    loop poll
        Adm->>API: GET /admin/jobs/{job_id}
        API-->>Adm: {status, step, progress}
    end
    TH->>TH: docling parse → chunk → embed
    TH->>CHR: upsert chunks
    TH->>API: _jobs[job_id] = done
```

---

## State + lifecycle

### What survives a restart

✅ **Survives**: `chroma_db/`, `smartfix.db`, `data/audit.jsonl`, `data/uploads/*.pdf`, `data/uploads/icons/*`.

❌ **Lost**: `_alerts`, `_query_log`, `_alert_snoozes`, `_machine_metadata` admin-edits, `_worker_sessions`, `_admin_sessions`, `_magic_tokens`, `_jobs`.

This is the **P1 hardening gap**: alerts and query analytics need to be persisted to SQLite to survive a restart.

### Boot sequence (`lifespan` in `src/api.py`)

1. Load the SentenceTransformer model (~5 s on cold disk, faster on warm cache).
2. Open the ChromaDB persistent client.
3. Load `data/workstations.json` into `workstations._bindings`.
4. `store.init_store()` — create SQLite tables + apply additive migrations.
5. `store.seed_machine_parameters(_DEFAULT_MACHINE_PARAMS)` — only for machines that don't already have a row.
6. `_load_runtime_config()` — merge `app_config` DB rows on top of env-default `ALERT_THRESHOLD` / `ALERT_DEDUP_SECONDS`.

---

## Deployment model

**Target**: a single edge box per factory (i.e. no cloud control plane, no multi-tenant). Air-gapped operation works for everything except `/query` (Groq) and outbound emails (Resend).

**Compose stack** (`docker-compose.yml`):
- `backend` — Python 3.11 + uvicorn, exposes `:8000`, mounts three named volumes (`chroma_db`, `data`, `sqlite_store`).
- `frontend` — Node 22 multistage build → nginx alpine. Exposes `:80` on host. Depends on backend healthcheck.
- Both services on a private network; only `frontend` is reachable from the LAN.

**Backups**: `scripts/backup_sqlite.sh` runs nightly via cron — WAL-safe `sqlite3 .backup`, integrity check, 14-day rotation. **Does NOT currently cover** `chroma_db/` or `data/audit.jsonl` — both should be added to the backup procedure before a real factory deploy.

---

## Security boundaries

- **Admin auth**: `require_admin` FastAPI dependency on every `/admin/*` route. Direct `curl` without `stub_session` cookie → 401.
- **Worker auth**: `worker_session` cookie, HttpOnly, SameSite=Lax. Missing `Secure` flag in prod — add when TLS-terminating.
- **Magic-link tokens**: single-use, 15-min TTL, popped on verify.
- **CORS**: dev-permissive (`http://localhost(:\d+)?` regex). Production sits behind the nginx reverse proxy on the same origin, so CORS doesn't apply.
- **Static files**: only `data/uploads/icons/` is mounted publicly. PDFs in `data/uploads/` are NOT exposed.
- **CSP**: not currently set in `frontend/nginx.conf`. Recommended hardening.
