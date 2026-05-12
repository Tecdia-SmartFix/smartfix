import os
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Cookie, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sentence_transformers import SentenceTransformer

from . import workstations
from .db import get_chroma_collection
from .rag_pipeline import run_query

load_dotenv()

# ── lifecycle ──────────────────────────────────────────────────────────────

ml_models: dict = {}
# In-memory job store for the /admin/jobs stub. Replaced with a real queue
# (RQ + Redis) when we cloud-deploy.
_jobs: dict[str, dict] = {}

# Worker domain sessions: cookie value → {domain, created_at}.
# Replaced with proper session storage when auth is hardened.
_worker_sessions: dict[str, dict] = {}

# Per-machine metadata captured at admin upload time. Until ingestion is real,
# this also seeds metadata for the existing indexed machines.
_machine_metadata: dict[str, dict] = {
    "INJECTION_MOLDING_MACHINE": {
        "description": "Tecdia injection molding line — IMM-750 series.",
        "category": "Manufacturing",
        "significance": 5,
        # Lucide icon name; frontend resolves via ICON_MAP. Filename strings would also work for future image-based icons.
        "icon": "Factory",
    },
    "LASER_CUTTING_MACHINE": {
        "description": "Tecdia precision laser cutter — LC-2040 series.",
        "category": "Fabrication",
        "significance": 4,
        "icon": "Scissors",
    },
}

# Alert log (in-memory). Each entry matches the shape rendered in the admin UI.
_alerts: list[dict] = []

ALERT_THRESHOLD = int(os.getenv("ALERT_THRESHOLD", "12"))
DEFAULT_SIGNIFICANCE = 3

