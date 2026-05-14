"""
seed_analytics.py — fire a mix of synthetic queries against the running
backend so the admin analytics dashboard has realistic data to render
during the demo.

Run from project root, with uvicorn already up:
    python3 -m scripts.seed_analytics

What it does:
  - Hits POST /query ~80 times across the 3 indexed machines.
  - Mixes verbatim error-code questions ("what is E-04") with
    semantic problem descriptions ("the press is leaking oil").
  - Spreads alerts across all severity levels so the donut chart looks alive.
  - Spaces requests with a small jitter so the per-hour-24h bucket gets
    populated for the current hour (most queries land in the same bucket;
    that's fine — the demo only needs ONE hour to look non-empty).

The script reuses Groq's 70b budget — at ~5 queries/min it'll take ~15
minutes to complete, or you can flip MODEL in src/llm_client.py back to
llama-3.1-8b-instant temporarily for a faster run.

Use --fast to skip the Groq calls entirely and inject raw entries
directly into _query_log via a debug endpoint (not yet implemented;
just hit /query as below for now).
"""
from __future__ import annotations

import argparse
import json
import random
import time
import sys
from pathlib import Path

import requests

API = "http://localhost:8000"
BINDINGS_FILE = Path("./data/workstations.json")

# Per-machine canned questions. Mix of:
#   - exact code lookups ("what is E-04")
#   - resolution questions ("how do I fix E-06")
#   - symptom descriptions ("the ejector is stuck")
#   - non-error informational queries ("what's the operating temperature")
SEEDS: dict[str, list[str]] = {
    "INJECTION_MOLDING_MACHINE": [
        "what is error E-01",
        "what does E-02 mean",
        "explain E-03 to me",
        "what is E-04",
        "how do I fix E-04",
        "what is E-05",
        "what is E-06",
        "how to resolve E-06",
        "what is E-07",
        "what is E-08",
        "the ejector is stuck and the mold cannot open",
        "the screw won't rotate, what should I do",
        "hydraulic oil temperature is too high, what to check",
        "barrel zone temperature is fluctuating",
        "cooling water flow has dropped, what's the cause",
        "clamping force is not reaching the setpoint",
        "what is the recommended barrel zone temperature",
        "what's the normal hydraulic pressure range",
        "how often should I service the machine",
        "what spare parts should I keep in stock",
        "the press is jammed mid-cycle, what's the procedure",
        "production has stopped, motor is overheating",
    ],
    "LASER_CUTTING_MACHINE": [
        "what is E-01",
        "what is E-02",
        "what is E-03",
        "explain E-04",
        "what's E-05",
        "what is E-06",
        "what does E-07 mean",
        "what is E-08",
        "how do I fix E-07",
        "the laser tube is overheating",
        "exhaust fan has stopped, is it safe to keep running",
        "air assist pressure dropped, what to check",
        "auto focus sensor is not detecting the material",
        "X-Y axis is reporting position error",
        "cooling water temperature high, what's the threshold",
        "the laser is cutting weak, what could be wrong",
        "what is the normal laser power output range",
        "what part number is the focus lens",
        "how do I align the laser optics",
        "what's the safety procedure for laser tube replacement",
    ],
    "FDM_X300_INDUSTRIAL_3D_PRINTER": [
        "what is ERR-01",
        "what is ERR-02",
        "what is ERR-03",
        "what is ERR-04",
        "explain ERR-05",
        "what does ERR-06 mean",
        "what is ERR-07",
        "how do I fix ERR-04",
        "the chamber is not reaching set temperature",
        "filament keeps running out mid-print",
        "the nozzle is clogged, what to do",
        "bed adhesion is failing on large prints",
        "the chamber heating system seems slow",
        "extruder is making clicking noises",
        "how do I level the bed properly",
        "what filament types does this printer support",
        "what is the recommended chamber temperature for PA12",
    ],
}

# Boost likelihood of high-severity questions so the alert pipeline + email
# notification widgets look healthy in the demo.
HIGH_SEVERITY_BOOSTS = [
    "production halted, the machine is unsafe",
    "fire risk detected, machine still running",
    "safety interlock bypassed by mistake",
    "operator was injured during the last cycle",
]


