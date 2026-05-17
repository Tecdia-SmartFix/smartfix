import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Upload, FileText, Image, Trash2, LogOut, Settings2,
  Printer, Scissors, Bot, Wrench, Gauge, Cpu, ChevronRight,
  CheckCircle, X, LayoutDashboard, Package, Database, Shield, AlertCircle,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, Pipette, BellRing, BarChart3, TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useMachines } from '../context/MachineContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';

const ICON_OPTIONS = [
  { label: 'Settings',  value: 'Settings2',   icon: Settings2   },
  { label: 'Gauge',     value: 'Gauge',        icon: Gauge        },
  { label: 'Printer',   value: 'Printer',      icon: Printer      },
  { label: 'Scissors',  value: 'Scissors',     icon: Scissors     },
  { label: 'Robot',     value: 'Bot',          icon: Bot          },
  { label: 'Wrench',    value: 'Wrench',       icon: Wrench       },
  { label: 'CPU',       value: 'Cpu',          icon: Cpu          },
  { label: 'Factory',   value: 'Factory',      icon: Factory      },
  { label: 'Cog',       value: 'Cog',          icon: Cog          },
  { label: 'Activity',  value: 'Activity',     icon: Activity     },
  { label: 'Flame',     value: 'Flame',        icon: Flame        },
  { label: 'Monitor',   value: 'Monitor',      icon: Monitor      },
  { label: 'Layers',    value: 'Layers',       icon: Layers       },
  { label: 'Radio',     value: 'Radio',        icon: Radio        },
  { label: 'Thermo',    value: 'Thermometer',  icon: Thermometer  },
  { label: 'Drive',     value: 'HardDrive',    icon: HardDrive    },
  { label: 'Activity',  value: 'Activity',     icon: Activity     },
  { label: 'Truck',     value: 'Truck',        icon: Truck        },
  { label: 'Flask',     value: 'FlaskConical', icon: FlaskConical },
  { label: 'Upload',    value: 'Upload',       icon: Upload       },
];

const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Activity, Truck, FlaskConical, Upload,
};

