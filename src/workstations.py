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

# Populated once at startup via load_bindings(). Module-level for cheap
# get_binding() reads from every /query request.
_bindings: dict[str, str] = {}


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
    """Read bindings from disk into the module cache. Idempotent."""
    global _bindings
    if not BINDINGS_FILE.exists():
        log.warning(
            "workstations: %s not found; running with no IP bindings "
            "(all callers fall through to the domain-selector flow)",
            BINDINGS_FILE,
        )
        _bindings = {}
        return _bindings

    try:
        raw = json.loads(BINDINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        log.error("workstations: failed to parse %s (%s); ignoring", BINDINGS_FILE, exc)
        _bindings = {}
        return _bindings

    if not isinstance(raw, dict):
        log.error("workstations: %s must be a JSON object, got %s; ignoring", BINDINGS_FILE, type(raw).__name__)
        _bindings = {}
        return _bindings

    cleaned: dict[str, str] = {}
    for ip, machine_id in raw.items():
        if not isinstance(ip, str) or not isinstance(machine_id, str):
            log.warning("workstations: skipping non-string entry %r → %r", ip, machine_id)
            continue
        cleaned[_normalize_ip(ip.strip())] = machine_id.strip()

    _bindings = cleaned
    log.info("workstations: loaded %d binding(s) from %s", len(_bindings), BINDINGS_FILE)
    return _bindings


def get_binding(ip: str) -> Optional[str]:
    """Return the machine_id bound to this IP, or None if unbound."""
    return _bindings.get(_normalize_ip(ip))


def all_bindings() -> dict[str, str]:
    """Snapshot of the current bindings table (for admin/debug endpoints)."""
    return dict(_bindings)
