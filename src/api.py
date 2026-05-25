import math
import os
import random
import re
import secrets
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
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sentence_transformers import SentenceTransformer

from . import audit, mailer, workstations
from .db import get_chroma_collection
from .rag_pipeline import run_query

load_dotenv()

# ── lifecycle ──────────────────────────────────────────────────────────────

ml_models: dict = {}
_jobs: dict[str, dict] = {}
_worker_sessions: dict[str, dict] = {}

_machine_metadata: dict[str, dict] = {
    "INJECTION_MOLDING_MACHINE": {
        "description": "Tecdia injection molding line — IMM-750 series.",
        "category": "Manufacturing",
        "significance": 5,
        "icon": "Factory",
        "suggested_questions": [
            "What does error code E-04 mean?",
            "The ejector is stuck and the mold won't open",
            "Hydraulic oil temperature is too high — what to check?",
            "Clamping force is not reaching the setpoint",
        ],
    },
    "LASER_CUTTING_MACHINE": {
        "description": "Tecdia precision laser cutter — LC-2040 series.",
        "category": "Fabrication",
        "significance": 4,
        "icon": "Scissors",
        "suggested_questions": [
            "What does error code E-07 mean?",
            "The laser tube is overheating — what should I do?",
            "Air assist pressure dropped — what to check?",
            "How do I align the laser optics safely?",
        ],
    },
    "HP_500_HYDRAULIC_PRESS": {
        "description": "Heavy-duty hydraulic press — HP-500 series.",
        "category": "Heavy Machinery",
        "significance": 5,
        "icon": "Gauge",
        "suggested_questions": [
            "What does ALARM A-06 mean?",
            "Press won't reach the set pressure",
            "Two-hand control fault — how to reset?",
            "Hydraulic oil temperature warning is on",
        ],
    },
    "FDM_X300_INDUSTRIAL_3D_PRINTER": {
        "description": "Industrial-grade FDM 3D printer — X300 series.",
        "category": "Additive Manufacturing",
        "significance": 3,
        "icon": "Printer",
        "suggested_questions": [
            "What does ERR-04 mean?",
            "Chamber is not reaching the set temperature",
            "Nozzle is clogged — how do I clear it?",
            "Filament detect sensor is disconnected",
        ],
    },
}

_DEPRECIATION_DEFAULTS: dict[str, dict] = {
    "INJECTION_MOLDING_MACHINE":      {"purchase_date": "2021-03-15", "initial_value": 4_200_000.0, "useful_life_years": 10},
    "LASER_CUTTING_MACHINE":          {"purchase_date": "2022-07-01", "initial_value": 3_100_000.0, "useful_life_years": 10},
    "HP_500_HYDRAULIC_PRESS":         {"purchase_date": "2019-11-20", "initial_value": 2_800_000.0, "useful_life_years": 12},
    "FDM_X300_INDUSTRIAL_3D_PRINTER": {"purchase_date": "2023-05-10", "initial_value":   950_000.0, "useful_life_years":  8},
}

_alerts: list[dict] = []
_query_log: list[dict] = []
QUERY_LOG_MAX = 20_000

_QUERY_CODE_RE = re.compile(r"\b[A-Z]{1,4}-?\d{2,4}\b", re.IGNORECASE)

ALERT_THRESHOLD = int(os.getenv("ALERT_THRESHOLD", "12"))
DEFAULT_SIGNIFICANCE = 3

ADMIN_EMAILS: set[str] = {
    e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
}

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")

_magic_tokens: dict[str, dict] = {}
MAGIC_TOKEN_TTL_MINUTES = 15

_admin_sessions: dict[str, dict] = {}
ADMIN_SESSION_DAYS = 30

UPLOADS_DIR = Path("./data/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_DOMAINS = {
    "General",
    "Manufacturing",
    "Additive Manufacturing",
    "Fabrication",
    "Automation",
    "Heavy Machinery",
    "All Access",
}


# ── shift helper ───────────────────────────────────────────────────────────
# Defined before any endpoint that calls it.

def _get_shift(dt: datetime) -> str:
    """Classify a UTC datetime into a named shift. Adjust hours to your facility."""
    hour = dt.hour
    if 6 <= hour < 14:
        return "Morning"
    elif 14 <= hour < 22:
        return "Afternoon"
    else:
        return "Night"


