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
from fastapi import Cookie, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sentence_transformers import SentenceTransformer

from . import audit, exports, mailer, store, workstations
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

# Default shift-log parameters seeded into the SQLite store on first boot.
# After seeding the admin owns these via PUT /admin/machines/{id}/parameters,
# so editing this dict in code only affects fresh installs.
_DEFAULT_MACHINE_PARAMS: dict[str, dict] = {
    "INJECTION_MOLDING_MACHINE": {
        "numeric_readings": [
            {"key": "pressure",    "label": "Hydraulic pressure", "unit": "bar", "expected_min": 75,  "expected_max": 80},
            {"key": "temperature", "label": "Barrel temperature", "unit": "°C",  "expected_min": 220, "expected_max": 240},
            {"key": "cycle_count", "label": "Cycle count (last hour)", "unit": "", "expected_min": 130, "expected_max": 180},
        ],
        "visual_checks": [
            {"key": "leaks_observed",        "label": "Leaks observed",         "anomaly_when": True},
            {"key": "unusual_noise",         "label": "Unusual noise",          "anomaly_when": True},
            {"key": "vibration_normal",      "label": "Vibration normal",       "anomaly_when": False},
            {"key": "mold_clean",            "label": "Mold faces clean",       "anomaly_when": False},
            {"key": "safety_guards_seated",  "label": "Safety guards seated",   "anomaly_when": False},
            {"key": "cooling_water_flowing", "label": "Cooling water flowing",  "anomaly_when": False},
            {"key": "material_hopper_loaded","label": "Material hopper loaded", "anomaly_when": False},
        ],
    },
    "LASER_CUTTING_MACHINE": {
        "numeric_readings": [
            {"key": "tube_temp",       "label": "Laser tube temperature", "unit": "°C",  "expected_min": 18, "expected_max": 25},
            {"key": "assist_pressure", "label": "Air assist pressure",    "unit": "bar", "expected_min": 1.0,"expected_max": 1.5},
        ],
        "visual_checks": [
            {"key": "optics_clean",   "label": "Optics clean",       "anomaly_when": False},
            {"key": "exhaust_clear",  "label": "Exhaust path clear", "anomaly_when": False},
        ],
    },
    "HP_500_HYDRAULIC_PRESS": {
        "numeric_readings": [
            {"key": "ram_pressure", "label": "Ram pressure",      "unit": "bar", "expected_min": 480, "expected_max": 510},
            {"key": "oil_temp",     "label": "Hydraulic oil temp","unit": "°C",  "expected_min": 35,  "expected_max": 55},
        ],
        "visual_checks": [
            {"key": "two_hand_ok", "label": "Two-hand control OK", "anomaly_when": False},
        ],
    },
    "FDM_X300_INDUSTRIAL_3D_PRINTER": {
        "numeric_readings": [
            {"key": "chamber_temp", "label": "Chamber temperature","unit": "°C", "expected_min": 60, "expected_max": 80},
            {"key": "nozzle_temp",  "label": "Nozzle temperature", "unit": "°C", "expected_min": 230,"expected_max": 260},
        ],
        "visual_checks": [
            {"key": "filament_loaded", "label": "Filament loaded", "anomaly_when": False},
        ],
    },
}

# Per-machine depreciation parameters. Demo-only synthetic numbers — replace
# with real asset records once a maintenance system is integrated. Straight-line
# depreciation: current_value = initial_value * (1 - elapsed_years / useful_life).
_DEPRECIATION_DEFAULTS: dict[str, dict] = {
    "INJECTION_MOLDING_MACHINE":      {"purchase_date": "2021-03-15", "initial_value": 4_200_000.0, "useful_life_years": 10},
    "LASER_CUTTING_MACHINE":          {"purchase_date": "2022-07-01", "initial_value": 3_100_000.0, "useful_life_years": 10},
    "HP_500_HYDRAULIC_PRESS":         {"purchase_date": "2019-11-20", "initial_value": 2_800_000.0, "useful_life_years": 12},
    "FDM_X300_INDUSTRIAL_3D_PRINTER": {"purchase_date": "2023-05-10", "initial_value":   950_000.0, "useful_life_years":  8},
}

# Alert log (in-memory). Each entry matches the shape rendered in the admin UI.
_alerts: list[dict] = []
# machine_id → ISO timestamp after which alerts for that machine can fire
# again. Admin sets this from the alert panel via /admin/alerts/snooze.
# In-memory only — same caveat as `_alerts` (lost on restart). P1 work.
_alert_snoozes: dict[str, str] = {}
# Dedup window: how long (seconds) to suppress a repeat alert for the same
# (machine_id, dominant_code) pair. Env-tunable for ops who want longer
# quiet periods. Default 300s = 5 min.
ALERT_DEDUP_SECONDS = int(os.getenv("ALERT_DEDUP_SECONDS", "300"))

# Append-only query log (in-memory). Feeds the analytics endpoint. Capped at
# QUERY_LOG_MAX entries to keep memory bounded — old entries are dropped FIFO.
# Persistence is intentionally deferred; for live demo this is sufficient.
_query_log: list[dict] = []
QUERY_LOG_MAX = 20_000

# Pre-compiled patterns reused by every /query call to extract diagnostic
# codes from the question text. Same broad shape the retriever / chunker use.
_QUERY_CODE_RE = re.compile(r"\b[A-Z]{1,4}-?\d{2,4}\b", re.IGNORECASE)

ALERT_THRESHOLD = int(os.getenv("ALERT_THRESHOLD", "12"))


def _load_runtime_config() -> None:
    """Pull admin-tuned overrides out of the app_config table into the
    module globals that the request handlers consult. Called once in the
    lifespan and again after every PATCH /admin/config write.
    """
    global ALERT_THRESHOLD, ALERT_DEDUP_SECONDS
    cfg = store.get_app_config()
    if "alert_threshold" in cfg:
        try:
            ALERT_THRESHOLD = int(cfg["alert_threshold"])
        except ValueError:
            pass
    if "alert_dedup_seconds" in cfg:
        try:
            ALERT_DEDUP_SECONDS = int(cfg["alert_dedup_seconds"])
        except ValueError:
            pass
DEFAULT_SIGNIFICANCE = 3

def _get_shift(dt: datetime) -> str:
    """Classify a UTC datetime into a named shift. Adjust hours to your facility."""
    hour = dt.hour
    if 6 <= hour < 14:
        return "Morning"
    elif 14 <= hour < 22:
        return "Afternoon"
    else:
        return "Night"

# ── Admin auth (magic-link via Resend) ─────────────────────────────────────
# Email allowlist — only these addresses can request a sign-in link AND
# receive alert emails. Empty allowlist means no admins, which is the
# safe-by-default state for a fresh clone with no .env configured.
ADMIN_EMAILS: set[str] = {
    e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
}

# APP_BASE_URL is what we put inside magic-link emails. In dev this is the
# Vite dev server (which proxies /auth/* back to this backend). In prod
# it's the public frontend URL.
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173").rstrip("/")

