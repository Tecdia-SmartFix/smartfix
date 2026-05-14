"""
Workstation → machine IP bindings.

Each shop-floor tablet has a fixed IP and is parked next to exactly one
machine. We pin that mapping in a JSON file so the backend can enforce
"this IP can only ask about this machine" at /query time, and the frontend
can skip the landing/machine-picker pages entirely.

Format (./data/workstations.json):
    {
      "192.168.1.10": "INJECTION_MOLDING_MACHINE",
      "192.168.1.11": "LASER_CUTTING_MACHINE",
      "127.0.0.1":    "INJECTION_MOLDING_MACHINE"
    }

A missing or malformed file is treated as "no bindings" so the dev server
never refuses to start; the worker UI falls back to today's domain +
machine selector flow when no binding exists for the caller IP.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

log = logging.getLogger("smartfix.workstations")

BINDINGS_FILE = Path("./data/workstations.json")

# Populated at startup via load_bindings(); also auto-refreshed on every
# get_binding() call when the file's mtime has changed since the last read.
# This lets you edit data/workstations.json live during a demo without
# restarting uvicorn — the next /query / /workstation request picks up the
# new map within milliseconds.
_bindings: dict[str, str] = {}
_bindings_mtime: float = 0.0


def _normalize_ip(ip: str) -> str:
    """Map IPv6 loopback / 'localhost' to the canonical 127.0.0.1.

    macOS + Safari/Chrome will sometimes hand us '::1' for same-host
    requests, while our bindings file uses '127.0.0.1'. Normalize on read
    so authors don't have to list both.
    """
    if ip in ("::1", "localhost"):
        return "127.0.0.1"
    return ip


def load_bindings() -> dict[str, str]:
    """Read bindings from disk into the module cache. Idempotent.

    Always re-reads from disk (vs. _maybe_reload which is mtime-gated). Use
    this for the initial startup load; use _maybe_reload() for per-request
    cheap freshness checks.
    """
    global _bindings, _bindings_mtime
    if not BINDINGS_FILE.exists():
        log.warning(
            "workstations: %s not found; running with no IP bindings "
            "(all callers fall through to the domain-selector flow)",
            BINDINGS_FILE,
        )
        _bindings = {}
        _bindings_mtime = 0.0
        return _bindings

    try:
        raw = json.loads(BINDINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        log.error("workstations: failed to parse %s (%s); keeping previous map", BINDINGS_FILE, exc)
        return _bindings

    if not isinstance(raw, dict):
        log.error("workstations: %s must be a JSON object, got %s; keeping previous map", BINDINGS_FILE, type(raw).__name__)
        return _bindings

    cleaned: dict[str, str] = {}
    for ip, machine_id in raw.items():
        if not isinstance(ip, str) or not isinstance(machine_id, str):
            log.warning("workstations: skipping non-string entry %r → %r", ip, machine_id)
            continue
        cleaned[_normalize_ip(ip.strip())] = machine_id.strip()

    _bindings = cleaned
    try:
        _bindings_mtime = BINDINGS_FILE.stat().st_mtime
    except OSError:
        _bindings_mtime = 0.0
    log.info("workstations: loaded %d binding(s) from %s (mtime=%s)",
             len(_bindings), BINDINGS_FILE, _bindings_mtime)
    return _bindings


def _maybe_reload() -> None:
    """Cheap freshness check: re-read the bindings file only if its mtime
    has moved since our last load. Called on every get_binding() so live
    edits to data/workstations.json take effect on the next request.

    Cost is one stat() syscall per check — microseconds, negligible.
    A delete (file gone) clears the bindings; restoration auto-loads them.
    """
    global _bindings_mtime
    try:
        current_mtime = BINDINGS_FILE.stat().st_mtime
    except FileNotFoundError:
        if _bindings:  # had bindings, file vanished → clear
            log.warning("workstations: %s removed; clearing bindings", BINDINGS_FILE)
            _bindings.clear()
            _bindings_mtime = 0.0
        return
    except OSError:
        return  # transient stat error — keep current cache

    if current_mtime > _bindings_mtime:
        log.info("workstations: detected change in %s (mtime %s → %s); reloading",
                 BINDINGS_FILE, _bindings_mtime, current_mtime)
        load_bindings()


def get_binding(ip: str) -> Optional[str]:
    """Return the machine_id bound to this IP, or None if unbound.

    Hot-reload: re-reads data/workstations.json if its mtime advanced since
    last load. No uvicorn restart needed when you edit the bindings live.
    """
    _maybe_reload()
    return _bindings.get(_normalize_ip(ip))


def all_bindings() -> dict[str, str]:
    """Snapshot of the current bindings table (for admin/debug endpoints)."""
    _maybe_reload()
    return dict(_bindings)
