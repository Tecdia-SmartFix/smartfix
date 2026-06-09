# 06 — Codebase Ownership

> Who owns which area of the code. Names, contacts, and module ownership for the SmartFix team.

## Team members

| Name | Primary role | Email | Phone |
|---|---|---|---|
| **Vijay V S** | Backend / integration / DevEx | vijay080504@gmail.com | +91 63833 38499 |
| **Eshita Kasera** | Frontend / UI design | eshita.kasera70@gmail.com | +91 78785 01935 |
| **Mohammed Ehtishaam T** (`ehtisham2005`) | Backend / RAG pipeline / analytics | ehti1233@gmail.com | +91 88257 76241 |
| **Govind Tiwari** | QA + testing — end-to-end flows, regression, release sign-off | govindtiwari1705@gmail.com | +91 96254 44565 |

---

## Module-level ownership

Read the table as: "if this directory or file breaks, who is the first person to ping?"

### Backend (`src/`)

| Path | Primary owner | Secondary | Notes |
|---|---|---|---|
| `src/api.py` | Vijay | ehtisham2005 | The whole HTTP surface lives here. Recent additions: admin gating, machine PATCH, shift voiding, alert ack/snooze, runtime config, custom icon serving. |
| `src/store.py` | Vijay | ehtisham2005 | SQLite schema, migrations, anomaly compute, shift-log CRUD. |
| `src/db.py` | Vijay | — | Chroma persistent client wiring. |
| `src/retriever.py` | ehtisham2005 | — | Embed-query + Chroma similarity search. |
| `src/rag_pipeline.py` | ehtisham2005 | Vijay | Glues retriever + prompt builder + LLM. |
| `src/llm_client.py` | ehtisham2005 | Vijay | Groq client + error mapping. |
| `src/prompt_builder.py` | ehtisham2005 | — | System + user prompt assembly. See [`supplementary/SYSTEM_PROMPT.md`](supplementary/SYSTEM_PROMPT.md). |
| `src/audit.py` | Vijay | — | Append-only JSONL audit log. |
| `src/mailer.py` | Vijay | — | Resend integration: magic-link + alert emails. |
| `src/workstations.py` | Vijay | — | IP → machine binding. |
| `src/ingestion/` | ehtisham2005 | — | PDF parse + chunk for Chroma. See [`supplementary/CHUNKING_STRATEGY.md`](supplementary/CHUNKING_STRATEGY.md). |

### Frontend (`frontend/src/`)

| Path | Primary owner | Secondary | Notes |
|---|---|---|---|
| `pages/AdminDashboard.jsx` | Vijay + Eshita | — | Largest file. Vijay owns the logic / wiring; Eshita owns the visual design + tab layouts. **Coordinate before large rewrites.** |
| `pages/AdminLogin.jsx` | Eshita | Vijay | Split-card sign-in. |
| `pages/LandingPage.jsx` | Eshita | Vijay | Marketing hero + scroll-hijack carousel. |
| `pages/ChatPage.jsx` | Eshita | Vijay | Worker chat + sidebar. |
| `pages/MachinesPage.jsx` | Eshita | Vijay | Worker-facing machine list. |
| `pages/FeaturesPage.jsx` / `IntegrationsPage.jsx` / `ContactPage.jsx` | Eshita | — | Marketing. |
| `pages/Cookie/Privacy/Data/LegalNotice` | Eshita | — | Legal stubs. |
| `components/MachineCard.jsx` | Eshita | Vijay | Expand-in-place card. |
| `components/MachineDetailModal.jsx` | Vijay | — | Admin parameter editor + metadata edit + re-ingest button. |
| `components/EndShiftModal.jsx` | Vijay | — | Phase-aware shift log form. |
| `components/HandoffBanner.jsx` | Vijay | — | Previous-shift anomaly banner. |
| `components/ShiftLogsPanel.jsx` | Vijay | Eshita | Admin shift logs table + void UI. |
| `components/Navbar.jsx` | Eshita | Vijay | Top nav + Start/End Shift buttons. |
| `components/Footer.jsx` | Eshita | — | Marketing footer. |
| `components/BrandMark.jsx` | Vijay | Eshita | Inline Tecdia SVG wordmark. |
| `components/MessageContent.jsx` | Eshita | Vijay | Design of message + LLM message renderer (markdown + sources)  |
| `components/StartDiagnosingModal.jsx` | Eshita | Vijay | Landing-page chat entry modal. |
| `context/AuthContext.jsx` / `AdminAuthContext.jsx` | Vijay | — | Session state. |
| `context/MachineContext.jsx` | Vijay | — | Machine list + CRUD wrappers. |
| `context/AlertContext.jsx` | Vijay | — | Alert list + ack + snooze. |
| `context/StartDiagnosingContext.jsx` | Eshita | — | Modal open state. |
| `hooks/useChatHistory.js` | Vijay | Eshita | Per-machine chat persistence (localStorage). |
| `hooks/useWorkstation.js` | Vijay | — | Workstation-binding fetch. |
| `api/apiClient.js` | Vijay | Eshita | Centralised `fetchApi` + `ApiError`. |
| `assets/` | Eshita | — | Images, logos, hero photos. |
| `index.css` | Eshita | Vijay | Global styles + light-mode theme overrides. |
| `tailwind.config.js` | Eshita | — | Tecdia color palette. |
| `vite.config.js` | Vijay | Eshita | Dev proxy. |

