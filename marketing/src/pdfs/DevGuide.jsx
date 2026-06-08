import {
  Cpu,
  Database,
  Sparkles,
  Server,
  Workflow,
  PackageOpen,
  BookOpen,
  Terminal,
  Boxes,
  Send,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  Globe,
  Code2,
  ShieldOff,
  TerminalSquare,
  AppWindow,
} from 'lucide-react';
import PdfPage from './PdfPage.jsx';
import Cover from './Cover.jsx';
import Annotated, { ArrowPin } from './Annotated.jsx';
import Callout from '../components/Callout.jsx';
import CodeBlock from '../components/CodeBlock.jsx';
import StepNumber from '../components/StepNumber.jsx';
import KeyCap from '../components/KeyCap.jsx';
import chatWithAnswer from '../../assets/screenshots/06_chat_with_answer.png';
import landingShot from '../../assets/screenshots/01_landing.png';

const TOTAL = 7;

const QueryFlowDiagram = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr) auto',
      gap: 10,
      alignItems: 'center',
      padding: '18px',
      background: 'linear-gradient(135deg, #0b1018 0%, #131a26 100%)',
      borderRadius: 16,
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    }}
  >
    {[
      { icon: Send, label: 'POST /query', tone: '#7dd3fc' },
      { icon: Cpu, label: 'embed', tone: '#a78bfa' },
      { icon: Database, label: 'ChromaDB', tone: '#86efac' },
      { icon: Sparkles, label: 'LLM', tone: '#fcd34d' },
      { icon: Workflow, label: 'response', tone: '#f472b6' },
    ].map(({ icon: Icon, label, tone }, i) => (
      <div
        key={label}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '14px 8px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${tone}40`,
          borderRadius: 12,
        }}
      >
        <Icon size={22} color={tone} strokeWidth={2} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4 }}>
          {label}
        </span>
      </div>
    ))}
    <div
      style={{
        gridColumn: '6',
        padding: '14px 12px',
        background: 'rgba(43,140,255,0.15)',
        border: '1px solid #2b8cff',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#7dd3fc' }}>
        SEV
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
        1–5
      </div>
    </div>
  </div>
);

const StackPill = ({ icon: Icon, name, version, blurb }) => (
  <div className="pdf-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'rgba(43,140,255,0.12)',
          color: '#2b8cff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={17} strokeWidth={2.2} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="pdf-card__title">{name}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#2b8cff' }}>
          {version}
        </span>
      </div>
    </div>
    <p className="pdf-card__body">{blurb}</p>
  </div>
);

const Check = ({ title, hint, mono }) => (
  <div className="pdf-checklist__item">
    <span className="pdf-checklist__box" />
    <div style={{ flex: 1 }}>
      <div className="pdf-checklist__title">{title}</div>
      <div className="pdf-checklist__hint">
        {hint}
        {mono && (
          <>
            {' '}
            <span className="pdf-mono-inline">{mono}</span>
          </>
        )}
      </div>
    </div>
  </div>
);

