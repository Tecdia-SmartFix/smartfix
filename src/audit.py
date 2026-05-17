"""
audit.py — append-only audit log for sensitive admin actions.

Persisted as JSONL at data/audit.jsonl so entries survive restarts and can be
tail-shipped to S3/Loki/Datadog without code changes. Thread-safe (writes hold
a process-local lock; cross-process safety is delegated to atomic write to
a single file on a single host — adequate while the backend is single-process,
revisited when state moves to Postgres).
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

AUDIT_PATH = Path("./data/audit.jsonl")
_write_lock = threading.Lock()


def append(
    action: str,
    *,
    actor: Optional[str] = None,
    target: Optional[str] = None,
    ip: Optional[str] = None,
    details: Optional[dict] = None,
    status: str = "success",
) -> None:
    """Record one audit event. Never raises — audit must not break a request."""
    try:
        entry = {
            "ts":      datetime.now(timezone.utc).isoformat(),
            "action":  action,
            "actor":   actor or "anonymous",
            "target":  target,
            "ip":      ip,
            "status":  status,
            "details": details or {},
        }
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(entry, ensure_ascii=False, default=str) + "\n"
        with _write_lock:
            with AUDIT_PATH.open("a", encoding="utf-8") as f:
                f.write(line)
    except Exception as exc:
        # Stay silent in the response path; surface to the server log for ops.
        print(f"[audit] failed to record {action!r}: {exc!r}", flush=True)


def read(limit: int = 200, action_prefix: Optional[str] = None) -> list[dict]:
    """Return the most recent entries (newest first). Filtered by action prefix if given."""
    if not AUDIT_PATH.exists():
        return []
    try:
        with AUDIT_PATH.open("r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as exc:
        print(f"[audit] failed to read log: {exc!r}", flush=True)
        return []

    out: list[dict] = []
    # Walk from newest to oldest; cheaper than parsing everything when limit is small.
    for raw in reversed(lines):
        raw = raw.strip()
        if not raw:
            continue
        try:
            entry = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if action_prefix and not entry.get("action", "").startswith(action_prefix):
            continue
        out.append(entry)
        if len(out) >= limit:
            break
    return out
