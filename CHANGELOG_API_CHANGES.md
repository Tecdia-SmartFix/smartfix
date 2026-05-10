# API Changes Log — Post-Meeting (2026-05-02)

This file tracks every change made to the codebase after the 2026-05-01 meeting with Kana Amaya and Mr. Shingo. Each section documents one feature with file paths, what was added/changed, and how to revert it.

**Global revert (nuclear option — undoes everything):**
```bash
git checkout src/api.py src/prompt_builder.py src/rag_pipeline.py
rm -f CHANGELOG_API_CHANGES.md
```

**Per-feature reverts:** see the Revert command under each section. Note that some features share files — reverting one of them via `git checkout` will undo all features in that file. To partially revert, use `git diff` to see the hunks and edit manually.

**File-level summary:**
| File | Touched by features |
|---|---|
| `src/api.py` | F1, F2, F3, F4, F5, F6 |
| `src/prompt_builder.py` | F4 |
| `src/rag_pipeline.py` | F4 |

---

## F1 — Worker domain session + role expansion in /auth/me

**Status:** ✅ implemented and tested

**What it does:**
- New endpoint `POST /auth/worker-session` accepts a domain ("Manufacturing", "Fabrication", etc.) and sets a `worker_session` cookie (12h TTL).
- `GET /auth/me` now returns `{authenticated, role, domain, email, session_expires_at}` — `domain` is populated for both worker and admin sessions.
- `POST /auth/logout` clears worker_session and stub_session cookies.
- In-memory `_worker_sessions` dict keyed by cookie value.

**Allowed domain values** (`ALLOWED_DOMAINS`): `General`, `Manufacturing`, `Additive Manufacturing`, `Fabrication`, `Automation`, `Heavy Machinery`, `All Access`.

**Files changed:** `src/api.py`

**Test:**
```bash
curl -c /tmp/c.txt -X POST http://127.0.0.1:8000/auth/worker-session \
  -H "Content-Type: application/json" -d '{"domain":"Manufacturing"}'
curl -b /tmp/c.txt http://127.0.0.1:8000/auth/me
```

**Revert command (also undoes F2–F6 since they share api.py):**
```bash
git checkout src/api.py
```

---

## F2 — Admin machine upload accepts new fields

**Status:** ✅ implemented

**What it does:**
- `POST /admin/machines` now accepts `description`, `category`, `significance` (1–5), and optional `icon` upload alongside the original `file`, `machine_id`, `display_name`.
- Validates `significance` is in [1, 5] — 422 otherwise.
- Stores fields in `_machine_metadata` keyed by `machine_id` for later retrieval.
- `DELETE /admin/machines/{id}` also clears the metadata entry.

**Files changed:** `src/api.py`

**Revert command:** `git checkout src/api.py`

---

## F3 — Machine listing returns category and significance

**Status:** ✅ implemented and tested

**What it does:**
- `_list_machines_basic()` reads from `_machine_metadata` and includes `description`, `category`, `significance`, `icon` on every machine entry.
- `GET /machines` and `GET /admin/machines` both return the new fields.
- The two real machines have seeded metadata in `_machine_metadata`:
  - INJECTION_MOLDING_MACHINE → Manufacturing, significance 5
  - LASER_CUTTING_MACHINE → Fabrication, significance 4
- Other machines (HP-500, IMM-750, LC-2040 leftover demo fixtures) default to General / significance 3.

**Files changed:** `src/api.py`

**Revert command:** `git checkout src/api.py`

---

## F4 — Severity scoring on /query

**Status:** ✅ implemented and tested

**What it does:**
- `prompt_builder.SYSTEM_PROMPT` extended with severity rubric and instructs LLM to append `SEVERITY: <1-5>` to its answer.
- `rag_pipeline.run_query()` parses the severity line out of the LLM response (regex `_SEVERITY_RE`), strips it from the user-facing answer, and returns `severity_level` in the result dict.
- `api.query()` computes `alert_score = severity_level × machine_significance` and includes both in the `QueryResponse`.
- If `alert_score >= ALERT_THRESHOLD` (default 12, env var `ALERT_THRESHOLD`) and status is success, automatically appends an alert record to `_alerts`.

**Severity rubric (in prompt_builder.py):**
- 1: informational, no action
- 2: minor adjustment, machine still operational
- 3: degraded performance, plan a fix soon
- 4: production impact, fix urgently
- 5: production halted or safety risk, immediate intervention

**Test result example:**
- E-04 query on INJECTION_MOLDING_MACHINE → severity 4, sig 5, score 20 → alert fired

**Files changed:** `src/api.py`, `src/prompt_builder.py`, `src/rag_pipeline.py`

**Revert command:**
```bash
git checkout src/api.py src/prompt_builder.py src/rag_pipeline.py
```

---

## F5 — Domain access control on /query

**Status:** ✅ implemented and tested

**What it does:**
- `/query` reads the `worker_session` cookie. If present and valid, checks the worker's domain against the queried machine's category.
- `_domain_allows_machine(domain, machine_id)` returns True if domain is `All Access` or matches the machine's category.
- Mismatch → `403 access_denied` with the error envelope `{detail, code}`.
- Admins, no-cookie callers (Postman, curl), and queries without a `machine_filter` are not gated.

**Test result:**
- Worker domain Manufacturing + INJECTION_MOLDING_MACHINE (Manufacturing) → 200 success
- Worker domain Manufacturing + LASER_CUTTING_MACHINE (Fabrication) → 403 access_denied

**Files changed:** `src/api.py`

**Revert command:** `git checkout src/api.py`

---

## F6 — Alerts endpoints

**Status:** ✅ implemented and tested

**What it does:**
- `GET /admin/alerts` → returns `{alerts: [...], threshold: 12}` newest-first.
- `DELETE /admin/alerts` → clears all alert history (matches "Clear All History" button in UI).
- `POST /admin/alerts/test` → injects a synthetic alert for setup verification.
- Alert record shape matches what the admin UI renders (alert_id, machine_id, score, severity_level, machine_significance, question, answer_excerpt, email_notified, notified_at).
- `email_notified` is currently a stub flag — actual email pipeline (Resend/SMTP) wired when Tecdia confirms domain.

**Files changed:** `src/api.py`

**Revert command:** `git checkout src/api.py`

---

## Decisions to confirm with Tecdia

- **Significance rubric** — admin sets 1–5 per machine at upload. Need Tecdia examples per level.
- **Severity rubric** — LLM-assessed 1–5. Default rubric in `prompt_builder.py`. Need Tecdia validation.
- **Alert threshold** — defaults to 12. Tunable via env `ALERT_THRESHOLD`.
- **Email service** — magic link + alert emails not yet wired. Awaiting Tecdia domain for Resend/SMTP.
- **Worker session length** — 12h. Matches a working day. Tecdia may want longer/shorter.

## Pending follow-ups (not done in this round)

- Real magic-link implementation for managers (currently stub at `/auth/request-link`, `/auth/verify`).
- Email send when alert fires (currently sets `email_notified: true` without actually emailing).
- Persist `_worker_sessions`, `_machine_metadata`, `_alerts` to disk/SQLite (currently in-memory — lost on restart).
- Update `API_CONTRACT.md` with all of the above.
- Update `postman/SmartFix.postman_collection.json` with new endpoints.
