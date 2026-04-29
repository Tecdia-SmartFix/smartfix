import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
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


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    return run_query(
        question=req.question,
        embedder=ml_models["embedder"],
        collection=ml_models["collection"],
        machine_filter=req.machine_filter,
        history=[t.model_dump() for t in req.history] if req.history else None,
    )


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
        machines.append(
            {"id": machine_id, "display_name": display_name, "chunk_count": count}
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


@app.get("/auth/me")
async def auth_me():
    # Stub: returns a fixture user. Real version reads the session cookie.
    return {
        "authenticated": True,
        "email": STUB_EMAIL,
        "role": STUB_ROLE,
        "session_expires_at": (
            datetime.now(timezone.utc) + timedelta(days=30)
        ).isoformat(),
    }


@app.post("/auth/logout")
async def auth_logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie("stub_session")
    return response


# ── /admin (stubs) ─────────────────────────────────────────────────────────


@app.post("/admin/machines", status_code=202)
async def admin_create_machine(
    file: UploadFile = File(...),
    machine_id: str = Form(...),
    display_name: str = Form(...),
):
    if file.size and file.size > 50 * 1024 * 1024:
        raise APIError(413, "File exceeds 50 MB", "file_too_large")

    existing = {m["id"] for m in _list_machines_basic()}
    if machine_id in existing:
        raise APIError(409, "Machine already exists", "machine_exists")

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
    return {"ok": True, "deleted_chunks": len(ids)}
