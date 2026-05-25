"""SQLite-backed persistent store for shift logs and per-machine parameters.

Lives next to ``db.py`` (which wires Chroma). Uses stdlib ``sqlite3`` only —
no extra dependency, runs from a single file at ``STORE_PATH``. WAL mode is
enabled so concurrent reads/writes don't block each other on the edge box.

Data shapes
-----------
``machine_parameters`` rows store the admin-defined checklist for a machine.
Numeric readings and visual checks are kept as JSON blobs since they're
short, edited as a unit, and never queried by inner field.

``shift_logs`` rows are append-only submissions from EndShiftModal. The
worker sends raw readings; ``compute_anomalies`` derives the anomaly list
and severity at submit time, freezing the rule against the parameters that
were in effect — that way later edits to thresholds don't retroactively
change a historical log's verdict.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Iterable

STORE_PATH = os.getenv("STORE_PATH", "./smartfix.db")

# sqlite3 connections aren't safe to share across threads by default. FastAPI
# uses a thread pool for sync endpoints, so we keep one connection per thread.
_local = threading.local()


def _conn() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(STORE_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return conn


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Schema ─────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS machine_parameters (
    machine_id       TEXT PRIMARY KEY,
    numeric_readings TEXT NOT NULL DEFAULT '[]',
    visual_checks    TEXT NOT NULL DEFAULT '[]',
    updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shift_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id     TEXT NOT NULL,
    worker_label   TEXT,
    workstation_ip TEXT,
    readings       TEXT NOT NULL DEFAULT '{}',
    visual_checks  TEXT NOT NULL DEFAULT '{}',
    notes          TEXT,
    anomalies      TEXT NOT NULL DEFAULT '[]',
    severity       INTEGER NOT NULL DEFAULT 1,
    acknowledged   INTEGER NOT NULL DEFAULT 0,
    -- 'end' for end-of-shift logs (the original feature); 'start' for the
    -- pre-shift checklist. Default keeps pre-existing rows backward-compatible.
    phase          TEXT NOT NULL DEFAULT 'end',
    -- Voiding lets an admin mark a log as a mistake without deleting it
    -- (preserves the audit trail). When void_at is set, downstream
    -- consumers (handoff banner, anomaly aggregation) should skip the row.
    void_at        TEXT,
    void_reason    TEXT,
    voided_by      TEXT,
    created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_logs_machine_created
    ON shift_logs(machine_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_config (
    -- Free-form k/v store for admin-tunable runtime settings (alert
    -- threshold, dedup window, etc). Anything more structured than a
    -- scalar should be JSON-encoded; consumers decode at read time.
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


def init_store() -> None:
    """Create tables if missing and apply additive migrations. Idempotent."""
    conn = _conn()
    with conn:
        conn.executescript(_SCHEMA)
        # SQLite has no ADD COLUMN IF NOT EXISTS, so introspect and migrate.
        existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(shift_logs)")}
        if "phase" not in existing_cols:
            conn.execute("ALTER TABLE shift_logs ADD COLUMN phase TEXT NOT NULL DEFAULT 'end'")
        if "void_at" not in existing_cols:
            conn.execute("ALTER TABLE shift_logs ADD COLUMN void_at TEXT")
        if "void_reason" not in existing_cols:
            conn.execute("ALTER TABLE shift_logs ADD COLUMN void_reason TEXT")
        if "voided_by" not in existing_cols:
            conn.execute("ALTER TABLE shift_logs ADD COLUMN voided_by TEXT")


# ── machine_parameters ─────────────────────────────────────────────────────


def _row_to_params(row: sqlite3.Row | None, machine_id: str) -> dict:
    if row is None:
        return {
            "machine_id":       machine_id,
            "numeric_readings": [],
            "visual_checks":    [],
            "updated_at":       None,
        }
    return {
        "machine_id":       row["machine_id"],
        "numeric_readings": json.loads(row["numeric_readings"]),
        "visual_checks":    json.loads(row["visual_checks"]),
        "updated_at":       row["updated_at"],
    }


def get_machine_parameters(machine_id: str) -> dict:
    """Return the parameter spec for a machine, or an empty spec if none set."""
    row = _conn().execute(
        "SELECT * FROM machine_parameters WHERE machine_id = ?", (machine_id,)
    ).fetchone()
    return _row_to_params(row, machine_id)


def upsert_machine_parameters(
    machine_id: str,
    numeric_readings: list[dict],
    visual_checks: list[dict],
) -> dict:
    """Replace the parameter spec for a machine. Returns the stored row."""
    now = _now_iso()
    conn = _conn()
    with conn:
        conn.execute(
            """
            INSERT INTO machine_parameters (machine_id, numeric_readings, visual_checks, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(machine_id) DO UPDATE SET
                numeric_readings = excluded.numeric_readings,
                visual_checks    = excluded.visual_checks,
                updated_at       = excluded.updated_at
            """,
            (machine_id, json.dumps(numeric_readings), json.dumps(visual_checks), now),
        )
    return get_machine_parameters(machine_id)


def seed_machine_parameters(seeds: dict[str, dict]) -> None:
    """Insert default parameters for machines that have none yet.

    Existing rows are left untouched so admin edits aren't overwritten on
    server restart.
    """
    conn = _conn()
    with conn:
        for machine_id, spec in seeds.items():
            existing = conn.execute(
                "SELECT 1 FROM machine_parameters WHERE machine_id = ?", (machine_id,)
            ).fetchone()
            if existing:
                continue
            conn.execute(
                """
                INSERT INTO machine_parameters
                    (machine_id, numeric_readings, visual_checks, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    machine_id,
                    json.dumps(spec.get("numeric_readings", [])),
                    json.dumps(spec.get("visual_checks", [])),
                    _now_iso(),
                ),
            )