# token → {email, expires_at}. Single-use; popped on verify.
_magic_tokens: dict[str, dict] = {}
MAGIC_TOKEN_TTL_MINUTES = 15

# Admin sessions are persisted in SQLite (`admin_sessions` table) so they
# survive uvicorn restarts. See store.create_admin_session /
# store.get_admin_session / store.delete_admin_session. Cookie value is the
# session_id.
ADMIN_SESSION_DAYS = 30

# Archive location for uploaded PDFs. Each new machine is stored as
# `{machine_id}.pdf` so it can be re-ingested, audited, or downloaded later.
# Replaces the previous tempfile-then-delete flow.
UPLOADS_DIR = Path("./data/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
# Custom machine icons uploaded by admins. Served as a static directory at
# /uploads/icons (mounted below) — only this subfolder is publicly readable,
# the parent data/uploads/ where PDFs live stays private.
ICONS_DIR = UPLOADS_DIR / "icons"
ICONS_DIR.mkdir(parents=True, exist_ok=True)

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
    # SQLite store (machine parameters + shift logs). Idempotent — creates
    # tables if missing, then seeds default parameters for the demo machines
    # so the EndShiftModal has something to render on a fresh clone.
    store.init_store()
    store.seed_machine_parameters(_DEFAULT_MACHINE_PARAMS)
    # Strictly additive: surfaces new default visual_checks (eg. extra IMM
    # pre-shift items) on existing installs without overwriting admin edits.
    store.backfill_default_visual_checks(_DEFAULT_MACHINE_PARAMS)
    # Apply admin-tuned runtime config (alert threshold + dedup window).
    # Persisted across restarts via the app_config SQLite table — env vars
    # remain the defaults, the DB row wins when present.
    _load_runtime_config()
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

# Serve custom machine icons uploaded by admins. Deliberately scoped to
# the icons subdir so the PDFs in data/uploads/ aren't exposed.
app.mount("/uploads/icons", StaticFiles(directory=ICONS_DIR), name="machine_icons")


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


def _resolve_admin_email(stub_session: Optional[str]) -> Optional[str]:
    """Return the admin email behind a `stub_session` cookie, or None."""
    if not stub_session:
        return None
    s = store.get_admin_session(stub_session)
    return s["email"] if s else None


def require_admin(stub_session: Optional[str] = Cookie(default=None)) -> str:
    """FastAPI dependency: gate every /admin/* route at the API boundary.

    Returns the authenticated admin's email so the handler can attribute audit
    log entries without re-reading the cookie. Raises 401 if the cookie is
    absent, expired, or doesn't map to an admin session. ProtectedAdminRoute
    on the frontend used to be the only gate — this closes the hole where a
    direct `curl` against /admin/* would succeed without credentials.
    """
    email = _resolve_admin_email(stub_session)
    if not email:
        raise APIError(401, "Admin authentication required", "unauthenticated")
    return email


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
        # Dedup + snooze gate — both bypass the email and the persisted
        # record, but the query still gets logged for analytics. The
        # caller's /query response carries `alert_fired: False` when
        # suppressed so the chat UI doesn't show an alert badge that
        # doesn't correspond to an actual outbound notification.
        mid = req.machine_filter or "unknown"
        now = datetime.now(timezone.utc)
        codes = sorted({m.upper() for m in _QUERY_CODE_RE.findall(req.question)})
        dominant_code = codes[0] if codes else "_uncoded"

        # 1. Snooze: is this machine currently in a quiet window?
        snooze_until_iso = _alert_snoozes.get(mid)
        snoozed = False
        if snooze_until_iso:
            try:
                if datetime.fromisoformat(snooze_until_iso) > now:
                    snoozed = True
                else:
                    _alert_snoozes.pop(mid, None)  # expired, clean up
            except ValueError:
                _alert_snoozes.pop(mid, None)

        # 2. Dedup: same (machine, code) fired within ALERT_DEDUP_SECONDS?
        deduped = False
        if not snoozed and ALERT_DEDUP_SECONDS > 0:
            cutoff = now - timedelta(seconds=ALERT_DEDUP_SECONDS)
            for prior in reversed(_alerts):
                if prior.get("machine_id") != mid:
                    continue
                prior_codes = sorted({m.upper() for m in _QUERY_CODE_RE.findall(prior.get("question", ""))})
                prior_dom = prior_codes[0] if prior_codes else "_uncoded"
                if prior_dom != dominant_code:
                    continue
                try:
                    if datetime.fromisoformat(prior["notified_at"]) >= cutoff:
                        deduped = True
                except (KeyError, ValueError):
                    pass
                break  # only look at the most recent matching alert

        if snoozed or deduped:
            print(
                f"[alerts] suppressed for {mid} (code={dominant_code}): "
                f"{'snoozed' if snoozed else 'dedup'}",
                flush=True,
            )
        else:
            alert_fired = True
            alert_record = {
                "alert_id": f"alert_{uuid.uuid4().hex[:8]}",
                "machine_id": mid,
                "score": alert_score,
                "severity_level": severity,
                "machine_significance": machine_sig,
                "question": req.question,
                "answer_excerpt": result["answer"][:280],
                "email_notified": False,
                "acknowledged_at": None,
                "notified_at": now.isoformat(),
            }
            # Fire-and-forget email to every admin in the allowlist. Failure
            # never breaks the /query response — we just leave email_notified=False
            # on the persisted record so the UI can show "not delivered".
            if ADMIN_EMAILS:
                try:
                    mailer.send_alert(list(ADMIN_EMAILS), alert_record)
                    alert_record["email_notified"] = True
                    print(f"[alerts] notified {ADMIN_EMAILS} of {alert_record['alert_id']}", flush=True)
                except Exception as exc:
                    print(f"[alerts] mailer failed for {alert_record['alert_id']}: {exc!r}", flush=True)
            _alerts.append(alert_record)

    # ── Append to the query log for analytics ──
    # Captured after the alert path so `alert_fired` reflects the truth.
    # Fire-and-forget: a failure here must never break the user's response.
    try:
        codes = sorted({m.upper() for m in _QUERY_CODE_RE.findall(req.question)})
        now_utc = datetime.now(timezone.utc)
        _query_log.append({
            "query_id":      f"q_{uuid.uuid4().hex[:8]}",
            "machine_id":    req.machine_filter or "unknown",
            "question":      req.question,
            "severity":      severity,
            "alert_score":   alert_score,
            "alert_fired":   alert_fired,
            "codes":         codes,
            "answer_chars":  len(result.get("answer", "")),
            "status":        result.get("status", "unknown"),
            "asked_at":      now_utc.isoformat(),
            "workstation_ip": (
                _worker_sessions.get(worker_session, {}).get("workstation_ip")
                if worker_session else None
            ),
            "domain": (
                _worker_sessions.get(worker_session, {}).get("domain", "unknown")
                if worker_session else "unknown"
            ),
            "shift": _get_shift(now_utc),
        })
        # FIFO cap so memory stays bounded.
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
        meta = _machine_metadata.get(machine_id, {})
        # display_name precedence: admin-edited (PATCH) > hardcoded override > derived from slug.
        display_name = (
            meta.get("display_name")
            or DISPLAY_NAME_OVERRIDES.get(machine_id)
            or machine_id.replace("_", " ").title()
        )
        # Custom-uploaded icon, detected on disk so it survives restarts
        # (in-memory _machine_metadata doesn't). MachineCard prefers this
        # URL over the bundled MACHINE_IMAGES, so an admin upload always
        # wins. None when no file is present.
        icon_files = list(ICONS_DIR.glob(f"{machine_id}.*"))
        custom_icon_url = f"/uploads/icons/{icon_files[0].name}" if icon_files else None
        machines.append(
            {
                "id": machine_id,
                "display_name": display_name,
                "chunk_count": count,
                "description": meta.get("description", ""),
                "category": meta.get("category", "General"),
                "significance": meta.get("significance", DEFAULT_SIGNIFICANCE),
                "icon": meta.get("icon"),
                "customIconUrl": custom_icon_url,
                "suggested_questions": meta.get("suggested_questions", []),
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


# ── /auth ──────────────────────────────────────────────────────────────────
# Real magic-link admin auth via Resend (see src/mailer.py).
#   1. POST /auth/request-link {email} → if email is in ADMIN_EMAILS, send a
#      one-time link to that inbox. Always returns 200 (no enumeration leak).
#   2. GET  /auth/verify?token=... → pop the token (single-use), check expiry,
#      create an admin session, set cookie, redirect to /admin.
#   3. GET  /auth/me reads the cookie back, returns the admin's email/role.


class RequestLinkBody(BaseModel):
    email: EmailStr


@app.post("/auth/request-link")
async def auth_request_link(body: RequestLinkBody):
    """Email a magic-link to `body.email` if (and only if) it's an allowed admin.

    Always returns `{"ok": true}` regardless of allowlist match — this prevents
    enumerating valid admin emails through response timing or content.
    """
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
            # Don't expose mail failures to the caller — log and move on.
            # The token is still issued; if the admin retries within 15 min
            # we'll re-send (the dict will hold both tokens, either works).
            print(f"[auth] mailer failed for {email}: {exc!r}", flush=True)
            _magic_tokens.pop(token, None)
    else:
        # Tiny delay would normally go here to mask timing differences.
        # Skipping for dev speed; revisit when this leaves stub-territory.
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
    """Render a click-through page. Does NOT consume the token.

    Why: Gmail / Outlook / Slack etc. all prefetch links in incoming emails
    to scan for phishing. If the GET handler popped the token, the scanner
    would burn it before the real user could click. Sending the token through
    a form POST means scanners (which only follow GET / HEAD) can't trigger
    a session creation — only a deliberate button-click from the real user can.
    """
    # Defensive escape: token is alphanumeric (token_urlsafe) but cheap to be safe.
    safe_token = re.sub(r"[^A-Za-z0-9_\-]", "", token)
    return HTMLResponse(_VERIFY_INTERSTITIAL.format(token=safe_token))


@app.post("/auth/verify")
async def auth_verify_confirm(request: Request, token: str = Form(...)):
    """Consume the magic-link token, create an admin session, redirect to /admin.

    Token is single-use (popped here) and must be within
    MAGIC_TOKEN_TTL_MINUTES of issue. On failure we redirect to AdminLogin
    with a `?login_error=...` query param so the page can show the reason.
    """
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
    store.create_admin_session(session_id, entry["email"], ADMIN_SESSION_DAYS)
    response = RedirectResponse(url=f"{APP_BASE_URL}/admin", status_code=302)
    response.set_cookie(
        "stub_session",      # cookie name kept for FE compat (AdminAuthContext)
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


@app.post("/auth/_dev/capture-session")
async def _dev_capture_admin_session():
    # Dev-only backdoor for the marketing screenshot pipeline. Returns 404
    # unless MARKETING_CAPTURE=1 is set in the environment, so it cannot
    # be triggered in any deployed environment.
    if os.getenv("MARKETING_CAPTURE") != "1":
        raise APIError(404, "Not Found", "not_found")

    session_id = secrets.token_urlsafe(32)
    email = next(iter(ADMIN_EMAILS), "capture@tecdia.local")
    store.create_admin_session(session_id, email, ADMIN_SESSION_DAYS)
    response = JSONResponse({"ok": True, "email": email})
    response.set_cookie(
        "stub_session",
        session_id,
        httponly=True,
        samesite="lax",
        max_age=ADMIN_SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )
    return response


@app.get("/auth/me")
async def auth_me(
    worker_session: Optional[str] = Cookie(default=None),
    stub_session: Optional[str] = Cookie(default=None),
):
    # Admin session takes precedence — higher privilege, and the typical
    # case where both cookies exist is "I tested the workstation flow then
    # signed in as admin." Without this ordering, a stale worker_session
    # would mask the admin login and ProtectedAdminRoute would bounce
    # the user back to /admin/login forever.
    admin = store.get_admin_session(stub_session) if stub_session else None
    if admin:
        return {
            "authenticated": True,
            "role": "admin",
            "domain": "All Access",
            "email": admin["email"],
            "machine_id": None,
            "workstation_ip": None,
            "session_expires_at": admin["expires_at"].isoformat(),
        }

    # Worker (domain-selector or workstation-bound) session
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

    # No valid session — frontend's AuthContext treats this as guest/redirect.
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
        admin_email = store.delete_admin_session(stub_session)
        if admin_email:
            audit.append("auth.admin_logout", actor=admin_email, ip=_caller_ip(request))
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
            # ChromaDB rejects None values and lists — sanitise.
            # IMPORTANT: also normalize the parser's verbose key names
            # (source_file, page_number) into the short ones that the
            # rag_pipeline emits in /query responses (document, page).
            # Without this, admin uploads produce chunks whose source chips
            # render as blank "· p." in the UI. This matches what
            # scripts/build_index.py does for offline-built JSONs.
            clean_meta = {
                "machine":  machine_id,
                "document": (meta.get("source_file") or meta.get("document")
                             or f"{machine_id}.pdf"),
                "page":     (meta.get("page_number") or meta.get("page_start")
                             or meta.get("page") or 0),
            }
            for k, v in meta.items():
                if k in clean_meta:
                    continue  # keep the normalized values above
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
    # PDF is intentionally NOT deleted — it stays in data/uploads/ for re-ingest/audit.


# Image mime types accepted for the optional admin-uploaded machine icon.
_ICON_MIME_TO_EXT = {
    "image/png":  ".png",
    "image/jpeg": ".jpg",
    "image/jpg":  ".jpg",
    "image/webp": ".webp",
    "image/gif":  ".gif",
    "image/svg+xml": ".svg",
}
_ICON_MAX_BYTES = 5 * 1024 * 1024  # 5 MB — icons are tiny


def _save_machine_icon(machine_id: str, custom_icon: UploadFile) -> Optional[str]:
    """Persist an admin-uploaded machine icon and return its public URL,
    or None when no file was provided. Drops any previously-saved icon for
    the same machine so an update replaces cleanly.
    """
    if not custom_icon or not custom_icon.filename:
        return None
    ext = _ICON_MIME_TO_EXT.get(custom_icon.content_type or "")
    if not ext:
        # Fall back to filename extension when the browser sent a vague
        # content_type — common with .svg from drag-and-drop.
        suffix = Path(custom_icon.filename).suffix.lower()
        if suffix in _ICON_MIME_TO_EXT.values():
            ext = suffix
    if not ext:
        raise APIError(400, "Icon must be PNG, JPG, WebP, GIF, or SVG", "invalid_icon_type")

    # Wipe any prior icon for this machine — different extensions etc.
    for old in ICONS_DIR.glob(f"{machine_id}.*"):
        old.unlink(missing_ok=True)

    dest = ICONS_DIR / f"{machine_id}{ext}"
    dest.write_bytes(custom_icon.file.read())
    if dest.stat().st_size > _ICON_MAX_BYTES:
        dest.unlink(missing_ok=True)
        raise APIError(413, "Icon exceeds 5 MB", "icon_too_large")
    return f"/uploads/icons/{dest.name}"


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
    # Optional admin-uploaded image file. Distinct from `icon` (Lucide
    # name): if both are provided, the uploaded image wins on the card
    # because MachineCard reads `customIconUrl` before `MACHINE_IMAGES`.
    custom_icon: Optional[UploadFile] = File(None),
    admin_email: str = Depends(require_admin),
):
    actor = admin_email
    ip = _caller_ip(request)

    if not file.filename or not file.filename.lower().endswith('.pdf') or file.content_type != "application/pdf":
        raise APIError(400, "Only PDF files are allowed", "invalid_file_type")

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

    # Save custom icon (if any) before reading the PDF body — keeps the
    # error path simple if the icon is invalid.
    icon_url = _save_machine_icon(machine_id, custom_icon)

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
        "uploaded_by": actor,
        "pdf_size_bytes": len(contents),
    }

    # Kick off real ingestion in a background thread (non-blocking)
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
async def admin_get_job(job_id: str, admin_email: str = Depends(require_admin)):
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
async def admin_list_machines(admin_email: str = Depends(require_admin)):
    base = _list_machines_basic()
    # Stub: synthesize admin-only metadata fields per the contract.
    for m in base:
        m["uploaded_at"] = "2026-04-15T08:21:00Z"
        m["uploaded_by"] = next(iter(ADMIN_EMAILS), "admin@tecdia.local")
        m["pdf_size_bytes"] = 2_451_200
    return {"machines": base}


@app.delete("/admin/machines/{machine_id}")
async def admin_delete_machine(
    machine_id: str,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    actor = admin_email
    ip = _caller_ip(request)

    collection = ml_models["collection"]
    existing = collection.get(where={"machine": machine_id}, include=[])
    ids = existing.get("ids", []) if existing else []
    if not ids:
        audit.append("machine.delete", status="failure", actor=actor, target=machine_id, ip=ip, details={"reason": "not_found"})
        raise APIError(404, "Machine not found", "not_found")
    collection.delete(ids=ids)
    _machine_metadata.pop(machine_id, None)

    # Remove the archived PDF if we have one for this machine.
    # Seeded machines (uploaded outside the admin flow) may not have a
    # `{machine_id}.pdf` on disk — that's fine, missing_ok handles it.
    archived_pdf = UPLOADS_DIR / f"{machine_id}.pdf"
    archived_pdf.unlink(missing_ok=True)
    # Also drop any uploaded custom icon so a re-add of the same machine_id
    # doesn't inherit a stale image from a previous incarnation.
    for old_icon in ICONS_DIR.glob(f"{machine_id}.*"):
        old_icon.unlink(missing_ok=True)

    audit.append(
        "machine.delete",
        actor=actor,
        target=machine_id,
        ip=ip,
        details={"deleted_chunks": len(ids)},
    )

    return {"ok": True, "deleted_chunks": len(ids)}


class MachinePatchPayload(BaseModel):
    """Subset of `_machine_metadata` an admin can edit after creation.

    All fields are optional — only the ones present in the request are
    overwritten. The indexed PDF chunks in Chroma are untouched, so this
    is fully non-destructive (renaming "INJECTION_MOLDING_MACHINE" → a
    nicer display name doesn't blow away any shift logs or alerts).
    """
    display_name:        Optional[str] = None
    description:         Optional[str] = None
    category:            Optional[str] = None
    significance:        Optional[int] = None
    icon:                Optional[str] = None
    suggested_questions: Optional[list[str]] = None


@app.patch("/admin/machines/{machine_id}")
async def admin_patch_machine(
    machine_id: str,
    payload: MachinePatchPayload,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    ip = _caller_ip(request)
    existing_ids = {m["id"] for m in _list_machines_basic()}
    if machine_id not in existing_ids:
        raise APIError(404, "Machine not found", "not_found")

    if payload.significance is not None and not 1 <= payload.significance <= 5:
        raise APIError(422, "significance must be 1–5", "validation_error")
    if payload.category and payload.category not in ALLOWED_DOMAINS:
        # Soft-reject — we intentionally don't error here because the admin
        # may have invented a new category we haven't whitelisted yet. Log
        # it so it shows up in the audit trail and let the write through.
        audit.append(
            "machine.patch",
            status="warning",
            actor=admin_email,
            target=machine_id,
            ip=ip,
            details={"unknown_category": payload.category},
        )

    meta = _machine_metadata.setdefault(machine_id, {})
    changes = payload.model_dump(exclude_unset=True)
    # `display_name` doesn't live in `_machine_metadata` directly — it's
    # synthesized from the machine_id by `_list_machines_basic`. We store
    # it here under the same key the list endpoint reads from.
    for key, value in changes.items():
        meta[key] = value

    audit.append(
        "machine.patch",
        actor=admin_email,
        target=machine_id,
        ip=ip,
        details={"fields": list(changes.keys())},
    )

    # Return the freshly-merged record so the frontend can update without
    # a second round-trip.
    base = next((m for m in _list_machines_basic() if m["id"] == machine_id), None)
    return base or {"id": machine_id, **meta}


@app.post("/admin/machines/{machine_id}/reingest", status_code=202)
async def admin_reingest_machine(
    machine_id: str,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    """Re-run ingestion against the PDF already archived for this machine.

    Use case: the admin replaced data/uploads/{id}.pdf with an updated
    manual (or fixed an OCR issue) and wants new chunks indexed without
    losing the machine record, parameters, or shift logs. Old chunks are
    deleted first so we don't get duplicates.
    """
    ip = _caller_ip(request)

    if machine_id not in {m["id"] for m in _list_machines_basic()}:
        raise APIError(404, "Machine not found", "not_found")

    pdf_path = UPLOADS_DIR / f"{machine_id}.pdf"
    if not pdf_path.exists():
        raise APIError(
            404,
            f"No archived PDF found at {pdf_path}. Upload the machine again instead.",
            "pdf_missing",
        )

    # Drop existing chunks for this machine so ingestion doesn't duplicate.
    # Machine parameters + shift logs live in SQLite and are NOT touched.
    collection = ml_models["collection"]
    existing = collection.get(where={"machine": machine_id}, include=[])
    old_ids = existing.get("ids", []) if existing else []
    if old_ids:
        collection.delete(ids=old_ids)

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    _jobs[job_id] = {
        "job_id": job_id,
        "machine_id": machine_id,
        "display_name": (_machine_metadata.get(machine_id) or {}).get("display_name", machine_id),
        "status": "queued",
        "step": "Queued for re-ingest",
        "progress": 0.0,
        "started_at": datetime.now(timezone.utc),
        "finished_at": None,
        "error": None,
        "uploaded_by": admin_email,
        "pdf_size_bytes": pdf_path.stat().st_size,
    }

    thread = threading.Thread(
        target=_run_ingestion,
        args=(job_id, machine_id, str(pdf_path), pdf_path.name),
        daemon=True,
    )
    thread.start()

    audit.append(
        "machine.reingest",
        actor=admin_email,
        target=machine_id,
        ip=ip,
        details={"job_id": job_id, "deleted_chunks": len(old_ids)},
    )

    return {"job_id": job_id, "status": "queued", "deleted_chunks": len(old_ids)}


# ── machine parameters + shift logs ────────────────────────────────────────
# Three roles touch this surface:
#   • worker    → GET params (renders EndShiftModal), POST /shifts/log
#   • admin     → PUT params (parameter editor), GET /admin/shifts
#   • handoff   → GET /machines/{id}/shifts/latest (feature 3, not built yet)
#
# Admin endpoints follow the same pattern as the rest of the file: the
# `stub_session` cookie is used for *attribution* in audit logs, not as a
# hard gate. ProtectedAdminRoute on the frontend is the auth boundary today.


class NumericReadingSpec(BaseModel):
    key: str
    label: str
    unit: str = ""
    expected_min: Optional[float] = None
    expected_max: Optional[float] = None


class VisualCheckSpec(BaseModel):
    key: str
    label: str
    # True  → an anomaly is recorded when the worker ticks the box (e.g. "leaks observed")
    # False → an anomaly is recorded when the worker leaves it unticked (e.g. "vibration normal")
    anomaly_when: bool = True


class MachineParametersPayload(BaseModel):
    numeric_readings: list[NumericReadingSpec] = Field(default_factory=list)
    visual_checks:    list[VisualCheckSpec]    = Field(default_factory=list)


@app.get("/machines/{machine_id}/parameters")
async def get_machine_parameters(machine_id: str):
    """Worker-facing: drives the dynamic form in EndShiftModal."""
    return store.get_machine_parameters(machine_id)


@app.put("/admin/machines/{machine_id}/parameters")
async def admin_put_machine_parameters(
    machine_id: str,
    payload: MachineParametersPayload,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    actor = admin_email
    ip = _caller_ip(request)

    # Reject parameters for machines that don't exist in metadata. Avoids
    # accumulating orphan rows if the admin sends a typo'd machine_id.
    if machine_id not in {m["id"] for m in _list_machines_basic()}:
        raise APIError(404, "Machine not found", "not_found")

    saved = store.upsert_machine_parameters(
        machine_id,
        [r.model_dump() for r in payload.numeric_readings],
        [v.model_dump() for v in payload.visual_checks],
    )

    audit.append(
        "machine.parameters_update",
        actor=actor,
        target=machine_id,
        ip=ip,
        details={
            "numeric_count": len(payload.numeric_readings),
            "visual_count":  len(payload.visual_checks),
        },
    )
    return saved


class ShiftLogPayload(BaseModel):
    machine_id:    str
    readings:      dict       = Field(default_factory=dict)
    visual_checks: dict       = Field(default_factory=dict)
    notes:         Optional[str] = None
    worker_label:  Optional[str] = None
    # 'start' for pre-shift checklist, 'end' for end-of-shift log. Defaults to
    # 'end' so existing callers keep working without modification.
    phase:         str         = "end"


def _derive_worker_label(
    payload_label: Optional[str],
    worker_session: Optional[str],
    workstation_ip: str,
) -> str:
    """Decide what to record as the worker identity for a shift log.

    Precedence (most authoritative first):
      1. Workstation binding — IP→machine map names the station deterministically.
      2. Worker session domain — set when the worker picked one at the landing page.
      3. Payload-provided label — frontend fallback for unauthenticated flows.
      4. Generic "Worker" — last resort so the column is never empty.

    The payload value is treated as the *least* trusted source because the
    frontend can send anything; we keep it as a fallback so demos / curl /
    integration tests still produce a sensible label.
    """
    bound_machine = workstations.get_binding(workstation_ip)
    if bound_machine:
        return f"Workstation {workstation_ip} ({bound_machine})"
    if worker_session and worker_session in _worker_sessions:
        s = _worker_sessions[worker_session]
        domain = s.get("domain") or "General"
        return f"Worker · {domain}"
    if payload_label and payload_label.strip():
        return payload_label.strip()
    return "Worker"


@app.post("/shifts/log", status_code=201)
async def submit_shift_log(
    payload: ShiftLogPayload,
    request: Request,
    worker_session: Optional[str] = Cookie(default=None),
):
    parameters = store.get_machine_parameters(payload.machine_id)
    anomalies, severity = store.compute_anomalies(
        parameters, payload.readings, payload.visual_checks
    )
    ip = _caller_ip(request)
    return store.insert_shift_log(
        machine_id=payload.machine_id,
        readings=payload.readings,
        visual_checks=payload.visual_checks,
        notes=payload.notes,
        worker_label=_derive_worker_label(payload.worker_label, worker_session, ip),
        workstation_ip=ip,
        anomalies=anomalies,
        severity=severity,
        phase=payload.phase,
    )


@app.get("/machines/{machine_id}/shifts/recent")
async def list_recent_shifts(machine_id: str, limit: int = 5, phase: Optional[str] = None):
    """Worker-facing: most recent N logs for this machine.

    Pass `phase=end` to restrict to end-of-shift logs (used by the handoff
    banner to avoid surfacing a brand-new start-of-shift log).
    """
    limit = max(1, min(limit, 50))
    return {"logs": store.list_shift_logs(machine_id=machine_id, limit=limit, phase=phase)}


@app.get("/admin/shifts")
async def admin_list_shifts(
    machine_id: Optional[str] = None,
    limit: int = 100,
    phase: Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    """Admin-facing: all logs (optionally filtered by machine and/or phase)."""
    limit = max(1, min(limit, 1000))
    return {"logs": store.list_shift_logs(machine_id=machine_id, limit=limit, phase=phase)}


def _filter_shift_logs_for_export(
    machine_id: Optional[str],
    severity:   Optional[int],
    shift:      Optional[str],     # '1st shift' | '2nd shift'
    days:       Optional[int],
    date_from:  Optional[str],     # YYYY-MM-DD inclusive
    date_to:    Optional[str],     # YYYY-MM-DD inclusive
) -> list[dict]:
    """Same filter semantics as the Shift Logs page so exports match what users see."""
    logs = store.list_shift_logs(machine_id=machine_id, limit=1000)
    if not (severity or shift or days or date_from or date_to):
        return logs

    now = datetime.now(timezone.utc)
    cutoff_start: Optional[datetime] = None
    cutoff_end:   Optional[datetime] = None
    if days and days > 0:
        cutoff_start = now - timedelta(days=days)
    else:
        if date_from:
            try:
                cutoff_start = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if date_to:
            try:
                cutoff_end = (
                    datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
                    + timedelta(days=1)
                )
            except ValueError:
                pass

    def _shift_band(iso: str) -> str:
        try:
            d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except (AttributeError, ValueError):
            return ""
        return "1st shift" if 6 <= d.hour < 18 else "2nd shift"

    out: list[dict] = []
    for l in logs:
        created = l.get("created_at") or ""
        if cutoff_start or cutoff_end:
            try:
                t = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except (AttributeError, ValueError):
                continue
            if cutoff_start and t < cutoff_start:
                continue
            if cutoff_end and t >= cutoff_end:
                continue
        if severity is not None and (l.get("severity") or 0) != severity:
            continue
        if shift and _shift_band(created) != shift:
            continue
        out.append(l)
    return out


def _machine_name_map() -> dict:
    return {m["id"]: m["display_name"] for m in _list_machines_basic()}


def _safe_filename(stem: str, ext: str) -> str:
    return f"{stem}_{datetime.now().strftime('%Y%m%d_%H%M')}.{ext}"


@app.get("/admin/shifts/export.xlsx")
async def admin_shifts_export_xlsx(
    machine_id: Optional[str] = None,
    severity:   Optional[int] = None,
    shift:      Optional[str] = None,
    days:       Optional[int] = None,
    date_from:  Optional[str] = None,
    date_to:    Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    logs = _filter_shift_logs_for_export(machine_id, severity, shift, days, date_from, date_to)
    blob = exports.shift_logs_xlsx(
        logs,
        filters={"machine_id": machine_id, "severity": severity, "shift": shift,
                 "days": days, "date_from": date_from, "date_to": date_to},
        machine_names=_machine_name_map(),
    )
    return Response(
        content=blob,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename("shift_logs", "xlsx")}"'},
    )


@app.get("/admin/shifts/export.pdf")
async def admin_shifts_export_pdf(
    machine_id: Optional[str] = None,
    severity:   Optional[int] = None,
    shift:      Optional[str] = None,
    days:       Optional[int] = None,
    date_from:  Optional[str] = None,
    date_to:    Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    logs = _filter_shift_logs_for_export(machine_id, severity, shift, days, date_from, date_to)
    blob = exports.shift_logs_pdf(
        logs,
        filters={"machine_id": machine_id, "severity": severity, "shift": shift,
                 "days": days, "date_from": date_from, "date_to": date_to},
        machine_names=_machine_name_map(),
    )
    return Response(
        content=blob, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename("shift_logs", "pdf")}"'},
    )


@app.get("/admin/analytics/export.xlsx")
async def admin_analytics_export_xlsx(
    days:       Optional[int] = None,
    date_from:  Optional[str] = None,
    date_to:    Optional[str] = None,
    category:   Optional[str] = None,
    severity:   Optional[int] = None,
    shift:      Optional[str] = None,
    machine_id: Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    data = _compute_analytics(days, date_from, date_to, category, severity, shift, machine_id)
    blob = exports.analytics_xlsx(
        data,
        filters={"days": days, "date_from": date_from, "date_to": date_to,
                 "category": category, "severity": severity, "shift": shift, "machine_id": machine_id},
    )
    return Response(
        content=blob,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename("analytics", "xlsx")}"'},
    )


@app.get("/admin/analytics/export.pdf")
async def admin_analytics_export_pdf(
    days:       Optional[int] = None,
    date_from:  Optional[str] = None,
    date_to:    Optional[str] = None,
    category:   Optional[str] = None,
    severity:   Optional[int] = None,
    shift:      Optional[str] = None,
    machine_id: Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    data = _compute_analytics(days, date_from, date_to, category, severity, shift, machine_id)
    blob = exports.analytics_pdf(
        data,
        filters={"days": days, "date_from": date_from, "date_to": date_to,
                 "category": category, "severity": severity, "shift": shift, "machine_id": machine_id},
    )
    return Response(
        content=blob, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_safe_filename("analytics", "pdf")}"'},
    )


@app.post("/shifts/{log_id}/acknowledge")
async def worker_acknowledge_shift(log_id: int, request: Request):
    """Worker-facing: dismiss the handoff banner on the chat page.

    Same backing call as the admin variant — once acknowledged the row stays
    acknowledged regardless of who clicked. We keep the admin route separate
    so admin actions remain attributable in the audit log.
    """
    if not store.acknowledge_shift_log(log_id):
        raise APIError(404, "Shift log not found", "not_found")
    audit.append(
        "shift.acknowledge",
        actor="worker",
        target=str(log_id),
        ip=_caller_ip(request),
    )
    return {"ok": True}


@app.post("/admin/shifts/{log_id}/acknowledge")
async def admin_acknowledge_shift(
    log_id: int,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    if not store.acknowledge_shift_log(log_id):
        raise APIError(404, "Shift log not found", "not_found")
    audit.append(
        "shift.acknowledge",
        actor=admin_email,
        target=str(log_id),
        ip=_caller_ip(request),
    )
    return {"ok": True}


class VoidShiftPayload(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


@app.post("/admin/shifts/{log_id}/void")
async def admin_void_shift(
    log_id: int,
    payload: VoidShiftPayload,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    """Soft-delete a shift log (admin correcting a mistaken submission).

    The row stays in the table — voided logs are hidden from the handoff
    banner and shown dimmed with a VOID badge in the admin panel. The
    reason is required so the audit trail captures why.
    """
    if not store.void_shift_log(log_id, payload.reason.strip(), admin_email):
        raise APIError(404, "Shift log not found", "not_found")
    audit.append(
        "shift.void",
        actor=admin_email,
        target=str(log_id),
        ip=_caller_ip(request),
        details={"reason": payload.reason.strip()},
    )
    return {"ok": True}


# ── /admin/alerts ──────────────────────────────────────────────────────────


@app.get("/admin/alerts")
async def admin_list_alerts(admin_email: str = Depends(require_admin)):
    # Newest first — matches the UI rendering order. Also includes the
    # current snooze map so the panel can show "this machine is muted
    # until X" without a second roundtrip.
    return {
        "alerts": list(reversed(_alerts)),
        "threshold": ALERT_THRESHOLD,
        "snoozes": dict(_alert_snoozes),
        "dedup_seconds": ALERT_DEDUP_SECONDS,
    }


@app.delete("/admin/alerts")
async def admin_clear_alerts(admin_email: str = Depends(require_admin)):
    cleared = len(_alerts)
    _alerts.clear()
    return {"ok": True, "cleared": cleared}


@app.post("/admin/alerts/{alert_id}/acknowledge")
async def admin_acknowledge_alert(
    alert_id: str,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    """Mark a single alert as acknowledged. Keeps the row in history
    (unlike DELETE /admin/alerts which nukes everything) but flags it so
    the UI can dim it and surface a "handled" indicator.
    """
    for alert in _alerts:
        if alert.get("alert_id") == alert_id:
            alert["acknowledged_at"] = datetime.now(timezone.utc).isoformat()
            alert["acknowledged_by"] = admin_email
            audit.append(
                "alert.acknowledge",
                actor=admin_email,
                target=alert_id,
                ip=_caller_ip(request),
            )
            return {"ok": True}
    raise APIError(404, "Alert not found", "not_found")


class AlertSnoozePayload(BaseModel):
    machine_id: str
    # Snooze duration in minutes. Pass 0 to clear an existing snooze.
    minutes:    int = Field(..., ge=0, le=60 * 24)


@app.post("/admin/alerts/snooze")
async def admin_snooze_alerts(
    payload: AlertSnoozePayload,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    """Suppress alerts for a machine for N minutes. minutes=0 lifts an
    existing snooze immediately. Stored in-memory (P1 work to persist)."""
    if payload.minutes == 0:
        existing = _alert_snoozes.pop(payload.machine_id, None)
        if existing:
            audit.append(
                "alert.snooze_clear",
                actor=admin_email,
                target=payload.machine_id,
                ip=_caller_ip(request),
            )
        return {"ok": True, "snoozed_until": None}

    until = datetime.now(timezone.utc) + timedelta(minutes=payload.minutes)
    _alert_snoozes[payload.machine_id] = until.isoformat()
    audit.append(
        "alert.snooze_set",
        actor=admin_email,
        target=payload.machine_id,
        ip=_caller_ip(request),
        details={"minutes": payload.minutes, "until": until.isoformat()},
    )
    return {"ok": True, "snoozed_until": until.isoformat()}


# ── /admin/config ──────────────────────────────────────────────────────────
# Live-tunable runtime settings persisted in the app_config SQLite table.
# Today: alert threshold + dedup window. Designed so adding new knobs is a
# matter of extending the payload model and the load helper above.


class AppConfigPayload(BaseModel):
    alert_threshold:     Optional[int] = Field(None, ge=1, le=25)
    alert_dedup_seconds: Optional[int] = Field(None, ge=0, le=60 * 60 * 24)


@app.get("/admin/config")
async def admin_get_config(admin_email: str = Depends(require_admin)):
    """Return the values currently in effect (after env defaults + DB
    overrides have been merged). The frontend uses this to populate the
    Settings form without a second roundtrip."""
    return {
        "alert_threshold":     ALERT_THRESHOLD,
        "alert_dedup_seconds": ALERT_DEDUP_SECONDS,
        # Surface a couple of read-only environment-driven values so the
        # admin can sanity-check what's loaded without shelling onto the box.
        "admin_emails":        sorted(ADMIN_EMAILS),
        "allowed_domains":     sorted(ALLOWED_DOMAINS),
    }


@app.patch("/admin/config")
async def admin_patch_config(
    payload: AppConfigPayload,
    request: Request,
    admin_email: str = Depends(require_admin),
):
    """Write the supplied fields to app_config and reload module state so
    the change takes effect immediately. Survives restart."""
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        store.set_app_config(key, str(value))
    _load_runtime_config()
    audit.append(
        "config.patch",
        actor=admin_email,
        ip=_caller_ip(request),
        details=changes,
    )
    return await admin_get_config(admin_email=admin_email)


# ── analytics helpers ──────────────────────────────────────────────────────


def _compute_depreciation(machine_id: str, now: datetime) -> Optional[dict]:
    """Straight-line depreciation snapshot + 12-month trailing series for a machine."""
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
    """Poisson estimate from the last 7d of alert_fired events.

    P(at least one failure in next N days) = 1 - exp(-lambda * N), where
    lambda is the observed alert rate per day. Conflates "user asked about
    an error" with "machine actually failed" — fine for demo, not prod.
    """
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


def _compute_analytics(
    days:       Optional[int] = None,
    date_from:  Optional[str] = None,
    date_to:    Optional[str] = None,
    category:   Optional[str] = None,
    severity:   Optional[int] = None,
    shift:      Optional[str] = None,
    machine_id: Optional[str] = None,
) -> dict:
    """Shared aggregator for the /admin/analytics JSON and export endpoints."""
    from collections import Counter

    now = datetime.now(timezone.utc)

    # ── Build the time-window cutoffs once, outside the per-row loop. ──
    cutoff_start: Optional[datetime] = None
    cutoff_end:   Optional[datetime] = None
    if days and days > 0:
        cutoff_start = now - timedelta(days=days)
    else:
        # date_from / date_to are inclusive day boundaries in UTC. Tolerate
        # bad input by silently ignoring it rather than erroring.
        if date_from:
            try:
                cutoff_start = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if date_to:
            try:
                # End of the chosen day, so a same-day from/to matches that day.
                cutoff_end = (
                    datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
                    + timedelta(days=1)
                )
            except ValueError:
                pass

    sev_target = severity if severity in (1, 2, 3, 4, 5) else None
    shift_target = shift if shift in ("Morning", "Afternoon", "Night") else None
    category_target = category.strip() if category else None
    machine_target = machine_id.strip() if machine_id else None

    # Filter the source log up front so every aggregate below sees the same
    # window. Anything unset short-circuits true.
    def _passes(q: dict) -> bool:
        if cutoff_start or cutoff_end:
            try:
                asked = datetime.fromisoformat(q.get("asked_at", "").replace("Z", "+00:00"))
            except (AttributeError, ValueError):
                return False
            if cutoff_start and asked < cutoff_start:
                return False
            if cutoff_end and asked >= cutoff_end:
                return False
            if shift_target and _get_shift(asked) != shift_target:
                return False
        elif shift_target:
            # Shift filter still works without a date window — just compute
            # shift from asked_at when we have it.
            try:
                asked = datetime.fromisoformat(q.get("asked_at", "").replace("Z", "+00:00"))
            except (AttributeError, ValueError):
                return False
            if _get_shift(asked) != shift_target:
                return False
        if sev_target is not None and q.get("severity", 1) != sev_target:
            return False
        if category_target:
            mid = q.get("machine_id") or ""
            mcat = (_machine_metadata.get(mid) or {}).get("category")
            if mcat != category_target:
                return False
        if machine_target and (q.get("machine_id") or "") != machine_target:
            return False
        return True

    if (cutoff_start or cutoff_end or sev_target is not None
            or shift_target or category_target or machine_target):
        log_window = [q for q in _query_log if _passes(q)]
    else:
        log_window = _query_log

    total = len(log_window)
    alerts_fired = sum(1 for q in log_window if q.get("alert_fired"))
    # When the user has narrowed to one machine, the "active machines" KPI
    # should reflect that scope (1) rather than the global indexed count.
    # Otherwise count distinct machines that show up in the filtered window.
    if machine_target:
        machines_indexed = 1
    else:
        machines_indexed = (
            len({q.get("machine_id") for q in log_window if q.get("machine_id")})
            if (cutoff_start or cutoff_end or sev_target is not None
                or shift_target or category_target)
            else len({m["id"] for m in _list_machines_basic()})
        )

    # ── per-machine breakdown ────────────────────────────────────────────
    per_machine_acc: dict[str, dict] = {}
    for q in log_window:
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
            "machine_id":      mid,
            "display_name":    display_names.get(mid, mid.replace("_", " ").title()),
            "query_count":     d["query_count"],
            "alert_count":     d["alert_count"],
            "alert_rate_pct":  round(100 * d["alert_count"] / d["query_count"], 1) if d["query_count"] else 0.0,
            "avg_severity":    round(d["severity_sum"] / d["query_count"], 2) if d["query_count"] else 0.0,
            "most_asked_codes": d["code_counter"].most_common(3),
        })
    per_machine.sort(key=lambda x: x["query_count"], reverse=True)

    # ── global code frequency (top 15 across all machines) ───────────────
    code_acc: dict[tuple[str, str], dict] = {}
    for q in log_window:
        for code in q.get("codes", []):
            key = (code, q["machine_id"] or "unknown")
            d = code_acc.setdefault(key, {"code": code, "machine": key[1], "count": 0, "severity_sum": 0})
            d["count"] += 1
            d["severity_sum"] += q.get("severity", 1)
    code_frequency = sorted(code_acc.values(), key=lambda x: x["count"], reverse=True)[:15]
    for c in code_frequency:
        c["avg_severity"] = round(c["severity_sum"] / c["count"], 2) if c["count"] else 0.0
        del c["severity_sum"]

    # ── severity distribution (count per severity 1..5) ──────────────────
    sev_dist = {str(i): 0 for i in range(1, 6)}
    for q in log_window:
        sev = str(q.get("severity", 1))
        if sev in sev_dist:
            sev_dist[sev] += 1

    # ── last-24h activity, bucketed per hour ─────────────────────────────
    now = datetime.now(timezone.utc)
    buckets: dict[str, int] = {}
    for h in range(23, -1, -1):
        bucket_time = now - timedelta(hours=h)
        buckets[bucket_time.strftime("%H:00")] = 0
    cutoff = now - timedelta(hours=24)
    for q in _query_log:
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

    # ── top 10 most-asked verbatim questions ─────────────────────────────
    qtext = Counter()
    qmachine: dict[str, str] = {}
    for q in log_window:
        text = q.get("question", "").strip().lower()
        if text:
            qtext[text] += 1
            qmachine.setdefault(text, q["machine_id"] or "unknown")
    top_questions = [
        {"question": t, "count": c, "machine": qmachine.get(t, "unknown")}
        for t, c in qtext.most_common(10)
    ]

    # ── failure likelihood + depreciation (one entry per indexed machine) ─
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

    return {
        "totals": {
            "queries":         total,
            "alerts":          alerts_fired,
            "machines":        machines_indexed,
            "alert_rate_pct":  round(100 * alerts_fired / total, 2) if total else 0.0,
        },
        "per_machine":          per_machine,
        "code_frequency":       code_frequency,
        "severity_distribution": sev_dist,
        "queries_per_hour_24h": queries_per_hour_24h,
        "top_questions":        top_questions,
        "failure_likelihood":   failure_likelihood,
        "depreciation":         depreciation,
    }


@app.get("/admin/analytics")
async def admin_analytics(
    days:       Optional[int] = None,
    date_from:  Optional[str] = None,
    date_to:    Optional[str] = None,
    category:   Optional[str] = None,
    severity:   Optional[int] = None,
    shift:      Optional[str] = None,
    machine_id: Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    """Aggregate _query_log into the dashboard widgets, with optional filters.

    All filters compose (AND). `days` and `date_from`/`date_to` both narrow
    the time window — `days` wins if both are supplied. `shift` classifies
    asked_at via `_get_shift`. The hourly bars, failure-likelihood, and
    depreciation are inherently time-bound or per-asset, so they ignore
    these filters.
    """
    return _compute_analytics(days, date_from, date_to, category, severity, shift, machine_id)


# ── /admin/audit ───────────────────────────────────────────────────────────


@app.get("/admin/audit")
async def admin_audit(
    limit: int = 200,
    action_prefix: Optional[str] = None,
    admin_email: str = Depends(require_admin),
):
    """Return the most recent audit entries (newest first).

    Filterable by action prefix (e.g. `machine.` or `auth.`) for the UI.
    Backed by data/audit.jsonl — see src/audit.py.
    """
    if not 1 <= limit <= 1000:
        raise APIError(422, "limit must be 1–1000", "validation_error")
    return {"entries": audit.read(limit=limit, action_prefix=action_prefix)}


# ── /admin/_seed-analytics ─────────────────────────────────────────────────
# DEMO ONLY — injects synthetic _query_log entries directly (no LLM calls)
# so the analytics dashboard renders something meaningful out of the box.
# Spreads asked_at across the last 7 days so the Poisson failure-likelihood
# math has a non-zero lambda per machine.

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


@app.post("/admin/_seed-analytics")
async def admin_seed_analytics(
    count: int = 80,
    replace: bool = False,
    admin_email: str = Depends(require_admin),
):
    """Inject synthetic query-log entries so the analytics page renders.

    - count:   total entries to inject (default 80)
    - replace: if true, wipe _query_log first; otherwise append
    """
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

        # Spread asked_at uniformly across the last 7 days (in seconds).
        offset_sec = rng.uniform(0, 7 * 24 * 3600)
        asked_at = now - timedelta(seconds=offset_sec)

        machine_sig = _machine_metadata.get(mid, {}).get("significance", DEFAULT_SIGNIFICANCE)
        alert_score = severity * machine_sig
        alert_fired = alert_score >= ALERT_THRESHOLD

        codes = sorted({m.upper() for m in _QUERY_CODE_RE.findall(question)})
        machine_cat = (_machine_metadata.get(mid) or {}).get("category", "General")
        _query_log.append({
            "query_id":       f"q_seed_{uuid.uuid4().hex[:8]}",
            "machine_id":     mid,
            "question":       question,
            "severity":       severity,
            "alert_score":    alert_score,
            "alert_fired":    alert_fired,
            "codes":          codes,
            "answer_chars":   rng.randint(180, 420),
            "status":         "success",
            "asked_at":       asked_at.isoformat(),
            "workstation_ip": None,
            "domain":         machine_cat,
            "shift":          _get_shift(asked_at),
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
async def admin_test_alert(admin_email: str = Depends(require_admin)):
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
