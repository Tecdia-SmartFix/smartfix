# SmartFix — Design Brief

**Audience:** Claude Design (or any design tool / designer)
**Purpose:** Comprehensive context for designing the SmartFix UI from scratch.
**Project:** SmartFix — AI troubleshooting assistant for Tecdia Cebu factory machinery.
**Brand:** Tecdia — industrial precision, calm confidence.

---

## 1. The product, in one paragraph

SmartFix is a small web app used by factory operators at Tecdia Cebu (Philippines) to ask plain-language questions about industrial machines and get cited answers from official manufacturer documentation. A worker on the production floor pulls out their phone, picks the machine they're working with, types something like *"What does error E-04 mean?"*, and gets back a precise answer with page numbers from the actual manual. Admins can upload new machine PDFs through a separate panel, and the system parses, chunks, embeds, and indexes them automatically.

The design goal: make complex documentation feel as simple as a text message, while looking like a tool that belongs on a serious factory floor — not a consumer chatbot.

---

## 2. Users

### 2.1 The Operator (factory worker)

- **Where they are:** Standing next to a noisy injection-molding machine on the production floor in Cebu. Hands are sometimes greasy, gloves on/off.
- **Device:** Personal phone, often Android, modest spec, on factory wifi.
- **Lighting:** Bright fluorescent shop lights — sometimes overhead glare, sometimes shadow.
- **Time pressure:** Something is broken or about to break. They want an answer in seconds, not minutes.
- **Reading comfort:** English is a second language for many. Prefers concise, structured answers over verbose paragraphs.
- **What they need from the UI:** Big tap targets. High contrast. Minimal text chrome. Source citations they can verify.

### 2.2 The Admin (process engineer or supervisor)

- **Where they are:** At a desk or laptop, occasionally on a tablet. Calmer environment than the floor.
- **Device:** Laptop primarily, occasionally tablet.
- **Frequency of use:** Rare — uploads a new machine maybe once a quarter.
- **What they need from the UI:** Clear understanding of what's already in the system, frictionless upload, honest feedback during the multi-minute parse/chunk/embed pipeline.
- **Trust:** They are responsible for what gets indexed. They need to see "what was added, by whom, when."

### 2.3 The development team (you)

- Based in India. Works against the API contract. Not a primary user, but referenced for authentication setup and admin oversight workflows.

---

## 3. Voice & character

| Attribute | Express it as | Avoid |
|---|---|---|
| **Calm authority** | Direct sentences, no filler. "Loading…" not "Hang tight while we get that for you!" | Cute mascots, exclamation marks, emoji soup. |
| **Industrial precision** | Sharp typography, generous gutters, semantic colour discipline. | Drop shadows everywhere, gradients on every surface. |
| **Quietly capable** | Subtle motion (120–200ms), thoughtful empty states. | Confetti animations, "wow" effects. |
| **Trustworthy** | Always show sources. Never hide errors. Never guess. | Hallucinated certainty. Hidden state. |

Think: **Linear meets Siemens documentation.** Not Slack, not ChatGPT.

---

## 4. Brand foundation

### 4.1 Logo

The Tecdia logo is the wordmark "TEC / DIA" in cyan-teal on white (saved at `design/tecdia-logo.png`). Use it:

- **Top-left of the app header** at all sizes. 32px tall on mobile, 40px on desktop.
- **Login screen, centered**, 56px tall, with the product name "SmartFix" set immediately below it in the brand cyan at 14px tracked letter-spacing.
- **Never** rotate, recolor, or place it on a background other than `--bg` or `--surface`.

The logo is the only piece of brand chrome that should ever appear at full-saturation cyan. Other UI brand elements use the cyan with restraint (primary buttons, links, focus rings).

### 4.2 Colour system

Full token reference: see [`design/tokens.css`](./tokens.css). High-level palette:

| Role | Light | Dark | Notes |
|---|---|---|---|
| Background | `#FFFFFF` | `#0A1218` | App canvas |
| Surface | `#FFFFFF` | `#131C24` | Cards, modals |
| Surface raised | `#FFFFFF` | `#1A2530` | Elevated panels |
| Border | `#E2E8F0` | `#1E293B` | Hairlines |
| Text primary | `#0F172A` | `#F1F5F9` | Body, headings |
| Text secondary | `#475569` | `#94A3B8` | Captions, metadata |
| **Brand cyan** | `#00ACC1` | `#22D3EE` | Tecdia primary; CTAs, links, focus rings |
| Brand subtle | `#E0F7FA` | rgba 12% | Background tint for selected states |
| Success | `#10B981` | `#34D399` | "Indexed", "Done" |
| Warning | `#F59E0B` | `#FBBF24` | "Token expiring", "PDF very large" |
| Error | `#DC2626` | `#F87171` | Failed states only |

