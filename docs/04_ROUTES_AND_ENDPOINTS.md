# 04 — Routes & Endpoints

> One-line quick-reference table of every HTTP route. For detailed semantics see [`01_API_DOCS.md`](01_API_DOCS.md). For React-side routes see the bottom of this file.

## Backend HTTP routes (`src/api.py`)

### Public

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET`  | `/health` | Liveness probe | none |
| `POST` | `/query` | RAG question-answer | worker_session (optional) |
| `GET`  | `/machines` | Public machine list | none |
| `GET`  | `/machines/{machine_id}/parameters` | Parameter spec for EndShiftModal | none |
| `GET`  | `/machines/{machine_id}/shifts/recent` | Recent shift logs (used by HandoffBanner) | none |
| `POST` | `/shifts/log` | Submit a shift log | none (worker session optional) |
| `POST` | `/shifts/{log_id}/acknowledge` | Worker-side ack (dismiss handoff banner) | none |
| `GET`  | `/workstation` | IP → machine binding lookup | none |
| `GET`  | `/uploads/icons/{file}` | Static-serve admin-uploaded icons | none |

### Authentication

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/request-link` | Admin requests magic sign-in email |
| `GET`  | `/auth/verify?token=…` | Magic-link click target → 302 + cookie |
| `POST` | `/auth/verify` | Programmatic verify (same as GET, different content type) |
| `POST` | `/auth/worker-session` | Worker chooses a domain → cookie |
| `GET`  | `/auth/me` | Current session info (401 if anonymous) |
| `POST` | `/auth/logout` | Clear both session cookies |

### Admin — gated by `require_admin`

| Method | Path | Purpose |
|---|---|---|
| `POST`   | `/admin/machines` | Upload + ingest a new machine PDF |
| `GET`    | `/admin/machines` | Admin machine list (extra metadata) |
| `PATCH`  | `/admin/machines/{machine_id}` | Edit machine metadata in place |
| `DELETE` | `/admin/machines/{machine_id}` | Delete machine + chunks + PDF |
| `POST`   | `/admin/machines/{machine_id}/reingest` | Re-run ingestion on archived PDF |
| `PUT`    | `/admin/machines/{machine_id}/parameters` | Replace shift-log parameter spec |
| `GET`    | `/admin/jobs/{job_id}` | Poll ingestion job status |
| `GET`    | `/admin/shifts` | List shift logs (filter: machine_id, phase) |
| `POST`   | `/admin/shifts/{log_id}/acknowledge` | Admin-side ack (audited) |
| `POST`   | `/admin/shifts/{log_id}/void` | Soft-delete a shift log (with reason) |
| `GET`    | `/admin/alerts` | Alert list + threshold + snoozes + dedup window |
| `DELETE` | `/admin/alerts` | Clear all alerts |
| `POST`   | `/admin/alerts/{alert_id}/acknowledge` | Mark single alert as handled |
| `POST`   | `/admin/alerts/snooze` | Mute alerts for a machine for N minutes |
| `POST`   | `/admin/alerts/test` | Inject a synthetic alert for pipeline check |
| `GET`    | `/admin/config` | Read runtime-tunable config |
| `PATCH`  | `/admin/config` | Update + persist runtime config |
| `GET`    | `/admin/analytics` | Aggregated dashboard widgets |
| `GET`    | `/admin/audit` | Audit log entries (filter: prefix) |
| `POST`   | `/admin/_seed-analytics` | DEMO-ONLY synthetic query injection |

Total backend routes: **35** (8 public + 6 auth + 21 admin).

---

## Frontend SPA routes (`frontend/src/App.jsx`)

| Path | Component | Notes |
|---|---|---|
| `/` | `LandingPage` | Marketing landing + machine carousel |
| `/features` | `FeaturesPage` | Marketing feature page |
| `/integrations` | `IntegrationsPage` | Marketing integrations page |
| `/machines` | `MachinesPage` | Worker-facing machine list (links to `/chat`) |
| `/chat?machine=…` | `ChatPage` | Worker chat for a specific machine |
| `/contact` | `ContactPage` | Marketing contact page |
| `/admin/login` | `AdminLogin` | Magic-link sign-in form |
| `/admin` | `AdminDashboard` (gated by `ProtectedAdminRoute`) | All admin tabs |
| `/company-policy` | `CompanyPolicy` | Legal |
| `/privacy-policy` | `PrivacyPolicy` | Legal |
| `/cookie-policy` | `CookiePolicy` | Legal |
| `/data-notice` | `DataNotice` | Legal |
| `/legal-notice` | `LegalNotice` | Legal |

---

## Proxy mapping (dev vs prod)

The frontend never calls `localhost:8000` directly — same-origin requests are proxied to the backend.

### Dev (`frontend/vite.config.js`)

```
/auth          → :8000
/shifts        → :8000
/query         → :8000
/health        → :8000
/workstation   → :8000
/uploads       → :8000
/admin         → :8000  (SPA bypass for text/html → index.html)
/machines      → :8000  (SPA bypass for text/html → index.html)
```

### Prod (`frontend/nginx.conf`)

```nginx
location ~ ^/(auth|admin|machines|shifts|query|health|workstation|uploads)(/|$) {
    proxy_pass http://smartfix_backend;
    …
}
location / { try_files $uri $uri/ /index.html; }   # SPA fallback
```

Both configs match the same set of prefixes. **When you add a new backend prefix, update both files** — though the dev `/admin` rule is broad enough to cover any new `/admin/*` route automatically.