# ── lifecycle ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    start = time.time()
    ml_models["embedder"] = SentenceTransformer("all-MiniLM-L6-v2")
    ml_models["collection"] = get_chroma_collection()
    workstations.load_bindings()
    print(f"startup complete in {time.time() - start:.2f}s", flush=True)
    yield
    ml_models.clear()


app = FastAPI(title="Machine Troubleshooting RAG API", lifespan=lifespan)

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
        return True
    return machine_category == domain


def _caller_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _resolve_admin_email(stub_session: Optional[str]) -> Optional[str]:
    if not stub_session:
        return None
    s = _admin_sessions.get(stub_session)
    return s.get("email") if s else None


@app.post("/query", response_model=QueryResponse)
async def query(
    req: QueryRequest,
    request: Request,
    worker_session: Optional[str] = Cookie(default=None),
):
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
    elif worker_session and worker_session in _worker_sessions and req.machine_filter:
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
        alert_record = {
            "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
            "machine_id": req.machine_filter or "unknown",
            "score": alert_score,
            "severity_level": severity,
            "machine_significance": machine_sig,
            "question": req.question,
            "answer_excerpt": result["answer"][:280],
            "email_notified": False,
            "notified_at": datetime.now(timezone.utc).isoformat(),
        }
        if ADMIN_EMAILS:
            try:
                mailer.send_alert(list(ADMIN_EMAILS), alert_record)
                alert_record["email_notified"] = True
                print(f"[alerts] notified {ADMIN_EMAILS} of {alert_record['alert_id']}", flush=True)
            except Exception as exc:
                print(f"[alerts] mailer failed for {alert_record['alert_id']}: {exc!r}", flush=True)
        _alerts.append(alert_record)

    # ── Append to the query log for analytics ──────────────────────────────
    try:
        now_utc = datetime.now(timezone.utc)
        codes = sorted({m.upper() for m in _QUERY_CODE_RE.findall(req.question)})
        _query_log.append({
            "query_id":        f"q_{uuid.uuid4().hex[:8]}",
            "machine_id":      req.machine_filter or "unknown",
            "question":        req.question,
            "severity":        severity,
            "alert_score":     alert_score,
            "alert_fired":     alert_fired,
            "codes":           codes,
            "answer_chars":    len(result.get("answer", "")),
            "status":          result.get("status", "unknown"),
            "asked_at":        now_utc.isoformat(),
            "workstation_ip":  (
                _worker_sessions.get(worker_session, {}).get("workstation_ip")
                if worker_session else None
            ),
            "domain":          (
                _worker_sessions.get(worker_session, {}).get("domain", "unknown")
                if worker_session else "unknown"
            ),
            "worker_session_id": worker_session or None,
            "shift":           _get_shift(now_utc),
        })
        if len(_query_log) > QUERY_LOG_MAX:
            del _query_log[: len(_query_log) - QUERY_LOG_MAX]
    except Exception as exc:
        print(f"[analytics] failed to log query: {exc!r}", flush=True)

    return {
        **result,
        "alert_score": alert_score,
        "machine_significance": machine_sig,
        "alert_fired": alert_fired,
    }


# ── /machines ──────────────────────────────────────────────────────────────

DISPLAY_NAME_OVERRIDES: dict[str, str] = {}


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
        machines.append({
            "id": machine_id,
            "display_name": display_name,
            "chunk_count": count,
            "description": meta.get("description", ""),
            "category": meta.get("category", "General"),
            "significance": meta.get("significance", DEFAULT_SIGNIFICANCE),
            "icon": meta.get("icon"),
            "suggested_questions": meta.get("suggested_questions", []),
        })
    return machines


@app.get("/machines")
async def list_machines():
    return {"machines": _list_machines_basic()}


# ── /workstation ───────────────────────────────────────────────────────────

@app.get("/workstation")
async def get_workstation(request: Request):
    ip = _caller_ip(request)
    machine_id = workstations.get_binding(ip)
    if not machine_id:
        return {"bound": False, "ip": ip}

    machine = next(
        (m for m in _list_machines_basic() if m["id"] == machine_id), None
    )
    if not machine:
        print(
            f"workstation: bound machine {machine_id!r} not found in index "
            f"for ip={ip}; treating as unbound",
            flush=True,
        )
        return {"bound": False, "ip": ip, "error": "bound_machine_missing"}

    session_id = f"ws_{uuid.uuid4().hex}"
    _worker_sessions[session_id] = {
        "domain": machine.get("category") or "General",
        "machine_id": machine_id,
        "workstation_ip": ip,
        "created_at": datetime.now(timezone.utc),
    }
    response = JSONResponse({"bound": True, "ip": ip, "machine": machine})
    response.set_cookie(
        "worker_session",
        session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 12,
    )
    return response