def fire_one(machine_id: str, question: str, *, with_history: bool = False) -> dict:
    history = []
    if with_history:
        # Synthesize a one-turn history so the LLM follows pronoun resolution.
        history = [
            {"role": "user", "content": "what is the previous error code"},
            {"role": "assistant", "content": "I described it above."},
        ]
    resp = requests.post(
        f"{API}/query",
        json={
            "question": question,
            "machine_filter": machine_id,
            "history": history,
        },
        timeout=60,
    )
    return resp.json()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-machine", type=int, default=20,
                    help="How many queries to fire per machine (default 20)")
    ap.add_argument("--delay", type=float, default=1.0,
                    help="Seconds between queries (rate-limit safety, default 1.0)")
    ap.add_argument("--seed", type=int, default=42,
                    help="Random seed for reproducibility")
    args = ap.parse_args()

    random.seed(args.seed)

    # Pre-flight: is the backend up?
    try:
        h = requests.get(f"{API}/health", timeout=3).json()
        print(f"✓ backend healthy: {h}")
    except Exception as e:
        print(f"✗ backend unreachable at {API}: {e}", file=sys.stderr)
        sys.exit(1)

    # Workstation binding for 127.0.0.1 would force every query to one
    # machine. Temporarily lift that binding so the seed queries actually
    # spread across all three machines. We restore it at the end.
    saved_binding_value = None
    if BINDINGS_FILE.exists():
        try:
            bindings = json.loads(BINDINGS_FILE.read_text())
            for loopback_key in ("127.0.0.1", "localhost", "::1"):
                if loopback_key in bindings:
                    saved_binding_value = (loopback_key, bindings.pop(loopback_key))
                    BINDINGS_FILE.write_text(json.dumps(bindings, indent=2))
                    print(f"✓ temporarily removed {loopback_key} → {saved_binding_value[1]} from workstations.json")
                    # Hot-reload kicks in within milliseconds — wait briefly
                    # to make absolutely sure the next /query reads the new map.
                    time.sleep(0.5)
                    break
        except Exception as e:
            print(f"⚠️ couldn't adjust workstations.json (continuing anyway): {e}")

    plan = []
    for mid, qs in SEEDS.items():
        pool = list(qs)
        for boost in HIGH_SEVERITY_BOOSTS:
            pool.append(boost)
        random.shuffle(pool)
        for q in pool[: args.per_machine]:
            plan.append((mid, q))
    random.shuffle(plan)

    print(f"\nFiring {len(plan)} queries (~{len(plan) * args.delay:.0f}s wall time)...")
    print(f"Tip: open http://localhost:5173/admin → Analytics tab while this runs.\n")

    ok = err = 0
    for i, (mid, q) in enumerate(plan, 1):
        try:
            r = fire_one(mid, q)
            sev = r.get("severity_level", "?")
            fired = "🚨" if r.get("alert_fired") else "  "
            status = r.get("status", "?")[:7]
            print(f"  [{i:3}/{len(plan)}] {fired} sev={sev} {status} {mid[:24]:24} '{q[:60]}'")
            if status == "error":
                err += 1
            else:
                ok += 1
        except Exception as e:
            print(f"  [{i:3}/{len(plan)}] ✗ {mid[:24]:24} '{q[:60]}' — {e}")
            err += 1
        time.sleep(args.delay)

    # Restore the loopback workstation binding we temporarily removed.
    if saved_binding_value:
        try:
            bindings = json.loads(BINDINGS_FILE.read_text()) if BINDINGS_FILE.exists() else {}
            bindings[saved_binding_value[0]] = saved_binding_value[1]
            BINDINGS_FILE.write_text(json.dumps(bindings, indent=2))
            print(f"✓ restored {saved_binding_value[0]} → {saved_binding_value[1]} in workstations.json")
        except Exception as e:
            print(f"⚠️ couldn't restore workstations.json — please re-add the line manually: {e}")

    print(f"\n✓ Done. {ok} ok, {err} errors.")
    print(f"Check the analytics:  curl -s {API}/admin/analytics | jq")


if __name__ == "__main__":
    main()