export default function DevGuide() {
  return (
    <>
      {/* ───────────── PAGE 1 — COVER ───────────── */}
      <Cover
        eyebrow="Developer Guide"
        title="From zero to a running"
        titleAccent="diagnostics pipeline."
        subtitle="A 15-minute path from a clean machine to a working SmartFix RAG stack — backend, vector index, frontend, Postman, and the documentation map."
        team={['Vijay V S', 'Md Ehtishaam', 'Eshita Kasera', 'Govind Tiwari']}
        meta={[
          { label: 'Version', value: 'v0.9 · Pitch' },
          { label: 'Audience', value: 'Engineering' },
          { label: 'Read time', value: '15 min' },
        ]}
      />

      {/* ───────────── PAGE 2 — WHAT IT IS ───────────── */}
      <PdfPage section="What SmartFix is" pageNumber={2} totalPages={TOTAL}>
        <span className="pdf-eyebrow">
          <Sparkles size={11} /> 01 · Overview
        </span>
        <h1 className="pdf-title">A RAG pipeline for the shop floor.</h1>
        <p className="pdf-subtitle">
          Workers describe a symptom in plain English. SmartFix retrieves the
          relevant pages from indexed machine manuals, lets an LLM explain what's
          happening, and fires a severity-weighted alert to managers when the
          issue is critical.
        </p>

        <div className="pdf-divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 className="pdf-h3" style={{ marginBottom: 4 }}>
            The query flow
          </h3>
          <QueryFlowDiagram />
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>
            <span className="pdf-mono-inline">POST /query</span> embeds the
            question, retrieves top-K chunks from ChromaDB, prompts the LLM with
            the last 8 history turns, and returns the answer with a severity
            score appended and parsed out server-side.
          </p>
        </div>

        <h3 className="pdf-h3">Stack</h3>
        <div className="pdf-grid-3">
          <StackPill
            icon={Server}
            name="FastAPI"
            version="0.111+"
            blurb="Single-file app at src/api.py, uvicorn on :8000."
          />
          <StackPill
            icon={Database}
            name="ChromaDB"
            version="local"
            blurb="Persistent vector store at ./chroma_db."
          />
          <StackPill
            icon={Cpu}
            name="MiniLM-L6"
            version="sentence-transformers"
            blurb="Embedding model for query + chunk vectors."
          />
          <StackPill
            icon={Sparkles}
            name="Groq"
            version="llama-3.3-70b"
            blurb="LLM provider. temp 0.1, max_tokens 512."
          />
          <StackPill
            icon={Boxes}
            name="React 19 + Vite"
            version="frontend/"
            blurb="Tailwind 3.4, framer-motion, lucide-react."
          />
          <StackPill
            icon={PackageOpen}
            name="Pydantic v2"
            version="contracts"
            blurb="Request/response schemas + error envelope."
          />
        </div>
      </PdfPage>

      {/* ───────────── PAGE 3 — PREREQUISITES ───────────── */}
      <PdfPage section="Prerequisites" pageNumber={3} totalPages={TOTAL}>
        <span className="pdf-eyebrow">
          <CheckCircle2 size={11} /> 02 · Before you start
        </span>
        <h1 className="pdf-title">Three things on your machine.</h1>
        <p className="pdf-subtitle">
          Tick each before continuing. If any are missing the rest of the guide
          will stall in confusing ways.
        </p>

        <div className="pdf-divider" />

        <div className="pdf-checklist">
          <Check
            title="Python 3.10 or newer"
            hint="Check with"
            mono="python3 --version"
          />
          <Check
            title="Node.js 18 or newer"
            hint="Check with"
            mono="node --version"
          />
          <Check
            title="A Groq API key"
            hint="Create one at console.groq.com — free tier is enough for development."
          />
          <Check
            title="The smartfix repository"
            hint="Clone or pull the latest"
            mono="dev"
          />
        </div>

        <Callout tone="hero" title="Why Groq?" animated={false}>
          Sub-second token streams on the 70B Llama model. The pitch demo is a
          live answer — anything slower than this breaks the moment.
        </Callout>

        <div className="pdf-card">
          <span className="pdf-card__label">
            <KeyRound size={11} style={{ marginRight: 4, verticalAlign: -2 }} />
            Get your Groq key
          </span>
          <p className="pdf-card__body">
            console.groq.com → sign in → <strong>API Keys</strong> → Create
            secret. Copy the <span className="pdf-mono-inline">gsk_…</span> string
            and keep it for the next step.
          </p>
        </div>
      </PdfPage>

      {/* ───────────── PAGE 4 — TOOLING + QUIRKS ───────────── */}
      <PdfPage section="Tooling + quirks" pageNumber={4} totalPages={TOTAL}>
        <span className="pdf-eyebrow">
          <AppWindow size={11} /> 02b · Tooling
        </span>
        <h1 className="pdf-title">A few non-obvious bits.</h1>
        <p className="pdf-subtitle">
          The things that aren't dependencies but will bite you 30 minutes in
          if you don't know about them upfront.
        </p>

        <div className="pdf-divider" />

        <div className="pdf-grid-2">
          <div className="pdf-card">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#2b8cff',
                fontFamily: 'Inter, sans-serif',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              <Code2 size={13} strokeWidth={2.2} /> Bring your own
            </span>
            <span className="pdf-card__title">An IDE you like</span>
            <p className="pdf-card__body">
              VS Code, Cursor, Zed, JetBrains, Vim — anything that opens{' '}
              <span className="pdf-mono-inline">.py</span> and{' '}
              <span className="pdf-mono-inline">.jsx</span> is fine. The repo
              has no IDE-specific config beyond <span className="pdf-mono-inline">.editorconfig</span>.
            </p>
          </div>
          <div className="pdf-card">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#ef4444',
                fontFamily: 'Inter, sans-serif',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              <ShieldOff size={13} strokeWidth={2.2} /> Disable for localhost
            </span>
            <span className="pdf-card__title">Browser without ad blockers</span>
            <p className="pdf-card__body">
              uBlock / AdBlock / EasyList match any URL containing{' '}
              <span className="pdf-mono-inline">cookie</span> and silently block
              the module fetch — the React tree crashes on mount. Use an incognito
              window or whitelist <span className="pdf-mono-inline">localhost:5173</span>.
            </p>
          </div>
          <div className="pdf-card">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#10b9d2',
                fontFamily: 'Inter, sans-serif',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              <TerminalSquare size={13} strokeWidth={2.2} /> Two-shell life
            </span>
            <span className="pdf-card__title">Run backend + frontend side-by-side</span>
            <p className="pdf-card__body">
              tmux, your IDE's split terminal, iTerm panes — pick your weapon.
              uvicorn on one side, vite on the other; the API stays at{' '}
              <span className="pdf-mono-inline">:8000</span>, the UI at{' '}
              <span className="pdf-mono-inline">:5173</span>.
            </p>
          </div>
          <div className="pdf-card">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#fb923c',
                fontFamily: 'Inter, sans-serif',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              <Database size={13} strokeWidth={2.2} /> Optional
            </span>
            <span className="pdf-card__title">SQLite browser</span>
            <p className="pdf-card__body">
              SmartFix persists shift logs and audit events into a local{' '}
              <span className="pdf-mono-inline">smartfix.db</span>. DB Browser
              for SQLite or DBeaver is handy when something looks wrong on the
              dashboard but you can't tell why from the UI.
            </p>
          </div>
        </div>

        <Callout tone="warn" title="The cookie/EasyList footgun" animated={false}>
          The repo's <span className="pdf-mono-inline">LegalNotice.jsx</span> is intentionally
          named without the substring "cookie" because EasyList blocks file fetches
          that contain it. If a contributor renames it back to{' '}
          <span className="pdf-mono-inline">CookiePolicy.jsx</span>, the frontend will
          go blank for every adblocker user on localhost. Don't.
        </Callout>

        <Callout tone="tip" title="Optional but nice" animated={false}>
          A REST client (Postman / Insomnia / Bruno) for hitting{' '}
          <span className="pdf-mono-inline">/query</span> and the admin routes
          directly. The repo ships a Postman collection — covered on the last page.
        </Callout>
      </PdfPage>

      {/* ───────────── PAGE 5 — BACKEND ───────────── */}
      <PdfPage section="Backend setup" pageNumber={5} totalPages={TOTAL}>
        <span className="pdf-eyebrow">
          <Server size={11} /> 03 · Backend
        </span>
        <h1 className="pdf-title">Bring the FastAPI service up.</h1>

        <div className="pdf-divider" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StepNumber n={1} animated={false} size={38} />
          <div style={{ flex: 1 }}>
            <h3 className="pdf-h3">Create the virtualenv and install deps</h3>
            <p className="pdf-text" style={{ fontSize: 12.5 }}>
              Always run from the project root so relative paths resolve.
            </p>
          </div>
        </div>
        <div className="pdf-grid-2">
          <div>
            <div className="pdf-os-label">macOS / Linux</div>
            <CodeBlock
              lines={[
                'python3 -m venv .venv',
                'source .venv/bin/activate',
                'pip install -r requirements.txt',
              ]}
              showHeader={false}
            />
          </div>
          <div>
            <div className="pdf-os-label">Windows (PowerShell)</div>
            <CodeBlock
              lines={[
                'python -m venv .venv',
                '.venv\\Scripts\\Activate.ps1',
                'pip install -r requirements.txt',
              ]}
              showHeader={false}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StepNumber n={2} animated={false} size={38} />
          <div style={{ flex: 1 }}>
            <h3 className="pdf-h3">Drop in the Groq key</h3>
          </div>
        </div>
        <div className="pdf-grid-2">
          <div>
            <div className="pdf-os-label">macOS / Linux</div>
            <CodeBlock
              lines={[
                'cp .env.example .env',
                '# edit .env and paste GROQ_API_KEY=gsk_...',
              ]}
              showHeader={false}
            />
          </div>
          <div>
            <div className="pdf-os-label">Windows (PowerShell)</div>
            <CodeBlock
              lines={[
                'copy .env.example .env',
                '# edit .env and paste GROQ_API_KEY=gsk_...',
              ]}
              showHeader={false}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StepNumber n={3} animated={false} size={38} />
          <div style={{ flex: 1 }}>
            <h3 className="pdf-h3">Build the vector index</h3>
            <p className="pdf-text" style={{ fontSize: 12.5 }}>
              Reads <span className="pdf-mono-inline">./data/processed/*.json</span> chunks
              and writes embeddings to <span className="pdf-mono-inline">./chroma_db</span>.
            </p>
          </div>
        </div>
        <div className="pdf-grid-2">
          <div>
            <div className="pdf-os-label">macOS / Linux</div>
            <CodeBlock lines={['python3 -m scripts.build_index']} showHeader={false} />
          </div>
          <div>
            <div className="pdf-os-label">Windows (PowerShell)</div>
            <CodeBlock lines={['python -m scripts.build_index']} showHeader={false} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StepNumber n={4} animated={false} size={38} />
          <div style={{ flex: 1 }}>
            <h3 className="pdf-h3">Start the API</h3>
          </div>
        </div>
        <div className="pdf-grid-2">
          <div>
            <div className="pdf-os-label">macOS / Linux</div>
            <CodeBlock lines={['python3 -m uvicorn src.api:app --reload --port 8000']} showHeader={false} />
          </div>
          <div>
            <div className="pdf-os-label">Windows (PowerShell)</div>
            <CodeBlock lines={['python -m uvicorn src.api:app --reload --port 8000']} showHeader={false} />
          </div>
        </div>

        <Callout tone="success" title="API is live" animated={false}>
          Swagger UI at <span className="pdf-mono-inline">localhost:8000/docs</span> ·
          health check at <span className="pdf-mono-inline">/health</span>.
        </Callout>
      </PdfPage>

      {/* ───────────── PAGE 6 — FRONTEND + TRY IT ───────────── */}
      <PdfPage section="Frontend + first query" pageNumber={6} totalPages={TOTAL}>
        <span className="pdf-eyebrow">
          <Boxes size={11} /> 04 · Frontend
        </span>
        <h1 className="pdf-title">Boot the React app and ask something.</h1>

        <div className="pdf-divider" />

        <div className="pdf-grid-2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StepNumber n={1} animated={false} size={34} />
              <h3 className="pdf-h3">Install + start</h3>
            </div>
            <CodeBlock
              lines={['cd frontend', 'npm install', 'npm run dev']}
              showHeader={false}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StepNumber n={2} animated={false} size={34} />
              <h3 className="pdf-h3">Open the worker view</h3>
            </div>
            <p className="pdf-text" style={{ fontSize: 12.5 }}>
              <span className="pdf-mono-inline">http://localhost:5173</span> →
              pick a domain → choose a machine → ask any IMM-750 error code
              and watch the answer stream in with sources.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StepNumber n={3} animated={false} size={34} />
              <h3 className="pdf-h3">Admin view</h3>
            </div>
            <p className="pdf-text" style={{ fontSize: 12.5 }}>
              <span className="pdf-mono-inline">/admin</span> — the magic-link
              flow is gated by <span className="pdf-mono-inline">ADMIN_EMAILS</span>.
            </p>
          </div>

          <Annotated src={chatWithAnswer} alt="Chat answer">
            <ArrowPin
              n={1}
              from={{ x: 30, y: 10 }}
              to={{ x: 12, y: 28 }}
              label="Sidebar history"
              delay={0}
            />
            <ArrowPin
              n={2}
              from={{ x: 64, y: 22 }}
              to={{ x: 62, y: 58 }}
              label="Answer + sources"
              tone="cyan"
              delay={0.05}
            />
            <ArrowPin
              n={3}
              from={{ x: 52, y: 86 }}
              to={{ x: 52, y: 94 }}
              label="Type here"
              delay={0.1}
            />
          </Annotated>
        </div>

        <Callout tone="tip" title="Tip · keyboard" animated={false}>
          Use <KeyCap>Enter</KeyCap> to send and <KeyCap>Shift</KeyCap>{' '}
          + <KeyCap>Enter</KeyCap> for a newline in the query box.
        </Callout>
      </PdfPage>

      {/* ───────────── PAGE 7 — POSTMAN + DOCS ───────────── */}
      <PdfPage section="Postman + documentation" pageNumber={7} totalPages={TOTAL}>
        <span className="pdf-eyebrow">
          <BookOpen size={11} /> 05 · Going deeper
        </span>
        <h1 className="pdf-title">Test the contract. Find the docs.</h1>

        <div className="pdf-divider" />

        <div>
          <h3 className="pdf-h3" style={{ marginBottom: 10 }}>
            Postman in three steps
          </h3>
          <div className="pdf-grid-3">
            <div className="pdf-card">
              <StepNumber n={1} animated={false} size={28} />
              <span className="pdf-card__title">Import the collection</span>
              <p className="pdf-card__body">
                <span className="pdf-mono-inline">
                  postman/SmartFix.postman_collection.json
                </span>{' '}
                — covers every endpoint in demo order.
              </p>
            </div>
            <div className="pdf-card">
              <StepNumber n={2} animated={false} size={28} tone="cyan" />
              <span className="pdf-card__title">Set the base URL</span>
              <p className="pdf-card__body">
                Environment variable <span className="pdf-mono-inline">base</span>{' '}
                = <span className="pdf-mono-inline">http://localhost:8000</span>.
              </p>
            </div>
            <div className="pdf-card">
              <StepNumber n={3} animated={false} size={28} tone="ink" />
              <span className="pdf-card__title">Run the folder</span>
              <p className="pdf-card__body">
                Health → worker-session → /machines → /query → admin alerts.
                A green run proves the stack is wired correctly.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="pdf-h3" style={{ marginBottom: 10 }}>
            Documentation map
          </h3>
          <div className="pdf-grid-2">
            <div className="pdf-card">
              <span className="pdf-card__label">★ Authoritative</span>
              <span className="pdf-card__title">API_CONTRACT.md</span>
              <p className="pdf-card__body">
                Every request/response shape, error code, and stability guarantee.
                Read this first.
              </p>
            </div>
            <div className="pdf-card">
              <span className="pdf-card__label">Onboarding</span>
              <span className="pdf-card__title">BACKEND_SETUP.md</span>
              <p className="pdf-card__body">
                Step-by-step backend walkthrough for new contributors.
              </p>
            </div>
            <div className="pdf-card">
              <span className="pdf-card__label">Diffs</span>
              <span className="pdf-card__title">CHANGELOG_API_CHANGES.md</span>
              <p className="pdf-card__body">
                What changed between contract revisions, with migration notes.
              </p>
            </div>
            <div className="pdf-card">
              <span className="pdf-card__label">Reference</span>
              <span className="pdf-card__title">docs/</span>
              <p className="pdf-card__body">
                01_API_DOCS · 02_DATABASE_SCHEMA · 03_SYSTEM_DESIGN ·
                04_ROUTES_AND_ENDPOINTS · 05_TECH_AND_DEPENDENCIES.
              </p>
            </div>
          </div>
        </div>

        <Callout tone="hero" title="ありがとうございます" animated={false}>
          You now have a running SmartFix. Ship something. Then break it on
          purpose to see how alerts behave — that's the demo magic.
        </Callout>
      </PdfPage>
    </>
  );
}