# ── shift_logs ─────────────────────────────────────────────────────────────


def _row_to_log(row: sqlite3.Row) -> dict:
    # `phase` may be absent in legacy rows that predate the migration; fall
    # back to 'end' rather than crashing on KeyError. Same defensive read
    # for the void columns.
    def safe_get(col, default=None):
        try:
            return row[col]
        except (IndexError, KeyError):
            return default
    phase = safe_get("phase") or "end"
    return {
        "id":             row["id"],
        "machine_id":     row["machine_id"],
        "worker_label":   row["worker_label"],
        "workstation_ip": row["workstation_ip"],
        "readings":       json.loads(row["readings"]),
        "visual_checks":  json.loads(row["visual_checks"]),
        "notes":          row["notes"],
        "anomalies":      json.loads(row["anomalies"]),
        "severity":       row["severity"],
        "acknowledged":   bool(row["acknowledged"]),
        "phase":          phase,
        "void_at":        safe_get("void_at"),
        "void_reason":    safe_get("void_reason"),
        "voided_by":      safe_get("voided_by"),
        "created_at":     row["created_at"],
    }


def compute_anomalies(
    parameters: dict,
    readings: dict[str, Any],
    visual_checks: dict[str, bool],
) -> tuple[list[dict], int]:
    """Apply the parameter spec to a submission and produce (anomalies, severity).

    Numeric readings out of [expected_min, expected_max] become anomalies.
    Visual checks whose value equals ``anomaly_when`` become anomalies.
    Severity is 1 (clean) + the count of anomalies, capped at 5.
    """
    anomalies: list[dict] = []

    for spec in parameters.get("numeric_readings", []):
        key = spec.get("key")
        if key is None or key not in readings:
            continue
        raw = readings[key]
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        lo = spec.get("expected_min")
        hi = spec.get("expected_max")
        unit = spec.get("unit") or ""
        label = spec.get("label") or key
        # Spell out the direction of the breach so the admin sees at a glance
        # whether a parameter is trending high or low — "out of range" alone
        # forced them to cross-reference the expected range every time.
        below = lo is not None and value < float(lo)
        above = hi is not None and value > float(hi)
        if below:
            anomalies.append({
                "title":  f"{label} below minimum",
                "detail": f"Reading {value}{unit} is lower than expected minimum of {lo}{unit}",
                "key":    key,
                "direction": "below",
            })
        elif above:
            anomalies.append({
                "title":  f"{label} above maximum",
                "detail": f"Reading {value}{unit} is higher than expected maximum of {hi}{unit}",
                "key":    key,
                "direction": "above",
            })

    for spec in parameters.get("visual_checks", []):
        key = spec.get("key")
        if key is None or key not in visual_checks:
            continue
        actual = bool(visual_checks[key])
        if actual == bool(spec.get("anomaly_when", True)):
            anomalies.append({
                "title": spec.get("label") or key,
                "detail": "Worker flagged this check",
                "key": key,
            })

    severity = min(5, 1 + len(anomalies))
    return anomalies, severity