# Archive location for uploaded PDFs. Each new machine is stored as
# `{machine_id}.pdf` so it can be re-ingested, audited, or downloaded later.
# Replaces the previous tempfile-then-delete flow.
UPLOADS_DIR = Path("./data/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Allowed worker domains. "All Access" bypasses the per-machine domain check.
ALLOWED_DOMAINS = {
    "General",
    "Manufacturing",
    "Additive Manufacturing",
    "Fabrication",
    "Automation",
    "Heavy Machinery",
    "All Access",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.time()
    ml_models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2")
    ml_models["collection"] = get_chroma_collection()
    # Workstation IP→machine bindings (see src/workstations.py + data/workstations.json).
    # Loaded once at startup; restart uvicorn after editing the bindings file.
    workstations.load_bindings()
    print(f"startup complete in {time.time() - start:.2f}s", flush=True)
    yield
    ml_models.clear()


app = FastAPI(title="Machine Troubleshooting RAG API", lifespan=lifespan)

# Permissive for dev (any localhost port). Tighten when deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── error envelope ─────────────────────────────────────────────────────────


class APIError(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str):
        super().__init__(status_code=status_code, detail={"detail": detail, "code": code})


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    msg = "; ".join(
        f"{'.'.join(str(p) for p in err['loc'][1:])}: {err['msg']}"
        for err in exc.errors()
    )
    return JSONResponse(
        status_code=422,
        content={"detail": msg or "Validation failed", "code": "validation_error"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "internal_error"},
    )


# ── /health ────────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# ── /query ─────────────────────────────────────────────────────────────────


class HistoryTurn(BaseModel):
    role: str
    content: str


class QueryRequest(BaseModel):
    question: str = Field(..., max_length=500)
    machine_filter: Optional[str] = None
    history: list[HistoryTurn] = Field(default_factory=list)


class Source(BaseModel):
    document: str
    page: Optional[int]


class QueryResponse(BaseModel):
    status: str
    answer: str
    sources: list[Source]
    severity_level: int = 1
    alert_score: int = 0
    machine_significance: int = DEFAULT_SIGNIFICANCE
    alert_fired: bool = False


def _domain_allows_machine(domain: str, machine_id: str) -> bool:
    if domain == "All Access":
        return True
    machine_category = _machine_metadata.get(machine_id, {}).get("category")
    if not machine_category:
        return True  # unknown category — fail open for now, tighten when ingestion is real
    return machine_category == domain


def _caller_ip(request: Request) -> str:
    """Best-effort caller-IP resolution for workstation binding.

    Honors X-Forwarded-For (first hop = originating client) when present, so
    deployments behind nginx/caddy keep working. Falls back to the immediate
    socket peer. CORS is dev-permissive today; tighten when deploying.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.post("/query", response_model=QueryResponse)
async def query(
    req: QueryRequest,
    request: Request,
    worker_session: Optional[str] = Cookie(default=None),
):
    # ── Workstation-binding enforcement (authoritative) ────────────────────
    # If the caller's IP is registered in data/workstations.json, force the
    # query to filter on the bound machine — even if the frontend sent a
    # different machine_filter (stale tab, tampered request, etc.). Chunk
    # isolation in ChromaDB is guaranteed via retriever.py's `where=` clause.
    bound_machine = workstations.get_binding(_caller_ip(request))
    if bound_machine:
        if req.machine_filter and req.machine_filter != bound_machine:
            print(
                f"workstation override: ip={_caller_ip(request)} "
                f"sent machine_filter={req.machine_filter!r}, "
                f"forcing to {bound_machine!r}",
                flush=True,
            )
        req.machine_filter = bound_machine
        # Domain check is redundant once IP is authoritative — skip it.
    elif worker_session and worker_session in _worker_sessions and req.machine_filter:
        # Unbound IP — keep existing worker-session-based domain gate.
        domain = _worker_sessions[worker_session]["domain"]
        if not _domain_allows_machine(domain, req.machine_filter):
            raise APIError(
                403,
                f"Machine '{req.machine_filter}' is not in your domain '{domain}'",
                "access_denied",
            )

    result = run_query(
        question=req.question,
        embedder=ml_models["embedder"],
        collection=ml_models["collection"],
        machine_filter=req.machine_filter,
        history=[t.model_dump() for t in req.history] if req.history else None,
    )

    severity = result.get("severity_level", 1)
    machine_sig = (
        _machine_metadata.get(req.machine_filter, {}).get(
            "significance", DEFAULT_SIGNIFICANCE
        )
        if req.machine_filter
        else DEFAULT_SIGNIFICANCE
    )
    alert_score = severity * machine_sig
    alert_fired = False

    if alert_score >= ALERT_THRESHOLD and result.get("status") == "success":
        alert_fired = True
        _alerts.append(
            {
                "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
                "machine_id": req.machine_filter or "unknown",
                "score": alert_score,
                "severity_level": severity,
                "machine_significance": machine_sig,
                "question": req.question,
                "answer_excerpt": result["answer"][:280],
                "email_notified": True,  # stub: email send wired when Resend is set up
                "notified_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    return {
        **result,
        "alert_score": alert_score,
        "machine_significance": machine_sig,
        "alert_fired": alert_fired,
    }


# ── /machines ──────────────────────────────────────────────────────────────

DISPLAY_NAME_OVERRIDES: dict[str, str] = {
    # Add overrides here when the auto-generated name isn't great.
    # Example: "INJECTION_MOLDING_MACHINE": "Injection Molding Machine (IMM-750)",
}


def _list_machines_basic() -> list[dict]:
    collection = ml_models["collection"]
    result = collection.get(include=["metadatas"])

    counts: dict[str, int] = {}
    for meta in result.get("metadatas", []) or []:
        m = meta.get("machine") if meta else None
        if m:
            counts[m] = counts.get(m, 0) + 1

    machines = []
    for machine_id, count in sorted(counts.items()):
        display_name = DISPLAY_NAME_OVERRIDES.get(
            machine_id, machine_id.replace("_", " ").title()
        )
        meta = _machine_metadata.get(machine_id, {})
        machines.append(
            {
                "id": machine_id,
                "display_name": display_name,
                "chunk_count": count,
                "description": meta.get("description", ""),
                "category": meta.get("category", "General"),
                "significance": meta.get("significance", DEFAULT_SIGNIFICANCE),
                "icon": meta.get("icon"),
            }
        )
    return machines


@app.get("/machines")
async def list_machines():
    return {"machines": _list_machines_basic()}


# ── /workstation ───────────────────────────────────────────────────────────


@app.get("/workstation")
async def get_workstation(request: Request):
    """Resolve the caller's IP to a bound machine (if any).

    The frontend hits this once on app mount. If `bound: true`, it skips
    LandingPage + MachinesPage and routes straight into the bound machine's
    chat. If `bound: false`, the existing domain+machine selector flow runs.

    Side effect on a successful bind: a worker_session cookie is created
    so the immediate next /query (or /auth/me) has a valid session without
    requiring an explicit domain pick from the worker.
    """
    ip = _caller_ip(request)
    machine_id = workstations.get_binding(ip)
    if not machine_id:
        return {"bound": False, "ip": ip}

    machine = next(
        (m for m in _list_machines_basic() if m["id"] == machine_id), None
    )
    if not machine:
        # Binding points at a machine that isn't indexed — log and fail open
        # so a typo in workstations.json doesn't brick the workstation.
        print(
            f"workstation: bound machine {machine_id!r} not found in index "
            f"for ip={ip}; treating as unbound",
            flush=True,
        )
        return {"bound": False, "ip": ip, "error": "bound_machine_missing"}

    session_id = f"ws_{uuid.uuid4().hex}"
    _worker_sessions[session_id] = {
        # Match the bound machine's category so any future domain check passes.
        "domain": machine.get("category") or "General",
        "machine_id": machine_id,
        "workstation_ip": ip,
        "created_at": datetime.now(timezone.utc),
    }
    response = JSONResponse(
        {"bound": True, "ip": ip, "machine": machine}
    )
    response.set_cookie(
        "worker_session",
        session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 12,  # 12h, matches a working day
    )
    return response


# ── /auth (stubs — wired up when real auth lands) ──────────────────────────
#
# These satisfy the API contract shape so the frontend can integrate against
# real responses. They DO NOT enforce auth yet. The stub /auth/me always
# returns an admin user; flip the STUB_ROLE constant below to test the
# worker UI path.

STUB_ROLE: str = "admin"  # "admin" | "worker"
STUB_EMAIL: str = "alice@tecdia.com.ph"


class RequestLinkBody(BaseModel):
    email: EmailStr


@app.post("/auth/request-link")
async def auth_request_link(body: RequestLinkBody):
    # Stub: pretends to send an email. Always 200 (no enumeration leak).
    return {"ok": True}


@app.get("/auth/verify")
async def auth_verify(token: str):
    # Stub: always succeeds. Real version validates token + creates session.
    response = RedirectResponse(url="/", status_code=302)
    response.set_cookie(
        "stub_session",
        STUB_ROLE,
        httponly=True,
        samesite="lax",
        max_age=2592000,  # 30d
    )
    return response


class WorkerSessionBody(BaseModel):
    domain: str


@app.post("/auth/worker-session")
async def auth_worker_session(body: WorkerSessionBody):
    if body.domain not in ALLOWED_DOMAINS:
        raise APIError(400, f"Invalid domain '{body.domain}'", "invalid_domain")

    session_id = f"ws_{uuid.uuid4().hex}"
    _worker_sessions[session_id] = {
        "domain": body.domain,
        "created_at": datetime.now(timezone.utc),
    }
    response = JSONResponse(
        {
            "authenticated": True,
            "role": "worker",
            "domain": body.domain,
            "email": None,
        }
    )
    response.set_cookie(
        "worker_session",
        session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 12,  # 12 hours, matches a working day
    )
    return response


@app.get("/auth/me")
async def auth_me(
    worker_session: Optional[str] = Cookie(default=None),
    stub_session: Optional[str] = Cookie(default=None),
):
    # Worker (domain-selector or workstation-bound) session takes precedence
    if worker_session and worker_session in _worker_sessions:
        s = _worker_sessions[worker_session]
        return {
            "authenticated": True,
            "role": "worker",
            "domain": s["domain"],
            "email": None,
            # Populated only for workstation-bound sessions (created via /workstation).
            # Null for sessions created via /auth/worker-session (domain selector).
            "machine_id": s.get("machine_id"),
            "workstation_ip": s.get("workstation_ip"),
            "session_expires_at": (
                s["created_at"] + timedelta(hours=12)
            ).isoformat(),
        }

    # Manager / admin session (still stubbed via magic-link endpoints)
    return {
        "authenticated": True,
        "email": STUB_EMAIL,
        "role": STUB_ROLE,
        "domain": "All Access" if STUB_ROLE == "admin" else "General",
        "session_expires_at": (
            datetime.now(timezone.utc) + timedelta(days=30)
        ).isoformat(),
    }


@app.post("/auth/logout")
async def auth_logout(
    worker_session: Optional[str] = Cookie(default=None),
):
    if worker_session:
        _worker_sessions.pop(worker_session, None)
    response = JSONResponse({"ok": True})
    response.delete_cookie("stub_session")
    response.delete_cookie("worker_session")
    return response


# ── /admin (stubs) ─────────────────────────────────────────────────────────


def _run_ingestion(job_id: str, machine_id: str, pdf_path: str, filename: str):
    """
    Background thread: parse PDF → embed chunks → store in ChromaDB.
    Updates _jobs[job_id] at each stage so the frontend poll reflects real progress.
    The PDF at `pdf_path` is archived under UPLOADS_DIR and intentionally kept on disk
    (success or failure) so admins can re-ingest, audit, or download the original.
    """
    def _update(status, step, progress, error=None):
        _jobs[job_id].update({
            "status": status,
            "step": step,
            "progress": progress,
            "error": error,
            "finished_at": datetime.now(timezone.utc).isoformat() if status in ("done", "failed") else None,
        })

    try:
        # ── Stage 1: Parse PDF → chunks ────────────────────────────────────
        _update("parsing", "Parsing PDF", 0.1)
        from .ingestion.parser_chunker import process_and_chunk
        chunks = process_and_chunk(pdf_path, filename, machine_id=machine_id)

        if not chunks:
            _update("failed", "No content extracted from PDF", 0.0, "empty_pdf")
            return

        _update("chunking", f"Chunked into {len(chunks)} sections", 0.4)

        # ── Stage 2: Embed ─────────────────────────────────────────────────
        _update("embedding", "Embedding chunks", 0.6)
        embedder = ml_models["embedder"]
        texts = [c["text"] for c in chunks]
        embeddings = embedder.encode(texts, batch_size=32, show_progress_bar=False)

        # ── Stage 3: Index into ChromaDB ───────────────────────────────────
        _update("indexing", "Indexing into database", 0.85)
        collection = ml_models["collection"]

        ids, docs, metas, vecs = [], [], [], []
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            meta = chunk.get("metadata", {})
            # ChromaDB rejects None values and lists — sanitise
            clean_meta = {"machine": machine_id}
            for k, v in meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                elif isinstance(v, list) and v:
                    clean_meta[k] = str(v[0])  # page_numbers list → first page
            ids.append(f"{machine_id}_chunk_{i}")
            docs.append(chunk["text"])
            metas.append(clean_meta)
            vecs.append(emb.tolist())

        collection.add(ids=ids, embeddings=vecs, documents=docs, metadatas=metas)
        _update("done", f"Complete — {len(chunks)} chunks indexed", 1.0)

    except Exception as exc:
        import traceback
        traceback.print_exc()
        _update("failed", "Ingestion error", 0.0, str(exc))
    # PDF is intentionally NOT deleted — it stays in data/uploads/ for re-ingest/audit.


@app.post("/admin/machines", status_code=202)
async def admin_create_machine(
    file: UploadFile = File(...),
    machine_id: str = Form(...),
    display_name: str = Form(...),
    description: str = Form(""),
    category: str = Form("General"),
    significance: int = Form(DEFAULT_SIGNIFICANCE),
    icon: Optional[str] = Form(None),
):
    if file.size and file.size > 50 * 1024 * 1024:
        raise APIError(413, "File exceeds 50 MB", "file_too_large")

    if not 1 <= significance <= 5:
        raise APIError(422, "significance must be 1–5", "validation_error")

    existing = {m["id"] for m in _list_machines_basic()}
    if machine_id in existing:
        raise APIError(409, "Machine already exists", "machine_exists")

    # Archive uploaded PDF under data/uploads/{machine_id}.pdf so it can be
    # re-ingested or audited later. Overwrites if the same machine_id is re-added
    # after a delete.
    contents = await file.read()
    pdf_path = UPLOADS_DIR / f"{machine_id}.pdf"
    pdf_path.write_bytes(contents)

    _machine_metadata[machine_id] = {
        "description": description,
        "category": category,
        "significance": significance,
        "icon": icon,
        # Original filename the admin uploaded — useful for display/audit.
        "original_filename": file.filename or f"{machine_id}.pdf",
    }

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    _jobs[job_id] = {
        "job_id": job_id,
        "machine_id": machine_id,
        "display_name": display_name,
        "status": "queued",
        "step": "Queued",
        "progress": 0.0,
        "started_at": datetime.now(timezone.utc),
        "finished_at": None,
        "error": None,
        "uploaded_by": STUB_EMAIL,
        "pdf_size_bytes": len(contents),
    }

    # Kick off real ingestion in a background thread (non-blocking)
    thread = threading.Thread(
        target=_run_ingestion,
        args=(job_id, machine_id, str(pdf_path), file.filename or f"{machine_id}.pdf"),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "queued"}


@app.get("/admin/jobs/{job_id}")
async def admin_get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise APIError(404, "Job not found", "not_found")

    return {
        "job_id": job_id,
        "machine_id": job["machine_id"],
        "status": job["status"],
        "step": job.get("step", ""),
        "progress": job.get("progress", 0.0),
        "started_at": job["started_at"].isoformat() if isinstance(job["started_at"], datetime) else job["started_at"],
        "finished_at": job.get("finished_at"),
        "error": job.get("error"),
    }


@app.get("/admin/machines")
async def admin_list_machines():
    base = _list_machines_basic()
    # Stub: synthesize admin-only metadata fields per the contract.
    for m in base:
        m["uploaded_at"] = "2026-04-15T08:21:00Z"
        m["uploaded_by"] = STUB_EMAIL
        m["pdf_size_bytes"] = 2_451_200
    return {"machines": base}


@app.delete("/admin/machines/{machine_id}")
async def admin_delete_machine(machine_id: str):
    collection = ml_models["collection"]
    existing = collection.get(where={"machine": machine_id}, include=[])
    ids = existing.get("ids", []) if existing else []
    if not ids:
        raise APIError(404, "Machine not found", "not_found")
    collection.delete(ids=ids)
    _machine_metadata.pop(machine_id, None)

    # Remove the archived PDF if we have one for this machine.
    # Seeded machines (uploaded outside the admin flow) may not have a
    # `{machine_id}.pdf` on disk — that's fine, missing_ok handles it.
    archived_pdf = UPLOADS_DIR / f"{machine_id}.pdf"
    archived_pdf.unlink(missing_ok=True)

    return {"ok": True, "deleted_chunks": len(ids)}


# ── /admin/alerts ──────────────────────────────────────────────────────────


@app.get("/admin/alerts")
async def admin_list_alerts():
    # Newest first — matches the UI rendering order
    return {"alerts": list(reversed(_alerts)), "threshold": ALERT_THRESHOLD}


@app.delete("/admin/alerts")
async def admin_clear_alerts():
    cleared = len(_alerts)
    _alerts.clear()
    return {"ok": True, "cleared": cleared}


@app.post("/admin/alerts/test", status_code=201)
async def admin_test_alert():
    test_alert = {
        "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
        "machine_id": "INJECTION_MOLDING_MACHINE",
        "score": 15,
        "severity_level": 5,
        "machine_significance": 3,
        "question": "TEST — synthetic alert for setup verification",
        "answer_excerpt": "This is a test alert. Email pipeline can be verified here.",
        "email_notified": False,
        "notified_at": datetime.now(timezone.utc).isoformat(),
    }
    _alerts.append(test_alert)
    return test_alert