### Infra + deploy

| Path | Primary owner | Secondary |
|---|---|---|
| `Dockerfile` | Vijay | — |
| `frontend/Dockerfile` | Vijay | — |
| `frontend/nginx.conf` | Vijay | — |
| `docker-compose.yml` | Vijay | — |
| `scripts/backup_sqlite.sh` | Vijay | — |
| `scripts/build_index.py` | ehtisham2005 | — |
| `scripts/demo.py` | ehtisham2005 | — |
| `requirements.txt` | shared | — |
| `frontend/package.json` | shared | — |

### Docs (`docs/`)

| Path | Owner |
|---|---|
| `docs/0*.md` (this handover set) | the engineer doing the handover |
| `docs/supplementary/` | shared — last-touched-it owns it |

### QA + Testing

| Area | Primary owner | Notes |
|---|---|---|
| End-to-end worker flow (pre-shift → ask → answer → end-shift) | Govind Tiwari | Manual regression pass before each release. |
| End-to-end admin flow (login → machines → parameters → alerts → analytics → audit) | Govind Tiwari | Includes the dev-only `/auth/_dev/capture-session` backdoor verification. |
| Cross-browser smoke tests (Chrome, Safari, Firefox) | Govind Tiwari | Pay extra attention to the chat streaming + ChromaDB queries on Safari. |
| Bug reports + repro steps | Govind Tiwari | Filed against the primary owner of the affected module above. |
| Release sign-off | Govind Tiwari | Final approval before any merge to `main`. |

---

## Active work / known WIP

Updated as of 2026-05-27.

| Topic | Owner | Status |
|---|---|---|
| Custom machine icon upload (end-to-end) | Vijay | ✅ shipped |
| Pre-shift checklist + handoff banner | Vijay | ✅ shipped |
| Settings tab + runtime config | Vijay | ✅ shipped + form validation just added |
| Admin sign-in redesign | Vijay + Eshita | ✅ shipped |
| Shift classification (`_get_shift` + analytics filter) | ehtisham2005 | ✅ shipped |
| PDF drag-and-drop upload zone | ehtisham2005 | ✅ shipped |
| PDF file-type validation | ehtisham2005 | ✅ shipped |
| Marketing pages + landing carousel | Eshita | ✅ shipped |
| Logo work (Tecdia wordmark, chat logo, AdminLogin logo) | Eshita | ✅ shipped |
| Shift logs panel — switch off mock data | Vijay | ✅ just committed |

---

## Coding conventions

> When in doubt, match the existing file's style.

- **Backend**: PEP 8, type hints on public functions. Comments explain *why*, not *what*. Inline single-line comments preferred over multi-line docstrings unless the function is API-facing. `_private` underscore prefix for module-level mutable state.
- **Frontend**: JSX (not TS). Tailwind utility classes inline. Component file = single React function + the small helpers it needs. Hooks at the top, derived values next, handlers after, JSX last.
- **Commits**: imperative mood, descriptive body. Atomic — one logical change per commit so revert is clean. Group related WIP into a single commit when pushing.
- **Branches**: everyone works on `dev3`. Pull frequently. Stash before pulling if you have uncommitted work — see `git stash push -u`.

---

## When you're stuck

1. Read the relevant doc in `docs/`.
2. `git log --since="2 weeks ago" -- <file>` to see recent changes and authors.
3. Ping the primary owner from the table above.
4. Backend logic that touches multiple modules: Vijay first.
5. Anything visual / layout / brand: Eshita first.
6. RAG / ingestion / Groq behavior: Md Ehtishaam (`ehtisham2005`) first.
7. A bug you can't reproduce, or "is this expected?" — Govind Tiwari has the regression matrix.
