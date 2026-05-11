import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Cookie, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sentence_transformers import SentenceTransformer

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


@app.post("/query", response_model=QueryResponse)
async def query(
    req: QueryRequest,
    worker_session: Optional[str] = Cookie(default=None),
):
    # Domain access control: only enforced for actual worker sessions.
    # Admin / unauthenticated callers (Postman, curl) are not gated yet.
    if worker_session and worker_session in _worker_sessions and req.machine_filter:
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
    # Worker (domain-selector) session takes precedence
    if worker_session and worker_session in _worker_sessions:
        s = _worker_sessions[worker_session]
        return {
            "authenticated": True,
            "role": "worker",
            "domain": s["domain"],
            "email": None,
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


@app.post("/admin/machines", status_code=202)
async def admin_create_machine(
    file: UploadFile = File(...),
    machine_id: str = Form(...),
    display_name: str = Form(...),
    description: str = Form(""),
    category: str = Form("General"),
    significance: int = Form(DEFAULT_SIGNIFICANCE),
    # Lucide icon name string (e.g. "Printer"). Frontend resolves via ICON_MAP.
    icon: Optional[str] = Form(None),
):
    if file.size and file.size > 50 * 1024 * 1024:
        raise APIError(413, "File exceeds 50 MB", "file_too_large")

    if not 1 <= significance <= 5:
        raise APIError(422, "significance must be 1–5", "validation_error")

    existing = {m["id"] for m in _list_machines_basic()}
    if machine_id in existing:
        raise APIError(409, "Machine already exists", "machine_exists")

    _machine_metadata[machine_id] = {
        "description": description,
        "category": category,
        "significance": significance,
        "icon": icon,
    }

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    _jobs[job_id] = {
        "machine_id": machine_id,
        "display_name": display_name,
        "started_at": datetime.now(timezone.utc),
        "uploaded_by": STUB_EMAIL,
        "pdf_size_bytes": file.size or 0,
    }
    return {"job_id": job_id, "status": "queued"}


@app.get("/admin/jobs/{job_id}")
async def admin_get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise APIError(404, "Job not found", "not_found")

    elapsed = (datetime.now(timezone.utc) - job["started_at"]).total_seconds()

    # Stub: simulate progression over ~10s so the frontend can exercise
    # its polling UX without real ingestion latency.
    if elapsed < 1:
        status, step, progress = "queued", "Queued", 0.0
    elif elapsed < 3:
        status, step, progress = "parsing", "Parsing PDF", 0.2
    elif elapsed < 5:
        status, step, progress = "chunking", "Chunking text", 0.4
    elif elapsed < 7:
        status, step, progress = "embedding", "Embedding chunks", 0.7
    elif elapsed < 9:
        status, step, progress = "indexing", "Indexing", 0.9
    else:
        status, step, progress = "done", "Complete", 1.0

    finished_at = (
        (job["started_at"] + timedelta(seconds=9)).isoformat()
        if status == "done"
        else None
    )

    return {
        "job_id": job_id,
        "machine_id": job["machine_id"],
        "status": status,
        "step": step,
        "progress": progress,
        "started_at": job["started_at"].isoformat(),
        "finished_at": finished_at,
        "error": None,
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