const COLOR_OPTIONS = [
  { label: 'Theme Blue', value: 'text-tecdia-accent', glow: 'rgba(0,169,255,0.15)', border: 'hover:border-tecdia-accent/40', dot: 'bg-tecdia-accent' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — matches backend cap (API_CONTRACT §4.3)
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const EMPTY_FORM = {
  machine_id: '',         // [A-Z0-9_]+ slug — required by API
  name: '', description: '', category: '', icon: 'Settings2',
  color: 'text-tecdia-accent', glow: 'rgba(0,169,255,0.15)',
  border: 'hover:border-tecdia-accent/40',
  customColor: '',
  customIconUrl: null,
  iconFile: null,         // File object for icon upload
  pdfFile: null,          // File object for PDF upload
  files: [],
  significance: 3,
};


const Toast = ({ message, onClose }) => (
  <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white/80 backdrop-blur-md border border-tecdia-accent/30 text-tecdia-accent px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium">
    <div className="w-7 h-7 rounded-full bg-tecdia-accent/10 flex items-center justify-center flex-shrink-0">
      <CheckCircle size={15} className="text-tecdia-accent" />
    </div>
    {message}
    <button onClick={onClose} className="ml-2 text-tecdia-text/40 hover:text-tecdia-text transition-colors"><X size={13} /></button>
  </motion.div>
);

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white/40 backdrop-blur-md border border-tecdia-border rounded-2xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const InputField = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest">{label}</label>
    {props.as === 'textarea'
      ? <textarea {...props} as={undefined} className="w-full bg-tecdia-background border border-tecdia-border rounded-xl py-3 px-4 text-tecdia-text text-sm placeholder:text-tecdia-text/40 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all resize-none" />
      : <input {...props} className="w-full bg-tecdia-background border border-tecdia-border rounded-xl py-3 px-4 text-tecdia-text text-sm placeholder:text-tecdia-text/40 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all" />
    }
  </div>
);

// Auto-generate a machine_id slug from a display name
const toSlug = (name) =>
  name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Ingestion job lifecycle. Order matters — drives the stage display.
const JOB_STAGES = [
  { key: 'queued',    label: 'Queued',    pct: 0   },
  { key: 'parsing',   label: 'Parsing',   pct: 20  },
  { key: 'chunking',  label: 'Chunking',  pct: 40  },
  { key: 'embedding', label: 'Embedding', pct: 65  },
  { key: 'indexing',  label: 'Indexing',  pct: 85  },
  { key: 'done',      label: 'Done',      pct: 100 },
];
const STAGE_PCT = Object.fromEntries(JOB_STAGES.map(s => [s.key, s.pct]));

/**
 * Ingestion progress, Elisa-style:
 *   - Single horizontal bar with rounded ends, soft background, accent fill.
 *   - Animated diagonal stripes overlay while the job is in-progress; turns
 *     solid (no stripes) on done / failed.
 *   - Stage chips beneath the bar light up as the job advances, so the worker
 *     can see exactly which step is running.
 *   - Header pill shows the active stage label + percentage.
 *
 * Reference: https://designsystem.elisa.fi/9b207b2c3/p/159293-progressbar
 */
const IngestionProgress = ({ job, onDismiss }) => {
  if (!job) return null;
  const isFailed = job.status === 'failed';
  const isDone   = job.status === 'done';
  const isActive = !isFailed && !isDone;
  const pct      = isDone ? 100
                 : (job.progress != null ? Math.round(job.progress * 100)
                    : STAGE_PCT[job.status] ?? 0);
  const currentStageIdx = JOB_STAGES.findIndex(s => s.key === job.status);
  const headerLabel = isFailed
    ? 'Ingestion failed'
    : (JOB_STAGES.find(s => s.key === job.status)?.label || 'Working');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`mb-6 rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${
        isFailed ? 'bg-[#E6F7FF]/60 border-[#0057D9]/40 shadow-inner'
        : isDone ? 'bg-[#0057D9]/5 border-[#0057D9]/20'
        : 'bg-white border-tecdia-border'
      }`}
    >
      {/* ── Header: status pill + dismiss ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              isFailed ? 'bg-[#0A2540]/10 text-[#0A2540] border border-[#0A2540]/20'
              : isDone ? 'bg-[#0057D9] text-white border border-[#0057D9]'
              : 'bg-[#42A5F5]/10 text-[#42A5F5] border border-[#42A5F5]/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              isFailed ? 'bg-[#0A2540] animate-pulse'
              : isDone ? 'bg-white'
              : 'bg-[#42A5F5] animate-pulse'
            }`} />
            {isFailed ? 'FAILED' : isDone ? 'COMPLETE' : 'IN PROGRESS'}
          </span>
          <span className="text-sm font-bold text-tecdia-textDeep">
            {headerLabel}
          </span>
          {!isFailed && (
            <span className="text-xs font-mono font-semibold text-tecdia-text/50 tabular-nums">
              {pct}%
            </span>
          )}
        </div>
        {(isDone || isFailed) && (
          <button
            onClick={onDismiss}
            className="text-xs font-medium text-tecdia-text/40 hover:text-tecdia-text px-2 py-1 rounded-md hover:bg-white/60 transition-all"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <div
        className={`relative w-full rounded-full h-2.5 mb-4 overflow-hidden bg-[#E6F7FF]`}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`relative h-full rounded-full overflow-hidden ${
            isFailed ? 'bg-[#0A2540]/30'
            : isDone ? 'bg-[#0057D9] shadow-[0_0_10px_rgba(0,87,217,0.2)]'
            : 'bg-[#1E88E5]'
          }`}
        >
          {/* Diagonal stripes shimmer — only while in-progress */}
          {isActive && (
            <div
              className="absolute inset-0 opacity-30 ingestion-stripes"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.8) 6px 12px)',
                backgroundSize: '17px 17px',
              }}
            />
          )}
        </motion.div>
      </div>

      {/* ── Stage chips ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {JOB_STAGES.slice(0, -1).map((stage, i) => {
          const reached = currentStageIdx >= i || isDone;
          const isCurrent = !isFailed && !isDone && job.status === stage.key;
          return (
            <div
              key={stage.key}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${
                isFailed && reached
                  ? 'bg-tecdia-accent/20 text-tecdia-textDeep'
                  : isCurrent
                    ? 'bg-[#1E88E5] text-white shadow-sm'
                    : reached
                      ? 'bg-[#42A5F5]/10 text-[#42A5F5]'
                      : 'bg-[#E6F7FF] text-tecdia-text/30'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${
                isCurrent ? 'bg-white animate-pulse'
                : reached ? (isFailed ? 'bg-tecdia-accent' : 'bg-tecdia-accent/60')
                : 'bg-tecdia-text/20'
              }`} />
              {stage.label}
            </div>
          );
        })}
      </div>

      {/* ── Live step / error message ───────────────────────────────────── */}
      <p className={`mt-3 text-[11px] font-medium ${
        isFailed ? 'text-tecdia-textDeep'
        : isDone ? 'text-tecdia-accent'
        : 'text-tecdia-text/60'
      }`}>
        {isFailed
          ? (job.error || 'Unknown error during ingestion')
          : isDone
            ? (job.step || 'Machine indexed and ready for worker queries.')
            : (job.step || 'Working…')}
      </p>
    </motion.div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// AnalyticsPanel
// ───────────────────────────────────────────────────────────────────────────
// Fetches GET /admin/analytics on mount and renders five widgets:
//   1. KPI cards            (totals: queries, alerts, alert-rate, machines)
//   2. Per-machine table    (per-machine activity + top codes + avg severity)
//   3. Code frequency bars  (top 15 alarm/error codes globally)
//   4. Severity donut       (distribution across the five severity levels)
//   5. 24h activity bars    (queries per hour, last 24h)
//
// All charts use plain <div>s with width%/clip-path so no extra dep is needed.
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY_PALETTE = {
  '1': { color: '#B6E6FF', label: 'Informational' },
  '2': { color: '#7CC7FF', label: 'Minor' },
  '3': { color: '#42A5F5', label: 'Degraded' },
  '4': { color: '#0057D9', label: 'Production Impact' },
  '5': { color: '#0A2540', label: 'Safety Risk' },
};

const MACHINE_COLORS = ['#0057D9', '#42A5F5', '#0A2540', '#7CC7FF', '#1E88E5', '#B6E6FF'];