**Discipline rule:** of every screen the user sees, ≥85% of the visual area should be neutral (white/slate). Brand cyan appears in roughly **1–3 places**: the logo, the primary CTA, and (sometimes) a focus ring or selected state. Never as a background fill of a full panel. Restraint is the brand.

### 4.3 Typography

- **Sans-serif:** Inter (free, web-safe). Weights 400 / 500 / 600. Letter-spacing `-0.01em` on display sizes.
- **Mono:** JetBrains Mono — used only for error codes (`E-04`), source page numbers, machine IDs, and raw JSON in admin views.
- **Scale:** 12 / 14 / 16 / 18 / 22 / 28 / 36px. Default body 16px. Default line-height 1.5.

### 4.4 Geometry

- **Radius:** 8px standard for cards/buttons/inputs, 12px for modals, 4px for badges, fully-rounded for chips and avatars.
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. No values outside this scale.
- **Shadows:** Used sparingly — `--shadow-sm` for resting cards, `--shadow-md` for floating menus/modals, `--shadow-lg` only for the upload-progress card while active.
- **Motion:** 120–320ms with a single easing curve. Buttons depress 1px on press. Modals fade + scale from 96% → 100%. Tokens streaming in chat fade in over 80ms each.

### 4.5 Theme switching

A small icon toggle (sun/moon) in the header. Persists in `localStorage`. Defaults to **system preference** on first load. No flicker on load — render the theme attribute server-side or before paint.

---

## 5. Screens

### 5.1 Login (worker + admin, same flow)

**Goal:** Get an email and send a magic link.

**Layout:** Centered card on a near-empty page. Logo above (56px). Product name below logo. Single email input. Single primary button "Send sign-in link". Below: small text "We'll email you a link valid for 15 minutes."

**States:**
- **Idle** — button enabled when email looks valid.
- **Submitting** — button shows spinner, input disabled.
- **Email sent** — card swaps to a success state: large check icon (cyan), heading "Check your email", body "We sent a sign-in link to operator@tecdia.com.ph. The link expires in 15 minutes." Secondary "Use a different email" link.
- **Error from query param `?login_error=expired`** — banner above the input: "That link expired. Request a new one below."

**Notes:** No password field anywhere in the app, ever. No "create account" — accounts are managed by IT.

---

### 5.2 Worker chat (the main screen)

**Goal:** Let an operator pick a machine and have a focused, cited Q&A.