def insert_shift_log(
    machine_id: str,
    readings: dict,
    visual_checks: dict,
    notes: str | None,
    worker_label: str | None,
    workstation_ip: str | None,
    anomalies: list[dict],
    severity: int,
    phase: str = "end",
) -> dict:
    if phase not in ("start", "end"):
        phase = "end"
    conn = _conn()
    with conn:
        cur = conn.execute(
            """
            INSERT INTO shift_logs
                (machine_id, worker_label, workstation_ip, readings, visual_checks,
                 notes, anomalies, severity, phase, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                machine_id,
                worker_label,
                workstation_ip,
                json.dumps(readings),
                json.dumps(visual_checks),
                notes,
                json.dumps(anomalies),
                severity,
                phase,
                _now_iso(),
            ),
        )
    row = conn.execute("SELECT * FROM shift_logs WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _row_to_log(row)


def list_shift_logs(
    machine_id: str | None = None,
    limit: int | None = None,
    phase: str | None = None,
) -> list[dict]:
    """Most-recent-first. Admin omits machine_id; worker passes it + small limit.

    Pass `phase='start'` or `'end'` to restrict to one half of the shift cycle.
    """
    sql = "SELECT * FROM shift_logs"
    where: list[str] = []
    args: list = []
    if machine_id:
        where.append("machine_id = ?")
        args.append(machine_id)
    if phase in ("start", "end"):
        where.append("phase = ?")
        args.append(phase)
    if where:
        sql += " WHERE " + " AND ".join(where)
    # id DESC breaks ties when two logs share a created_at second.
    sql += " ORDER BY created_at DESC, id DESC"
    if limit:
        sql += " LIMIT ?"
        args.append(limit)
    rows = _conn().execute(sql, args).fetchall()
    return [_row_to_log(r) for r in rows]


def acknowledge_shift_log(log_id: int) -> bool:
    conn = _conn()
    with conn:
        cur = conn.execute(
            "UPDATE shift_logs SET acknowledged = 1 WHERE id = ?", (log_id,)
        )
    return cur.rowcount > 0


def void_shift_log(log_id: int, reason: str, voided_by: str) -> bool:
    """Soft-delete a shift log. Row stays in the table for audit purposes
    but is excluded from `latest_shift_log` (so the handoff banner doesn't
    surface mistakes) and rendered with a VOID badge in the admin panel.
    """
    conn = _conn()
    with conn:
        cur = conn.execute(
            """
            UPDATE shift_logs
               SET void_at     = ?,
                   void_reason = ?,
                   voided_by   = ?
             WHERE id = ?
            """,
            (_now_iso(), reason, voided_by, log_id),
        )
    return cur.rowcount > 0


# ── app_config ─────────────────────────────────────────────────────────────


def get_app_config() -> dict[str, str]:
    """Return the whole config table as a {key: value} dict. Values are raw
    strings — callers cast as needed (int / json / etc)."""
    rows = _conn().execute("SELECT key, value FROM app_config").fetchall()
    return {r["key"]: r["value"] for r in rows}


def set_app_config(key: str, value: str) -> None:
    conn = _conn()
    with conn:
        conn.execute(
            """
            INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (key, value, _now_iso()),
        )


def latest_shift_log(machine_id: str, phase: str | None = "end") -> dict | None:
    """Latest log for a machine. Defaults to phase='end' since the handoff
    banner only cares about the prior shift's *end* log (a clean start-of-shift
    log on the new shift shouldn't bury the previous shift's anomalies).
    Pass phase=None to get the latest log of any kind. Voided logs are
    always excluded — they were marked as mistakes by an admin."""
    sql = "SELECT * FROM shift_logs WHERE machine_id = ? AND void_at IS NULL"
    args: list = [machine_id]
    if phase in ("start", "end"):
        sql += " AND phase = ?"
        args.append(phase)
    sql += " ORDER BY created_at DESC, id DESC LIMIT 1"
    row = _conn().execute(sql, args).fetchone()
    return _row_to_log(row) if row else None