const AnalyticsPanel = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchApi('/admin/analytics');
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.detail || e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-tecdia-text/50 text-sm">
        Loading analytics…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-red-700">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const { totals, per_machine, code_frequency, severity_distribution, queries_per_hour_24h, top_questions } = data;
  const isEmpty = totals.queries === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* ── header + refresh ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-tecdia-textDeep flex items-center gap-2.5">
            <BarChart3 size={22} className="text-tecdia-accent" />
            Fleet Analytics
          </h2>
          <p className="text-[11px] font-medium text-tecdia-text/40 uppercase tracking-widest mt-1 ml-8">Real-time system diagnostics & query analytics</p>
        </div>
        <button
          onClick={load}
          className="btn-secondary text-xs px-5 py-2 flex items-center gap-2 w-fit"
        >
          <Activity size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {isEmpty && (
        <div className="bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-2xl p-5 mb-6 text-sm text-tecdia-text/70">
          <span className="font-bold text-tecdia-textDeep">No query data yet.</span>
          {' '}Run <code className="bg-white/60 px-1.5 py-0.5 rounded font-mono text-xs border border-tecdia-border">python3 -m scripts.seed_analytics</code> to populate, or wait for workers to start asking questions.
        </div>
      )}

      {/* ── 1. KPI cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Queries"  value={totals.queries.toLocaleString()} icon={FileText} />
        <KpiCard label="Alerts Fired"   value={totals.alerts.toLocaleString()}   icon={AlertCircle} accent="border-[#0057D9]/20 shadow-[0_0_15px_rgba(0,87,217,0.05)]" />
        <KpiCard label="Alert Rate"     value={`${totals.alert_rate_pct}%`}      icon={TrendingUp} accent="border-[#1E88E5]/20" />
        <KpiCard label="Active Machines" value={totals.machines}                 icon={Package} />
      </div>

      {/* ── 2. Per-machine table ───────────────────────────────────── */}
      <SectionCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-tecdia-accent" />
          <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Per-machine activity</h3>
        </div>
        {per_machine.length === 0 ? (
          <p className="text-sm text-tecdia-text/40 italic">No machines have been queried yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 custom-scrollbar">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-tecdia-text/30">
                  <th className="text-left px-4 py-3">Machine</th>
                  <th className="text-right px-4 py-3">Queries</th>
                  <th className="text-right px-4 py-3">Alerts</th>
                  <th className="text-right px-4 py-3">Rate</th>
                  <th className="text-right px-4 py-3">Avg Severity</th>
                  <th className="text-left px-4 py-3">Top Alarm Codes</th>
                </tr>
              </thead>
              <tbody>
                {per_machine.map((m, i) => (
                  <tr key={m.machine_id} className="group transition-all duration-200">
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-l border-y border-tecdia-border/30 rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: MACHINE_COLORS[i % MACHINE_COLORS.length] }} />
                        <span className="font-bold text-tecdia-textDeep">{m.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right font-mono tabular-nums text-tecdia-text/80">{m.query_count}</td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right font-mono tabular-nums text-tecdia-textDeep font-bold">{m.alert_count}</td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right font-mono tabular-nums text-tecdia-text/50">{m.alert_rate_pct}%</td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right">
                      <SeverityPill value={m.avg_severity} />
                    </td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-r border-y border-tecdia-border/30 rounded-r-xl">
                      <div className="flex flex-wrap gap-1.5">
                        {m.most_asked_codes.length === 0 ? (
                          <span className="text-[10px] text-tecdia-text/20 italic">No codes recorded</span>
                        ) : (
                          m.most_asked_codes.slice(0, 3).map(([code, count]) => (
                            <span key={code} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-tecdia-border/40 text-tecdia-accent shadow-sm">
                              {code} <span className="text-tecdia-text/30 font-medium ml-1">×{count}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ── 3. Code frequency bars ────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Top error / alarm codes</h3>
          </div>
          {code_frequency.length === 0 ? (
            <p className="text-sm text-tecdia-text/40 italic">No coded queries yet.</p>
          ) : (
            <div className="space-y-2">
              {code_frequency.map((c, i) => {
                const maxCount = code_frequency[0]?.count || 1;
                const pct = (c.count / maxCount) * 100;
                const sev = Math.round(c.avg_severity);
                const colorObj = SEVERITY_PALETTE[String(sev)] || SEVERITY_PALETTE['1'];
                return (
                  <div key={`${c.code}_${c.machine}_${i}`} className="flex items-center gap-3 text-sm">
                    <span className="w-20 font-mono font-bold text-tecdia-textDeep flex-shrink-0">{c.code}</span>
                    <div className="flex-1 h-5 bg-[#E6F7FF] rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500 bg-[#0057D9]"
                        style={{ width: `${pct}%`, background: colorObj.color, opacity: 0.9 }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono tabular-nums text-tecdia-textDeep/60 font-bold">×{c.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── 4. Severity donut ─────────────────────────────────────── */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Severity distribution</h3>
          </div>
          <SeverityDonut distribution={severity_distribution} />
        </SectionCard>
      </div>

      {/* ── 5. Last 24h activity bars ──────────────────────────────── */}
      <SectionCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-tecdia-accent" />
          <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Query volume — last 24h (UTC)</h3>
        </div>
        <ActivityBars buckets={queries_per_hour_24h} />
      </SectionCard>

      {/* ── Top questions (bonus, sparse table) ────────────────────── */}
      {top_questions.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Most-asked questions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 mt-2">
            {top_questions.map((q, i) => (
              <div key={i} className="group flex items-center gap-4 py-3 border-b border-tecdia-border/20 last:border-0 hover:bg-white/20 px-3 -mx-3 rounded-xl transition-colors">
                <span className="font-mono tabular-nums text-xs font-bold text-tecdia-accent/40 w-5">{(i + 1).toString().padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-tecdia-textDeep truncate group-hover:text-tecdia-accent transition-colors">{q.question}</p>
                  <p className="text-[10px] font-bold text-tecdia-text/30 uppercase tracking-widest mt-0.5">{q.machine.replaceAll('_', ' ')}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-tecdia-textDeep font-mono">×{q.count}</span>
                  <span className="text-[9px] font-bold text-tecdia-text/30 uppercase">Queries</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
};

const KpiCard = ({ label, value, accent, icon: Icon }) => (
  <div className={`rounded-2xl p-5 border transition-all duration-300 hover:translate-y-[-2px] bg-white/50 backdrop-blur-md border-tecdia-border/30 hover:border-tecdia-accent/40 hover:shadow-lg ${accent}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-tecdia-text/40">{label}</div>
      {Icon && <Icon size={14} className="opacity-40" />}
    </div>
    <div className="text-2xl font-extrabold font-mono tabular-nums text-tecdia-textDeep">{value}</div>
  </div>
);

const SeverityPill = ({ value }) => {
  const sev = Math.round(value || 1);
  const obj = SEVERITY_PALETTE[String(sev)] || SEVERITY_PALETTE['1'];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border tabular-nums"
      style={{ borderColor: `${obj.color}30`, color: obj.color, background: `${obj.color}08` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: obj.color }} />
      {(value || 0).toFixed(2)}
    </span>
  );
};

// Pure SVG donut with professional hover tooltips.
const SeverityDonut = ({ distribution }) => {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const entries = Object.entries(distribution).sort((a, b) => Number(a[0]) - Number(b[0]));
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  
  if (total === 0) {
    return <p className="text-sm text-tecdia-text/40 italic">No queries to distribute yet.</p>;
  }

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const r = 38;
  const circ = 2 * Math.PI * r;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-10">
      <div className="relative w-44 h-44 flex-shrink-0 group" onMouseMove={handleMouseMove}>
        <div className="absolute inset-0 rounded-full bg-tecdia-accent/5 blur-2xl group-hover:bg-tecdia-accent/10 transition-all duration-500" />
        
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-sm overflow-visible">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E6F7FF" strokeWidth="10" />
          
          {entries.map(([sev, count]) => {
            const percent = (count / total);
            if (percent === 0) return null;
            const dashLength = percent * circ;
            const dashOffset = -accumulatedPercent * circ;
            accumulatedPercent += percent;
            const config = SEVERITY_PALETTE[sev];
            const isHovered = hovered?.sev === sev;

            return (
              <motion.circle
                key={sev} cx="50" cy="50" r={r} fill="none" stroke={config.color}
                strokeWidth={isHovered ? 13 : 10}
                strokeDasharray={`${dashLength} ${circ}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                onMouseEnter={() => setHovered({ sev, count, pct: Math.round(percent * 100), color: config.color, label: config.label })}
                onMouseLeave={() => setHovered(null)}
                className="transition-all duration-300 ease-out cursor-pointer pointer-events-auto"
                style={{ filter: isHovered ? `drop-shadow(0 0 4px ${config.color}40)` : 'none' }}
              />
            );
          })}
          <circle cx="50" cy="50" r="33" fill="white" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-tecdia-text/30 block mb-0.5">Total Queries</span>
            <span className="text-3xl font-extrabold font-mono tabular-nums text-tecdia-accent">{total}</span>
          </div>
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="absolute z-50 pointer-events-none"
              style={{ top: '15%', right: '-15%' }}
            >
              <div className="bg-white border border-tecdia-border shadow-lg rounded-md px-3 py-2 flex items-center gap-2.5 min-w-max">
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: hovered.color }} />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-tecdia-textDeep">Level {hovered.sev} — {hovered.label}</span>
                  <span className="text-[10px] font-mono font-bold text-tecdia-accent">{hovered.pct}% • {hovered.count} Queries</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 w-full space-y-3">
        {entries.map(([sev, count]) => {
          const obj = SEVERITY_PALETTE[sev];
          const pct = total ? Math.round((count / total) * 100) : 0;
          const isHovered = hovered?.sev === sev;
          return (
            <div 
              key={sev} 
              onMouseEnter={() => setHovered({ sev, count, pct, color: obj.color, label: obj.label })}
              onMouseLeave={() => setHovered(null)}
              className={`group flex items-center gap-3 text-sm p-2.5 rounded-2xl transition-all duration-300 border cursor-pointer ${
                isHovered ? 'bg-white shadow-md border-tecdia-accent/20 translate-x-1' : 'hover:bg-white/60 border-transparent'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border-2 border-white" style={{ background: obj.color }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-tecdia-textDeep text-xs">Level {sev} — {obj.label}</span>
                  <span className="font-mono tabular-nums font-bold text-tecdia-textDeep">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-[#E6F7FF] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: obj.color }}
                  />
                </div>
              </div>
              <span className="font-mono tabular-nums font-black text-tecdia-accent/40 w-10 text-right text-xs">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActivityBars = ({ buckets }) => {
  const max = Math.max(1, ...buckets.map(b => b.count));
  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2 custom-scrollbar">
      {buckets.map(b => (
        <div key={b.hour} className="flex-1 min-w-[16px] flex flex-col items-center group">
          <div className="relative w-full flex flex-col items-center justify-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(b.count / max) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full bg-[#0057D9] rounded-t-md transition-all duration-300 group-hover:bg-[#0A2540] group-hover:shadow-[0_0_12px_rgba(10,37,64,0.2)] relative"
              style={{ minHeight: b.count > 0 ? 2 : 0 }}
            >
              {b.count > 0 && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#1E88E5] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-tecdia-border/30">
                  {b.count}
                </span>
              )}
            </motion.div>
          </div>
          <span className="text-[9px] font-bold text-tecdia-text/30 mt-2 tabular-nums">{b.hour.split(':')[0]}</span>
        </div>
      ))}
    </div>
  );
};


const AdminDashboard = () => {
  const { adminLogout } = useAdminAuth();
  const { machines, addMachine, deleteMachine, activeJob, clearActiveJob } = useMachines();
  const { alerts, alertThreshold, clearAlerts, testAlert } = useAlerts();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'add' ? 'add' : 'machines');
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState('');
  const [fileErrors, setFileErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };


  const handleColorPick = (opt) => setForm(f => ({ ...f, color: opt.value, glow: opt.glow, border: opt.border }));

  const processFiles = (rawFiles) => {
    const errors = [];
    const valid = [];
    Array.from(rawFiles).forEach(file => {
      const kind = ALLOWED_TYPES[file.type];
      if (!kind) {
        errors.push(`"${file.name}" — unsupported type. Use PDF, JPG, PNG or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" — exceeds 10 MB limit.`);
        return;
      }
      valid.push({ name: file.name, type: kind, url: URL.createObjectURL(file), size: file.size });
    });
    setFileErrors(errors);
    if (valid.length) setForm(f => ({ ...f, files: [...f.files, ...valid] }));
    setTimeout(() => setFileErrors([]), 5000);
  };

  const handleFileInput = (e) => processFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setForm(f => ({ ...f, files: f.files.filter((_, i) => i !== idx) }));

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.machine_id.trim()) return;
    if (!form.pdfFile) { showToast('Please attach a PDF manual.'); return; }
    setIsSubmitting(true);
    const fd = new FormData();
    fd.append('machine_id',   form.machine_id.trim());
    fd.append('display_name', form.name.trim());
    fd.append('file',         form.pdfFile);
    if (form.description) fd.append('description',  form.description);
    if (form.category)    fd.append('category',     form.category);
    fd.append('significance', String(form.significance));
    // Backend expects a Lucide icon name string (e.g. "Printer"), not an image File.
    if (form.icon)        fd.append('icon',         form.icon);
    const result = await addMachine(fd);
    setIsSubmitting(false);
    if (result.success) {
      setForm(EMPTY_FORM);
      setActiveTab('machines');
      showToast(`Ingestion started for "${form.name}".`);
    } else {
      showToast(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (deleteConfirm === id) {
      const result = await deleteMachine(id);
      setDeleteConfirm(null);
      if (result.success) {
        showToast(`"${name}" removed.`);
      } else {
        showToast(`Error: ${result.error}`);
      }
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleClearAlerts = async () => {
    await clearAlerts();
    showToast('Alert history cleared.');
  };

  const handleTestAlert = async () => {
    const result = await testAlert();
    if (result.success) {
      showToast('Test alert injected.');
    } else {
      showToast(`Error: ${result.error}`);
    }
  };

  const PreviewIcon = ICON_MAP[form.icon] || Settings2;
  // Default seeded machines — match backend `_machine_metadata` slugs in src/api.py.
  const isDefault = (id) => ['INJECTION_MOLDING_MACHINE', 'LASER_CUTTING_MACHINE'].includes(id);

  return (
    <div className="min-h-screen text-tecdia-text pt-[76px]">

      {/* ── Top Header ── */}
      <header className="sticky top-[76px] z-40 border-b border-tecdia-border bg-white/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/src/assets/logo.png" alt="Tecdia" className="w-7 h-7 object-contain opacity-100 transition-opacity" />
              <span className="text-sm font-semibold text-tecdia-text/60 group-hover:text-tecdia-textDeep transition-colors">Tecdia SmartFix</span>
            </Link>
            <ChevronRight size={13} className="text-tecdia-border" />
            <div className="flex items-center gap-1.5 text-sm font-bold text-tecdia-textDeep">
              <LayoutDashboard size={14} className="text-tecdia-accent" />
              Admin
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-tecdia-surface border border-tecdia-border">
              <Shield size={12} className="text-tecdia-text/60" />
              <span className="text-xs font-semibold text-tecdia-text/80">Admin Session</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white border border-tecdia-border text-tecdia-text/40 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
              title="Exit Admin"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Page Title + Stats ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-tecdia-textDeep mb-1">Admin Dashboard</h1>
            <p className="text-tecdia-text/60 text-sm">Manage your machine catalogue and diagnostic resources.</p>
          </div>

          {/* Inline stat pills */}
          <div className="flex items-center gap-3">
            {(() => {
              const defaultCount = machines.filter(m => isDefault(m.id)).length;
              return [
                { icon: Database, label: 'Total', value: machines.length, color: 'text-white', bg: 'bg-[#00A9FF]', border: 'border-[#00A9FF]/20' },
                { icon: Package, label: 'Default', value: defaultCount, color: 'text-tecdia-textDeep', bg: 'bg-[#89CFF3]', border: 'border-[#89CFF3]/20' },
                { icon: Plus, label: 'Custom', value: Math.max(0, machines.length - defaultCount), color: 'text-tecdia-textDeep', bg: 'bg-[#A0E9FF]', border: 'border-[#A0E9FF]/20' },
              ];
            })().map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${s.bg} border ${s.border} shadow-sm`}>
                  <Icon size={14} className={s.color} />
                  <div>
                    <div className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</div>
                    <div className={`text-[10px] font-medium mt-0.5 ${s.color === 'text-white' ? 'text-white/80' : 'text-tecdia-text/60'}`}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 p-1 bg-white border border-tecdia-border rounded-2xl mb-8 w-fit shadow-sm">
          {[
            { id: 'machines',  label: 'All Machines',  icon: Package },
            { id: 'add',       label: 'Add Machine',   icon: Plus },
            { id: 'alerts',    label: 'Alert History', icon: BellRing, count: alerts.length },
            { id: 'analytics', label: 'Analytics',     icon: BarChart3 },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? 'bg-tecdia-accent text-white shadow-md'
                    : 'text-tecdia-text/60 hover:text-tecdia-accent'
                }`}>
                <Icon size={14} /> 
                {tab.label}
                {tab.count > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    activeTab === tab.id ? 'bg-red-500 text-white border-tecdia-accent' : 'bg-red-500 text-white border-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Global ingestion progress bar ──
            Rendered OUTSIDE the tab content blocks so it remains visible
            after handleAddMachine() switches the active tab to 'machines'.
            Without this, the bar mounted inside the Add tab and was
            immediately unmounted on tab switch — user never saw it. */}
        <AnimatePresence>
          {activeJob && <IngestionProgress job={activeJob} onDismiss={clearActiveJob} />}
        </AnimatePresence>

        {/* ══════════════ TAB: Machines ══════════════ */}
        {activeTab === 'machines' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => {
                const Icon = ICON_MAP[machine.icon] || Settings2;
                const defaultMachine = isDefault(machine.id);
                const confirming = deleteConfirm === machine.id;
                return (
                  <motion.div key={machine.id} layout
                    className="group relative bg-white border border-tecdia-border rounded-2xl p-5 hover:border-tecdia-accent transition-all duration-200 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-tecdia-accent/10 border border-tecdia-border flex items-center justify-center overflow-hidden">
                        {machine.customIconUrl ? (
                          <img src={machine.customIconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon size={18} className="text-tecdia-accent" />
                        )}
                      </div>
                      {defaultMachine
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-tecdia-background text-tecdia-text/40 border border-tecdia-border">Default</span>
                        : (
                          <button onClick={() => handleDelete(machine.id, machine.name)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              confirming
                                ? 'bg-tecdia-accent/20 border-tecdia-accent/40 text-tecdia-textDeep'
                                : 'text-transparent group-hover:text-tecdia-text/40 border-transparent hover:!text-tecdia-accent hover:bg-tecdia-accent/10 hover:border-tecdia-accent/20'
                            }`}>
                            <Trash2 size={13} />
                          </button>
                        )
                      }
                    </div>

                    <h3 className="font-bold text-tecdia-textDeep text-sm mb-1">{machine.name}</h3>
                    <p className="text-tecdia-text/80 text-xs leading-relaxed">{machine.description}</p>
                    {machine.category && (
                      <div className="mt-3 pt-3 border-t border-tecdia-border flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-tecdia-text/60 uppercase tracking-wider">{machine.category}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-tecdia-text/40">SIG:</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= machine.significance ? 'bg-[#0057D9]' : 'bg-[#E6F7FF] border border-tecdia-border/20'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════════════ TAB: Add Machine ══════════════ */}
        {activeTab === 'add' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* (Progress bar moved above tabs — it's rendered globally
                so it stays visible after the auto-switch to Machines tab.) */}
            <form onSubmit={handleAddMachine}>
              {/* Two-column grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* LEFT — Machine Details */}
                <SectionCard className="bg-white">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
                      <FileText size={13} className="text-tecdia-accent" />
                    </div>
                    <h2 className="font-bold text-tecdia-textDeep text-sm">Machine Details</h2>
                  </div>
                  <div className="space-y-4">
                    <InputField label="Machine Name *" type="text" required value={form.name}
                      onChange={e => {
                        const name = e.target.value;
                        setForm(f => ({
                          ...f, name,
                          // Auto-generate slug only if user hasn't manually edited it
                          machine_id: f._slugEdited ? f.machine_id : toSlug(name),
                        }));
                      }}
                      placeholder="e.g. CNC Milling Machine" />
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest">Machine ID (slug) *</label>
                      <input
                        type="text" required
                        value={form.machine_id}
                        onChange={e => setForm(f => ({ ...f, machine_id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''), _slugEdited: true }))}
                        placeholder="AUTO_GENERATED_FROM_NAME"
                        className="w-full bg-tecdia-background border border-tecdia-border rounded-xl py-3 px-4 text-tecdia-text text-sm font-mono placeholder:text-tecdia-text/30 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all"
                      />
                      <p className="text-[10px] text-tecdia-text/40">Auto-generated. Only A–Z, 0–9, underscore allowed. Must be unique.</p>
                    </div>
                    <InputField label="Description" as="textarea" rows={4} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of this machine's diagnostic capabilities..." />
                    <InputField label="Category" type="text" value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Fabrication, Automation" />
                    
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest flex justify-between">
                        Machine Significance
                        <span className="text-tecdia-accent font-bold">Level {form.significance}</span>
                      </label>
                      <input 
                        type="range" min="1" max="5" step="1" 
                        value={form.significance} 
                        onChange={e => setForm(f => ({ ...f, significance: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-[#E6F7FF] rounded-lg appearance-none cursor-pointer accent-[#0057D9] border border-tecdia-border/30" 
                      />
                      <div className="flex justify-between text-[9px] text-tecdia-text/40 font-bold uppercase tracking-tighter">
                        <span>Low Impact</span>
                        <span>Mission Critical</span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* RIGHT — Appearance */}
                <SectionCard className="bg-white">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
                      <Settings2 size={13} className="text-tecdia-accent" />
                    </div>
                    <h2 className="font-bold text-tecdia-textDeep text-sm">Appearance</h2>
                  </div>

                  {/* ── ICON SECTION ── */}
                  <div className="mb-6">
                    <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest mb-3">Icon</label>

                    {/* Custom icon upload */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="custom-icon-upload"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) setForm(f => ({ ...f, customIconUrl: URL.createObjectURL(file) }));
                        }}
                      />
                      <label htmlFor="custom-icon-upload"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-tecdia-background border border-tecdia-border hover:border-tecdia-accent text-tecdia-text/60 hover:text-tecdia-accent text-xs font-medium cursor-pointer transition-all duration-200">
                        <Image size={13} /> Upload Custom Icon
                      </label>
                      {form.customIconUrl && (
                        <div className="flex items-center gap-2">
                          <img src={form.customIconUrl} alt="custom icon" className="w-8 h-8 rounded-lg object-cover border border-tecdia-border" />
                          <button type="button" onClick={() => setForm(f => ({ ...f, customIconUrl: null }))}
                            className="w-6 h-6 rounded-full bg-tecdia-background border border-tecdia-border flex items-center justify-center text-tecdia-text/40 hover:text-tecdia-accent transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/*Live preview */}
                  <div>
                    <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest mb-2.5">Preview</label>
                    <div className="flex items-center gap-3 bg-tecdia-background border border-tecdia-border rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-tecdia-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {form.customIconUrl
                          ? <img src={form.customIconUrl} alt="" className="w-full h-full object-cover" />
                          : React.createElement(ICON_MAP[form.icon] || Settings2, {
                              size: 18,
                              className: 'text-tecdia-accent',
                            })
                        }
                      </div>
                      <div>
                        <span className="font-semibold text-tecdia-textDeep text-sm block">{form.name || 'Machine Name'}</span>
                        {form.category && <span className="text-[10px] text-tecdia-text/60">{form.category}</span>}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Unified File Upload */}
              <SectionCard className="mb-6 bg-white">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
                      <Upload size={13} className="text-tecdia-accent" />
                    </div>
                    <h2 className="font-bold text-tecdia-textDeep text-sm">Files & Media</h2>
                  </div>
                  {form.files.length > 0 && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-tecdia-accent/10 border border-tecdia-accent/20 text-tecdia-accent font-semibold">
                      {form.files.length} file{form.files.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 50 * 1024 * 1024) { setFileErrors(['File exceeds 50 MB limit.']); return; }
                    setForm(f => ({ ...f, pdfFile: file, files: [{ name: file.name, type: 'pdf', size: file.size }] }));
                    setFileErrors([]);
                  }}
                  className="hidden"
                />

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-tecdia-accent/60 bg-tecdia-accent/5 scale-[1.01]'
                      : 'border-[#89CFF3] bg-[#A0E9FF]/20 hover:border-tecdia-accent/50 hover:bg-[#A0E9FF]/40'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isDragging ? 'bg-tecdia-accent/15' : 'bg-white border border-tecdia-border'
                  }`}>
                    <Upload size={22} className={isDragging ? 'text-tecdia-accent' : 'text-tecdia-accent/60'} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold mb-1 transition-colors ${isDragging ? 'text-tecdia-accent' : 'text-tecdia-text/60'}`}>
                      {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-tecdia-text/40">PDF, JPG, PNG, WebP · Max 10 MB per file</p>
                  </div>
                </div>

                {/* Validation errors */}
                <AnimatePresence>
                  {fileErrors.map((err, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 mt-3 px-4 py-3 bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-xl text-tecdia-accent text-xs">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                      {err}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Uploaded files list */}
                {form.files.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest mb-3">Uploaded</p>

                    {/* Image grid */}
                    {form.files.filter(f => f.type === 'image').length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                        {form.files.map((file, idx) => file.type === 'image' && (
                          <div key={idx} className="relative group/img aspect-square">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-xl border border-tecdia-border" />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 rounded-xl transition-all duration-200 flex items-center justify-center">
                              <button type="button" onClick={() => removeFile(idx)}
                                className="w-6 h-6 bg-white/70 rounded-full items-center justify-center text-tecdia-textDeep hover:text-tecdia-accent opacity-0 group-hover/img:opacity-100 transition-opacity flex">
                                <X size={11} />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-white/80 rounded-b-xl px-1.5 py-1 opacity-0 group-hover/img:opacity-100 transition-opacity border-t border-tecdia-border">
                              <p className="text-[9px] text-tecdia-textDeep truncate">{file.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PDF rows */}
                    {form.files.map((file, idx) => file.type === 'pdf' && (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-xl group/pdf">
                        <div className="w-8 h-8 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center flex-shrink-0">
                          <FileText size={14} className="text-tecdia-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-tecdia-textDeep truncate">{file.name}</p>
                          <p className="text-[10px] text-tecdia-text/60">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                        </div>
                        <button type="button" onClick={() => removeFile(idx)}
                          className="text-tecdia-text/40 hover:text-tecdia-accent transition-colors opacity-0 group-hover/pdf:opacity-100 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Submit Button */}
              <button type="submit" disabled={!form.name.trim() || !form.machine_id.trim() || !form.pdfFile || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-300 shadow-md ${
                  form.name.trim() && form.machine_id.trim() && form.pdfFile && !isSubmitting
                    ? 'bg-tecdia-accent text-white hover:bg-tecdia-accent/90 active:scale-[0.99]'
                    : 'bg-tecdia-background border border-tecdia-border text-tecdia-text/40 cursor-not-allowed'
                }`}>
                {isSubmitting
                  ? <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Uploading...</>
                  : <><Plus size={18} /> Upload & Index Machine</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* ══════════════ TAB: Alerts ══════════════ */}
        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {alertThreshold && <p className="text-xs text-tecdia-text/40 mb-4">Alerts fire when score ≥ {alertThreshold} of 25</p>}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-tecdia-textDeep flex items-center gap-2">
                <BellRing size={20} className="text-tecdia-accent" />
                Critical Fault Alerts
              </h2>
              <div className="flex items-center gap-4">
                <button onClick={handleTestAlert} className="text-xs font-bold text-tecdia-accent hover:text-tecdia-accent/80 transition-colors">
                  Inject Test Alert
                </button>
                {alerts.length > 0 && (
                  <button onClick={handleClearAlerts} className="text-xs font-bold text-tecdia-text/40 hover:text-tecdia-accent transition-colors">
                    Clear All History
                  </button>
                )}
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white border border-tecdia-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-tecdia-background border border-tecdia-border flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-tecdia-text/20" />
                </div>
                <p className="text-tecdia-textDeep font-bold">No critical alerts detected</p>
                <p className="text-tecdia-text/60 text-sm max-w-xs mt-1">High-severity fault reports will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <motion.div 
                    key={alert.alert_id} 
                    layout 
                    initial={{ opacity: 0, y: 12 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-white border border-tecdia-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-tecdia-accent/20 transition-all duration-300"
                  >
                    {/* High-Contrast Indicator Strip (Navy) */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0A2540]" />
                    
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Main Info */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                              <Shield size={12} /> Score {alert.score}
                            </span>
                            <h3 className="text-base font-bold text-tecdia-textDeep tracking-tight uppercase">
                              {alert.machine_id.replaceAll('_', ' ')}
                            </h3>
                            <span className="text-[10px] font-bold text-tecdia-accent bg-tecdia-accent/5 px-2 py-1 rounded-md border border-tecdia-accent/10">
                              {new Date(alert.notified_at).toLocaleString('en-US', { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-tecdia-text/30 uppercase tracking-tighter">Impact Level</span>
                              <span className="text-xs font-black text-tecdia-textDeep uppercase">Severity {alert.severity_level}</span>
                            </div>
                            <div className="w-px h-6 bg-tecdia-border" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-tecdia-text/30 uppercase tracking-tighter">Significance</span>
                              <span className="text-xs font-black text-tecdia-textDeep uppercase">Priority {alert.machine_significance}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-tecdia-accent/10" />
                            <p className="text-sm text-tecdia-textDeep/80 leading-relaxed pl-3">
                              {alert.answer_excerpt || alert.question}
                            </p>
                          </div>
                        </div>

                        {/* Status Side */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-tecdia-border lg:pl-8">
                          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-colors duration-300 ${
                            alert.email_notified 
                              ? 'bg-[#E6F7FF] border-[#B6E6FF] text-[#0057D9]' 
                              : 'bg-tecdia-background border-tecdia-border text-tecdia-text/40'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${alert.email_notified ? 'bg-tecdia-accent animate-pulse' : 'bg-tecdia-text/20'}`} />
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              {alert.email_notified ? 'System Notified' : 'Dispatch Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════ TAB: Analytics ══════════════ */}
        {activeTab === 'analytics' && <AnalyticsPanel />}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