# ── /auth ──────────────────────────────────────────────────────────────────

class RequestLinkBody(BaseModel):
    email: EmailStr


@app.post("/auth/request-link")
async def auth_request_link(body: RequestLinkBody):
    email = body.email.lower()
    if email in ADMIN_EMAILS:
        token = secrets.token_urlsafe(32)
        _magic_tokens[token] = {
            "email": email,
            "expires_at": datetime.now(timezone.utc)
                          + timedelta(minutes=MAGIC_TOKEN_TTL_MINUTES),
        }
        try:
            mailer.send_magic_link(email, token)
            print(f"[auth] magic-link sent to {email}", flush=True)
        except Exception as exc:
            print(f"[auth] mailer failed for {email}: {exc!r}", flush=True)
            _magic_tokens.pop(token, None)
    else:
        print(f"[auth] request-link for non-allowlisted {email} — ignored", flush=True)
    return {"ok": True}


_VERIFY_INTERSTITIAL = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sign in to Tecdia SmartFix</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<style>
  body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
       background:#111111;
       min-height:100vh;display:flex;align-items:center;justify-content:center;}}
  .card{{background:#ffffff;backdrop-filter:blur(20px);
        border-radius:1.5rem;padding:3rem;max-width:32rem;width:90%;
        border:1px solid rgba(255,255,255,0.6);box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);
        text-align:center;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;}}
  h1{{font-size:1.25rem;font-weight:900;color:#111111;margin:0 0 0.5rem;}}
  p{{font-size:0.875rem;color:rgba(17,17,17,0.6);line-height:1.625;margin:0 0 1.5rem;max-width:20rem;}}
  form{{margin:0;}}
  button{{background:transparent;color:#5f6368;border:none;
         padding:0;font-size:0.875rem;font-weight:500;cursor:pointer;}}
  button:active{{transform:scale(0.98);}}
  .hint{{font-size:0.75rem;color:rgba(17,17,17,0.6);margin-top:1.5rem;}}
</style>
</head>
<body>
<div class="card">
  <h1>Sign in to SmartFix</h1>
  <p>Click below to complete admin sign-in. This link is single-use.</p>
  <form method="POST" action="/auth/verify">
    <input type="hidden" name="token" value="{token}">
    <button type="submit">Sign in</button>
  </form>
  <div class="hint">The link expires 15 minutes after it was sent.</div>
</div>
</body>
</html>
"""


@app.get("/auth/verify")
async def auth_verify_landing(token: str):
    safe_token = re.sub(r"[^A-Za-z0-9_\-]", "", token)
    return HTMLResponse(_VERIFY_INTERSTITIAL.format(token=safe_token))


@app.post("/auth/verify")
async def auth_verify_confirm(request: Request, token: str = Form(...)):
    ip = _caller_ip(request)
    entry = _magic_tokens.pop(token, None)
    if not entry:
        audit.append("auth.admin_login", status="failure", ip=ip, details={"reason": "invalid_token"})
        return RedirectResponse(
            url=f"{APP_BASE_URL}/admin/login?login_error=invalid",
            status_code=302,
        )
    if entry["expires_at"] < datetime.now(timezone.utc):
        audit.append("auth.admin_login", status="failure", actor=entry["email"], ip=ip, details={"reason": "expired_token"})
        return RedirectResponse(
            url=f"{APP_BASE_URL}/admin/login?login_error=expired",
            status_code=302,
        )

    session_id = secrets.token_urlsafe(32)
    _admin_sessions[session_id] = {
        "email": entry["email"],
        "created_at": datetime.now(timezone.utc),
    }
    response = RedirectResponse(url=f"{APP_BASE_URL}/admin", status_code=302)
    response.set_cookie(
        "stub_session",
        session_id,
        httponly=True,
        samesite="lax",
        max_age=ADMIN_SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )
    print(f"[auth] admin session created for {entry['email']}", flush=True)
    audit.append("auth.admin_login", actor=entry["email"], ip=ip)
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
    response = JSONResponse({
        "authenticated": True,
        "role": "worker",
        "domain": body.domain,
        "email": None,
    })
    response.set_cookie(
        "worker_session",
        session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 12,
    )
    return response


@app.get("/auth/me")
async def auth_me(
    worker_session: Optional[str] = Cookie(default=None),
    stub_session: Optional[str] = Cookie(default=None),
):
    if stub_session and stub_session in _admin_sessions:
        s = _admin_sessions[stub_session]
        return {
            "authenticated": True,
            "role": "admin",
            "domain": "All Access",
            "email": s["email"],
            "machine_id": None,
            "workstation_ip": None,
            "session_expires_at": (
                s["created_at"] + timedelta(days=ADMIN_SESSION_DAYS)
            ).isoformat(),
        }

    if worker_session and worker_session in _worker_sessions:
        s = _worker_sessions[worker_session]
        return {
            "authenticated": True,
            "role": "worker",
            "domain": s["domain"],
            "email": None,
            "machine_id": s.get("machine_id"),
            "workstation_ip": s.get("workstation_ip"),
            "session_expires_at": (
                s["created_at"] + timedelta(hours=12)
            ).isoformat(),
        }

    raise APIError(401, "Not authenticated", "unauthenticated")


@app.post("/auth/logout")
async def auth_logout(
    request: Request,
    worker_session: Optional[str] = Cookie(default=None),
    stub_session: Optional[str] = Cookie(default=None),
):
    if worker_session:
        _worker_sessions.pop(worker_session, None)
    if stub_session:
        admin_email = _admin_sessions.get(stub_session, {}).get("email")
        _admin_sessions.pop(stub_session, None)
        if admin_email:
            audit.append("auth.admin_logout", actor=admin_email, ip=_caller_ip(request))
    response = JSONResponse({"ok": True})
    response.delete_cookie("stub_session")
    response.delete_cookie("worker_session")
    return response


# ── /admin/machines ─────────────────────────────────────────────────────────

def _run_ingestion(job_id: str, machine_id: str, pdf_path: str, filename: str):
    def _update(status, step, progress, error=None):
        _jobs[job_id].update({
            "status": status,
            "step": step,
            "progress": progress,
            "error": error,
            "finished_at": datetime.now(timezone.utc).isoformat() if status in ("done", "failed") else None,
        })

    try:
        _update("parsing", "Parsing PDF", 0.1)
        from .ingestion.parser_chunker import process_and_chunk
        chunks = process_and_chunk(pdf_path, filename, machine_id=machine_id)

        if not chunks:
            _update("failed", "No content extracted from PDF", 0.0, "empty_pdf")
            return

        _update("chunking", f"Chunked into {len(chunks)} sections", 0.4)

        _update("embedding", "Embedding chunks", 0.6)
        embedder = ml_models["embedder"]
        texts = [c["text"] for c in chunks]
        embeddings = embedder.encode(texts, batch_size=32, show_progress_bar=False)

        _update("indexing", "Indexing into database", 0.85)
        collection = ml_models["collection"]

        ids, docs, metas, vecs = [], [], [], []
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            meta = chunk.get("metadata", {})
            clean_meta = {
                "machine":  machine_id,
                "document": (meta.get("source_file") or meta.get("document")
                             or f"{machine_id}.pdf"),
                "page":     (meta.get("page_number") or meta.get("page_start")
                             or meta.get("page") or 0),
            }
            for k, v in meta.items():
                if k in clean_meta:
                    continue
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                elif isinstance(v, list) and v:
                    clean_meta[k] = str(v[0])
            ids.append(f"{machine_id}_chunk_{i}")
            docs.append(chunk["text"])
            metas.append(clean_meta)
            vecs.append(emb.tolist())

        collection.add(ids=ids, embeddings=vecs, documents=docs, metadatas=metas)
        _update("done", f"Complete — {len(chunks)} chunks indexed", 1.0)
        audit.append(
            "machine.ingest_complete",
            actor=_jobs.get(job_id, {}).get("uploaded_by"),
            target=machine_id,
            details={"job_id": job_id, "chunks_indexed": len(chunks)},
        )

    except Exception as exc:
        import traceback
        traceback.print_exc()
        _update("failed", "Ingestion error", 0.0, str(exc))
        audit.append(
            "machine.ingest_failed",
            status="failure",
            actor=_jobs.get(job_id, {}).get("uploaded_by"),
            target=machine_id,
            details={"job_id": job_id, "error": str(exc)},
        )


@app.post("/admin/machines", status_code=202)
async def admin_create_machine(
    request: Request,
    file: UploadFile = File(...),
    machine_id: str = Form(...),
    display_name: str = Form(...),
    description: str = Form(""),
    category: str = Form("General"),
    significance: int = Form(DEFAULT_SIGNIFICANCE),
    icon: Optional[str] = Form(None),
    stub_session: Optional[str] = Cookie(default=None),
):
    actor = _resolve_admin_email(stub_session) or "admin@tecdia.local"
    ip = _caller_ip(request)

    if file.size and file.size > 50 * 1024 * 1024:
        audit.append("machine.create", status="failure", actor=actor, target=machine_id, ip=ip, details={"reason": "file_too_large", "size": file.size})
        raise APIError(413, "File exceeds 50 MB", "file_too_large")

    if not 1 <= significance <= 5:
        audit.append("machine.create", status="failure", actor=actor, target=machine_id, ip=ip, details={"reason": "invalid_significance", "significance": significance})
        raise APIError(422, "significance must be 1–5", "validation_error")

    existing = {m["id"] for m in _list_machines_basic()}
    if machine_id in existing:
        audit.append("machine.create", status="failure", actor=actor, target=machine_id, ip=ip, details={"reason": "machine_exists"})
        raise APIError(409, "Machine already exists", "machine_exists")

    contents = await file.read()
    pdf_path = UPLOADS_DIR / f"{machine_id}.pdf"
    pdf_path.write_bytes(contents)

    _machine_metadata[machine_id] = {
        "description": description,
        "category": category,
        "significance": significance,
        "icon": icon,
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
        "uploaded_by": actor,
        "pdf_size_bytes": len(contents),
    }

    thread = threading.Thread(
        target=_run_ingestion,
        args=(job_id, machine_id, str(pdf_path), file.filename or f"{machine_id}.pdf"),
        daemon=True,
    )
    thread.start()

    audit.append(
        "machine.create",
        actor=actor,
        target=machine_id,
        ip=ip,
        details={
            "display_name":   display_name,
            "category":       category,
            "significance":   significance,
            "pdf_size_bytes": len(contents),
            "filename":       file.filename,
            "job_id":         job_id,
        },
    )

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
    for m in base:
        m["uploaded_at"] = "2026-04-15T08:21:00Z"
        m["uploaded_by"] = next(iter(ADMIN_EMAILS), "admin@tecdia.local")
        m["pdf_size_bytes"] = 2_451_200
    return {"machines": base}


@app.delete("/admin/machines/{machine_id}")
async def admin_delete_machine(
    machine_id: str,
    request: Request,
    stub_session: Optional[str] = Cookie(default=None),
):
    actor = _resolve_admin_email(stub_session) or "admin@tecdia.local"
    ip = _caller_ip(request)

    collection = ml_models["collection"]
    existing = collection.get(where={"machine": machine_id}, include=[])
    ids = existing.get("ids", []) if existing else []
    if not ids:
        audit.append("machine.delete", status="failure", actor=actor, target=machine_id, ip=ip, details={"reason": "not_found"})
        raise APIError(404, "Machine not found", "not_found")
    collection.delete(ids=ids)
    _machine_metadata.pop(machine_id, None)

    archived_pdf = UPLOADS_DIR / f"{machine_id}.pdf"
    archived_pdf.unlink(missing_ok=True)

    audit.append(
        "machine.delete",
        actor=actor,
        target=machine_id,
        ip=ip,
        details={"deleted_chunks": len(ids)},
    )

    return {"ok": True, "deleted_chunks": len(ids)}


# ── /admin/alerts ──────────────────────────────────────────────────────────

@app.get("/admin/alerts")
async def admin_list_alerts():
    return {"alerts": list(reversed(_alerts)), "threshold": ALERT_THRESHOLD}


@app.delete("/admin/alerts")
async def admin_clear_alerts():
    cleared = len(_alerts)
    _alerts.clear()
    return {"ok": True, "cleared": cleared}


# ── analytics helpers ──────────────────────────────────────────────────────

def _compute_depreciation(machine_id: str, now: datetime) -> Optional[dict]:
    params = _DEPRECIATION_DEFAULTS.get(machine_id)
    if not params:
        return None
    purchased = datetime.fromisoformat(params["purchase_date"]).replace(tzinfo=timezone.utc)
    life_days = params["useful_life_years"] * 365.25
    elapsed = max(0, (now - purchased).days)
    pct_elapsed = min(1.0, elapsed / life_days)
    series = []
    for m in range(11, -1, -1):
        anchor = now - timedelta(days=30 * m)
        e = max(0, (anchor - purchased).days)
        pct = min(1.0, e / life_days)
        series.append({
            "month": anchor.strftime("%Y-%m"),
            "value": round(params["initial_value"] * (1 - pct), 2),
        })
    return {
        "purchase_date":     params["purchase_date"],
        "initial_value":     params["initial_value"],
        "useful_life_years": params["useful_life_years"],
        "current_value":     round(params["initial_value"] * (1 - pct_elapsed), 2),
        "pct_remaining":     round(100 * (1 - pct_elapsed), 1),
        "monthly_loss":      round(params["initial_value"] / (params["useful_life_years"] * 12), 2),
        "series":            series,
    }


def _compute_failure_likelihood(machine_id: str, now: datetime) -> dict:
    window_start = now - timedelta(days=7)
    count = 0
    for q in _query_log:
        if q.get("machine_id") != machine_id or not q.get("alert_fired"):
            continue
        try:
            asked = datetime.fromisoformat(q["asked_at"].replace("Z", "+00:00"))
        except (KeyError, ValueError):
            continue
        if asked >= window_start:
            count += 1
    lam = count / 7.0
    return {
        "alerts_7d":      count,
        "lambda_per_day": round(lam, 3),
        "prob_24h_pct":   round(100 * (1 - math.exp(-lam * 1)), 1),
        "prob_7d_pct":    round(100 * (1 - math.exp(-lam * 7)), 1),
        "prob_30d_pct":   round(100 * (1 - math.exp(-lam * 30)), 1),
    }


# ── /admin/analytics ───────────────────────────────────────────────────────

@app.get("/admin/analytics")
async def admin_analytics(
    machine:   Optional[str] = None,
    domain:    Optional[str] = None,
    severity:  Optional[int] = None,
    shift:     Optional[str] = None,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
):
    """Aggregate _query_log into dashboard widgets, with optional filters.

    Filters (all optional, combinable):
      machine   — machine_id slug  e.g. LASER_CUTTING_MACHINE
      domain    — worker domain    e.g. Manufacturing
      severity  — int 1-5
      shift     — Morning | Afternoon | Night
      date_from — ISO date string  e.g. 2025-01-01
      date_to   — ISO date string  e.g. 2025-01-31 (inclusive)
    """
    from collections import Counter

    # ── Apply filters ──────────────────────────────────────────────────────
    log = _query_log
    if machine:
        log = [q for q in log if q.get("machine_id") == machine]
    if domain:
        log = [q for q in log if q.get("domain") == domain]
    if severity is not None:
        log = [q for q in log if q.get("severity") == severity]
    if shift:
        log = [q for q in log if q.get("shift") == shift]
    if date_from:
        try:
            df = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            log = [q for q in log if datetime.fromisoformat(
                q["asked_at"].replace("Z", "+00:00")) >= df]
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1)
            log = [q for q in log if datetime.fromisoformat(
                q["asked_at"].replace("Z", "+00:00")) < dt]
        except ValueError:
            pass

    # ── Totals ────────────────────────────────────────────────────────────
    total = len(log)
    alerts_fired = sum(1 for q in log if q.get("alert_fired"))
    machines_indexed = len({m["id"] for m in _list_machines_basic()})

    # ── Per-machine breakdown ─────────────────────────────────────────────
    per_machine_acc: dict[str, dict] = {}
    for q in log:
        mid = q["machine_id"] or "unknown"
        d = per_machine_acc.setdefault(mid, {
            "machine_id": mid,
            "query_count": 0,
            "alert_count": 0,
            "severity_sum": 0,
            "code_counter": Counter(),
        })
        d["query_count"] += 1
        d["severity_sum"] += q.get("severity", 1)
        if q.get("alert_fired"):
            d["alert_count"] += 1
        for code in q.get("codes", []):
            d["code_counter"][code] += 1

    display_names = {m["id"]: m["display_name"] for m in _list_machines_basic()}
    per_machine = []
    for mid, d in per_machine_acc.items():
        per_machine.append({
            "machine_id":       mid,
            "display_name":     display_names.get(mid, mid.replace("_", " ").title()),
            "query_count":      d["query_count"],
            "alert_count":      d["alert_count"],
            "alert_rate_pct":   round(100 * d["alert_count"] / d["query_count"], 1) if d["query_count"] else 0.0,
            "avg_severity":     round(d["severity_sum"] / d["query_count"], 2) if d["query_count"] else 0.0,
            "most_asked_codes": d["code_counter"].most_common(3),
        })
    per_machine.sort(key=lambda x: x["query_count"], reverse=True)

    # ── Global code frequency ─────────────────────────────────────────────
    code_acc: dict[tuple[str, str], dict] = {}
    for q in log:
        for code in q.get("codes", []):
            key = (code, q["machine_id"] or "unknown")
            d = code_acc.setdefault(key, {"code": code, "machine": key[1], "count": 0, "severity_sum": 0})
            d["count"] += 1
            d["severity_sum"] += q.get("severity", 1)
    code_frequency = sorted(code_acc.values(), key=lambda x: x["count"], reverse=True)[:15]
    for c in code_frequency:
        c["avg_severity"] = round(c["severity_sum"] / c["count"], 2) if c["count"] else 0.0
        del c["severity_sum"]

    # ── Severity distribution ─────────────────────────────────────────────
    sev_dist = {str(i): 0 for i in range(1, 6)}
    for q in log:
        sev = str(q.get("severity", 1))
        if sev in sev_dist:
            sev_dist[sev] += 1

    # ── Last-24h activity bucketed per hour ───────────────────────────────
    now = datetime.now(timezone.utc)
    buckets: dict[str, int] = {}
    for h in range(23, -1, -1):
        bucket_time = now - timedelta(hours=h)
        buckets[bucket_time.strftime("%H:00")] = 0
    cutoff = now - timedelta(hours=24)
    for q in log:
        try:
            asked = datetime.fromisoformat(q["asked_at"].replace("Z", "+00:00"))
        except (KeyError, ValueError):
            continue
        if asked < cutoff:
            continue
        key = asked.strftime("%H:00")
        if key in buckets:
            buckets[key] += 1
    queries_per_hour_24h = [{"hour": h, "count": c} for h, c in buckets.items()]

    # ── Top 10 questions ──────────────────────────────────────────────────
    qtext = Counter()
    qmachine: dict[str, str] = {}
    for q in log:
        text = q.get("question", "").strip().lower()
        if text:
            qtext[text] += 1
            qmachine.setdefault(text, q["machine_id"] or "unknown")
    top_questions = [
        {"question": t, "count": c, "machine": qmachine.get(t, "unknown")}
        for t, c in qtext.most_common(10)
    ]

    # ── Failure likelihood + depreciation ─────────────────────────────────
    known = _list_machines_basic()
    failure_likelihood = []
    depreciation = []
    for m in known:
        mid = m["id"]
        dn  = m["display_name"]
        failure_likelihood.append({
            "machine_id":   mid,
            "display_name": dn,
            **_compute_failure_likelihood(mid, now),
        })
        dep = _compute_depreciation(mid, now)
        if dep:
            depreciation.append({"machine_id": mid, "display_name": dn, **dep})

    # ── Available filter options (from full unfiltered log) ───────────────
    filters_meta = {
        "machines":   sorted({q.get("machine_id", "unknown") for q in _query_log}),
        "domains":    sorted({q.get("domain", "unknown")     for q in _query_log}),
        "shifts":     ["Morning", "Afternoon", "Night"],
        "severities": [1, 2, 3, 4, 5],
    }

    return {
        "totals": {
            "queries":        total,
            "alerts":         alerts_fired,
            "machines":       machines_indexed,
            "alert_rate_pct": round(100 * alerts_fired / total, 2) if total else 0.0,
        },
        "per_machine":           per_machine,
        "code_frequency":        code_frequency,
        "severity_distribution": sev_dist,
        "queries_per_hour_24h":  queries_per_hour_24h,
        "top_questions":         top_questions,
        "failure_likelihood":    failure_likelihood,
        "depreciation":          depreciation,
        "filters":               filters_meta,
    }


# ── /admin/audit ───────────────────────────────────────────────────────────

@app.get("/admin/audit")
async def admin_audit(limit: int = 200, action_prefix: Optional[str] = None):
    if not 1 <= limit <= 1000:
        raise APIError(422, "limit must be 1–1000", "validation_error")
    return {"entries": audit.read(limit=limit, action_prefix=action_prefix)}


# ── /admin/_seed-analytics ─────────────────────────────────────────────────

_SEED_QUESTIONS: dict[str, list[tuple[str, int]]] = {
    "INJECTION_MOLDING_MACHINE": [
        ("what is error E-01", 2), ("what does E-02 mean", 3), ("explain E-04 to me", 4),
        ("how do I fix E-06", 4), ("the ejector is stuck", 4), ("hydraulic oil too hot", 5),
        ("clamping force not reaching setpoint", 3), ("barrel zone temperature fluctuating", 3),
        ("production halted, motor overheating", 5), ("how often should I service", 1),
    ],
    "LASER_CUTTING_MACHINE": [
        ("what is E-01", 2), ("explain E-04", 3), ("what does E-07 mean", 4),
        ("the laser tube is overheating", 5), ("air assist pressure dropped", 3),
        ("X-Y axis position error", 4), ("how do I align the optics", 1),
        ("safety procedure for tube replacement", 4), ("cooling water temp high", 4),
    ],
    "HP_500_HYDRAULIC_PRESS": [
        ("what is A-01", 2), ("what is A-04", 3), ("explain A-06", 4),
        ("ALARM A-08 hydraulic leak", 5), ("press won't reach pressure", 4),
        ("two-hand control fault", 3), ("oil temperature warning", 3),
        ("what is the daily maintenance schedule", 1),
    ],
    "FDM_X300_INDUSTRIAL_3D_PRINTER": [
        ("what is ERR-01", 2), ("how do I fix ERR-04", 3), ("explain ERR-06", 4),
        ("chamber not reaching temperature", 3), ("nozzle is clogged", 3),
        ("filament detect sensor disconnected", 4), ("bed adhesion failing", 2),
        ("recommended chamber temperature for PA12", 1),
    ],
}

_SEED_DOMAINS = ["Manufacturing", "Fabrication", "Heavy Machinery", "Additive Manufacturing", "All Access"]


@app.post("/admin/_seed-analytics")
async def admin_seed_analytics(count: int = 80, replace: bool = False):
    """Inject synthetic query-log entries so the analytics page renders."""
    if replace:
        _query_log.clear()

    machines = [m["id"] for m in _list_machines_basic()]
    if not machines:
        return {"injected": 0, "reason": "no machines indexed"}

    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    injected = 0
    fired = 0

    for _ in range(count):
        mid = rng.choice(machines)
        pool = _SEED_QUESTIONS.get(mid) or [("general status check", 1)]
        question, severity = rng.choice(pool)

        offset_sec = rng.uniform(0, 7 * 24 * 3600)
        asked_at = now - timedelta(seconds=offset_sec)

        machine_sig = _machine_metadata.get(mid, {}).get("significance", DEFAULT_SIGNIFICANCE)
        alert_score = severity * machine_sig
        alert_fired = alert_score >= ALERT_THRESHOLD

        codes = sorted({m.upper() for m in _QUERY_CODE_RE.findall(question)})
        domain = rng.choice(_SEED_DOMAINS)

        _query_log.append({
            "query_id":        f"q_seed_{uuid.uuid4().hex[:8]}",
            "machine_id":      mid,
            "question":        question,
            "severity":        severity,
            "alert_score":     alert_score,
            "alert_fired":     alert_fired,
            "codes":           codes,
            "answer_chars":    rng.randint(180, 420),
            "status":          "success",
            "asked_at":        asked_at.isoformat(),
            "workstation_ip":  None,
            "domain":          domain,
            "worker_session_id": None,
            "shift":           _get_shift(asked_at),
        })
        injected += 1
        if alert_fired:
            fired += 1

    if len(_query_log) > QUERY_LOG_MAX:
        del _query_log[: len(_query_log) - QUERY_LOG_MAX]

    return {
        "injected":     injected,
        "alerts_fired": fired,
        "total_in_log": len(_query_log),
    }


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