**Layout (mobile first):**
- **Header (sticky top):** Logo (left), machine selector dropdown (center, prominent), profile/menu button (right).
- **Conversation area:** Vertically stacked turns. User turns right-aligned in a soft brand-tint bubble. Assistant turns left-aligned, plain text on surface (no bubble — it's documentation, not chat). Below each assistant turn: a row of source chips.
- **Composer (sticky bottom):** Single-line text area that grows to 4 lines, send button (cyan icon button), and a small "Start over" link that's hidden until there's at least one turn.

**Source chip:** A pill containing `📄 INJECTION_MOLDING_MACHINE.pdf · p. 5`. Tap → expands inline below the assistant turn to show the actual chunk text with the page number highlighted. Mono font for the page number.

**Empty state:** When no machine has been picked yet, the conversation area shows a centred prompt: "Pick a machine to get started." with the machine selector pulsing softly.

When a machine is picked but no question has been asked: "Ask anything about the {Machine Name}. Try: 'What does error E-04 mean?'"

**States during query:**
- **Sending** — user turn appears immediately, then a 3-dot pulsing indicator on the assistant side ("thinking…").
- **Streaming response** — tokens fade in as they arrive (if streaming is enabled later).
- **`status: success`** — answer rendered, source chips appear.
- **`status: not_found`** — gentle warning panel: "I couldn't find that in the {Machine Name} manual. Try rephrasing, or check that you've picked the right machine."
- **`status: error`** — red panel: "I'm having trouble reaching the assistant. Try again in a moment."

**Conversation memory:** Up to 4 prior turns are sent with each query. After 15 minutes of inactivity (tracked client-side), history is cleared automatically. A "Start over" button manually resets at any time.

---

### 5.3 Admin: machine list

**Goal:** See what's in the system. Add or remove machines.

**Layout (desktop):**
- **Header same as worker, plus a "Manage" tab** (or admin-only sidebar entry).
- **Page heading:** "Machines" (28px), with "+ Add machine" primary button on the right.
- **Table:** columns — Display Name · Machine ID (mono) · Chunks · Uploaded · Uploaded by · Actions. Rows have subtle hover state. Trash icon in actions column opens delete confirmation.
- **Empty state:** Centred illustration-light card with copy "No machines yet" and a single "+ Add your first machine" CTA.

**Mobile:** Each machine becomes a stacked card with the same fields.

---

### 5.4 Admin: add machine modal

**Goal:** Upload a PDF, watch it ingest, see when it's done.

**Layout:** Modal centred on the page, ~480px wide.

- **Header:** "Add machine" (22px) with close button (×).
- **Form:**
  - **Display name** — text input. Helper: "How operators will see it in the dropdown."
  - **Machine ID** — text input. Helper: "Uppercase letters, digits, underscores. Permanent."
  - **PDF file** — drag-and-drop area, dashed border, cyan when active. Shows filename + size after select.
- **Footer buttons:** "Cancel" (text) and "Add machine" (primary cyan).

**Submission states (replaces the form area):**
1. **Uploading** — progress bar showing file upload to server.
2. **Processing** — labeled stepper: `Parsing PDF → Chunking → Embedding → Indexing`. Current step has the cyan pulsing dot, completed steps have a check, future steps are slate. Caption shows server's `step` field ("Embedding 42 of 87 chunks").
3. **Done** — large green check, heading "Added". Body "INJECTION_MOLDING_MACHINE is ready for queries." Single "Done" button to close.
4. **Failed** — red X, heading "Couldn't add machine", body shows the server's error message verbatim. Buttons: "Try again" and "Cancel".

**Behaviour:** Backend returns a `job_id` immediately. Frontend polls `GET /admin/jobs/{job_id}` every 2 seconds while status ≠ `done` and ≠ `failed`. Total elapsed time visible to the admin in small text below the stepper.

---

### 5.5 Admin: delete confirmation

Modal centred. Heading "Remove {Display Name}?". Body "This will delete all 16 indexed chunks. Operators will no longer be able to query this machine." Buttons: "Cancel" and "Remove" (destructive — uses error red).

---

### 5.6 Global chrome

**Header (all authenticated screens):**
- Logo, left.
- Machine selector (worker only) or page title (admin), centre.
- Right cluster: dark-mode toggle (sun/moon icon, 18px), user menu trigger showing initials in a 32px circle.

**User menu (popover from initials):**
- Email address (text-secondary)
- Role badge ("Operator" or "Admin")
- "Settings" link (future)
- "Sign out"

**Dark-mode toggle:** Icon swap with a 200ms cross-fade. The whole UI re-themes via the `data-theme` attribute on `<html>`.

---

## 6. Component inventory

These are the building blocks. All components must support both themes.

| Component | Use | Notes |
|---|---|---|
| **Button — primary** | Submit, confirm, send | Solid cyan, white text, 8px radius, 12px vertical padding, 16px horizontal. Press depresses 1px. |
| **Button — secondary** | Cancel, dismiss | Transparent fill, slate-200 border, slate-900 text. |
| **Button — destructive** | Delete | Solid error-red, white text. Confirms via modal. |
| **Icon button** | Send, theme toggle, close | 36×36px, transparent, slate-500 icon, hover bg slate-100. |
| **Text input / textarea** | Email, question, machine name | 1px slate-300 border, 8px radius, focus ring 3px cyan-ring (`--accent-ring`), 16px text. |
| **Dropdown / select** | Machine selector | Same chrome as input, with caret. Open state shows surface-raised card with item list, selected item has cyan-subtle bg. |
| **Chip / pill** | Source citations, status | Pill, 4px radius, slate-100 bg, 12px text. Mono font for page numbers. |
| **Card** | Conversation turns, machine rows on mobile | White surface, subtle border, 8px radius. No shadow at rest. |
| **Modal** | Add machine, delete confirm | 12px radius, `--shadow-lg`, scrim 40% black, scale-fade in. |
| **Toast / banner** | Errors, info | Inline at top of page or bottom-right corner. Auto-dismisses success in 4s; errors stick until acknowledged. |
| **Stepper** | Upload progress | Horizontal on desktop, vertical on mobile. 4 stages (Parse, Chunk, Embed, Index). |
| **Skeleton loader** | While `/machines` or `/admin/machines` is loading | Soft pulsing rectangles in slate-100 (light) / slate-800 (dark). |
| **Avatar circle** | User menu | 32px, slate-200 bg, slate-700 text, monospace initials. |

---

## 7. Interaction patterns

### 7.1 Sending a question

1. User taps composer, focus ring appears (cyan).
2. Types question. Send button stays grey until ≥3 chars.
3. Tap send. Composer empties immediately. User turn appears in conversation. Pulsing dots appear.
4. Response arrives → dots replaced by answer (fade in 200ms). Source chips slide up from below the answer with a 60ms stagger.
5. Composer remains focused, ready for follow-up.

### 7.2 Switching machines mid-conversation

If the operator changes the machine selector while a conversation is active:
- A subtle inline divider appears in the conversation: "— Switched to {New Machine} —" in slate-500.
- Past turns remain visible (operators may scroll up to reference) but the new context is sent only with new questions.
- Behind the scenes: the frontend keeps history but adds a system-level note. (Backend doesn't need to know.)

### 7.3 Adding a machine

1. Admin clicks "+ Add machine" on the list page.
2. Modal opens with form. Drag-drop area accepts a single PDF up to 50 MB.
3. On submit, the form contents replace with the upload progress UI.
4. Polling ticks every 2s. The visible step label updates in real time.
5. On done, the modal stays open with success state. Closing it returns to the list — the new machine is highlighted briefly with a cyan-subtle background that fades over 1.5s.

### 7.4 Theme switching

Click toggle → 200ms colour transition across the whole app. No layout shift. Saved to `localStorage`. Honoured on next page load.

---

## 8. Accessibility & responsiveness

- **Contrast:** All body text meets WCAG AA against its background in both themes. Brand cyan on white passes for icons & large text but **not** for body text — never use cyan for paragraph copy.
- **Focus rings:** Always visible on keyboard navigation. 3px cyan ring with 2px offset.
- **Hit targets:** Minimum 44×44 px on touch. Send button, source chips, machine dropdown all meet this.
- **Reduced motion:** Respect `prefers-reduced-motion`. Disable the token-fade-in animation; switch to instant.
- **Screen readers:** Source chips announced as "Source: {document}, page {n}, expand". Conversation turns announced with "You said" / "Assistant said" prefixes.
- **Breakpoints:** Mobile ≤640px (operator default), tablet 641–1024px, desktop ≥1025px. The admin panel is desktop-first; the chat is mobile-first.

---

## 9. Reference data shapes

(Full contract: [`API_CONTRACT.md`](../API_CONTRACT.md))

```jsonc
// GET /machines → 200
{
  "machines": [
    { "id": "INJECTION_MOLDING_MACHINE", "display_name": "Injection Molding Machine", "chunk_count": 16 }
  ]
}

// POST /query → 200
{
  "status": "success",   // | "not_found" | "error"
  "answer": "Error E-04 indicates the clamping force has not reached…",
  "sources": [
    { "document": "INJECTION_MOLDING_MACHINE.pdf", "page": 5 },
    { "document": "INJECTION_MOLDING_MACHINE.pdf", "page": 6 }
  ]
}

// GET /admin/jobs/{job_id} → 200
{
  "status": "embedding",  // queued | parsing | chunking | embedding | indexing | done | failed
  "step": "Embedding 42 of 87 chunks",
  "progress": 0.48,
  "started_at": "2026-04-29T10:01:23Z",
  "finished_at": null,
  "error": null
}

// GET /auth/me → 200
{ "authenticated": true, "email": "alice@tecdia.com.ph", "role": "admin" }
```

---

## 10. Out of scope (don't design these yet)

- Multi-language UI — English only for v1, despite Cebu being multilingual.
- Per-user analytics dashboards.
- File annotation / highlight tools on PDF previews.
- Multi-site machine namespacing.
- Mobile-native app — the React PWA is the only client.

---

## 11. Prompt for Claude Design

Copy-paste-ready handoff:

> Design a web app called **SmartFix** for Tecdia Cebu (Philippines) — an AI-powered machine troubleshooting assistant for factory operators. The app has two surfaces: a **mobile-first chat interface** for floor operators, and a **desktop admin panel** for engineers who upload new machine PDFs.
>
> Use Tecdia's brand identity: **white canvas, cyan-teal primary (`#00ACC1` light / `#22D3EE` dark), deep slate structural neutrals**. Aesthetic: **industrial elegance** — Linear meets Siemens. Restraint is the brand: brand cyan appears in 1–3 places per screen, never as a panel fill. Logo at `design/tecdia-logo.png`.
>
> Full context, screen list, components, states, and interaction patterns in `design/DESIGN_BRIEF.md`. Token system in `design/tokens.css`. API data shapes in `API_CONTRACT.md`.
>
> Required screens: login (magic-link), worker chat with machine selector + cited answers + history, admin machine list, add-machine modal with multi-stage upload progress, delete confirmation, global header with logo + theme toggle + user menu.
>
> Required: full **dark mode** alongside light, all WCAG AA contrast, mobile-first chat, desktop-first admin.

---

*End of brief.*
