import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Upload, FileText, Image, Trash2, LogOut, Settings2,
  Printer, Scissors, Bot, Wrench, Gauge, Cpu, ChevronRight, ChevronDown,
  CheckCircle, X, LayoutDashboard, Package, Database, Shield, AlertCircle,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, Pipette, BellRing, BarChart3, TrendingUp,
  AlertTriangle, RotateCw,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useMachines } from '../context/MachineContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';
import ShiftLogsPanel from '../components/ShiftLogsPanel';
import bbImg from '../assets/bb.jpg';
import addMachineImg from '../assets/addmachine.png';
import laserImg from '../assets/laser.png';
import injectionImg from '../assets/injection.jpeg';
import printerImg from '../assets/printer.png';
import hyImg from '../assets/hy.png';

const ALERT_MACHINE_IMAGES = {
  INJECTION_MOLDING_MACHINE: injectionImg,
  LASER_CUTTING_MACHINE: laserImg,
  FDM_X300_INDUSTRIAL_3D_PRINTER: printerImg,
  HP_500_HYDRAULIC_PRESS: hyImg,
};
import MachineCard from '../components/MachineCard';
import MachineDetailModal from '../components/MachineDetailModal';

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
  { label: 'Truck',     value: 'Truck',        icon: Truck        },
  { label: 'Flask',     value: 'FlaskConical', icon: FlaskConical },
  { label: 'Upload',    value: 'Upload',       icon: Upload       },
];

const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, Upload,
};

const COLOR_OPTIONS = [
  { label: 'Theme Blue', value: 'text-tecdia-accent', glow: 'rgba(17,17,17,0.15)', border: 'hover:border-tecdia-accent/40', dot: 'bg-tecdia-accent' },
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
  color: 'text-tecdia-accent', glow: 'rgba(17,17,17,0.15)',
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

const SectionCard = ({ children, className = '', transparent = false }) => (
  <div className={`${transparent ? 'bg-transparent' : 'bg-white/40 backdrop-blur-md border border-tecdia-border shadow-sm p-6'} rounded-2xl ${className}`}>
    {children}
  </div>
);

const InputField = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-semibold text-landing-text/60 uppercase tracking-widest">{label}</label>
    {props.as === 'textarea'
      ? <textarea {...props} as={undefined} className="w-full bg-transparent border border-landing-border rounded-xl py-3 px-4 text-landing-text text-sm placeholder:text-landing-text/40 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all resize-none" />
      : <input {...props} className="w-full bg-transparent border border-landing-border rounded-xl py-3 px-4 text-landing-text text-sm placeholder:text-landing-text/40 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all" />
    }
  </div>
);

// Auto-generate a machine_id slug from a display name
const toSlug = (name) =>
  name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const CATEGORY_OPTIONS = [
  'Manufacturing',
  'Fabrication',
  'Heavy Machinery',
  'Additive Manufacturing',
  'Assembly',
  'Inspection',
  'Material Handling',
  'Packaging',
];

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
const IngestionProgress = ({ job, onDismiss, onRetry }) => {
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
        isFailed ? 'bg-[#F2F2F2]/60 border-[#111111]/40 shadow-inner'
        : isDone ? 'bg-[#111111]/5 border-[#111111]/20'
        : 'bg-white border-tecdia-border'
      }`}
    >
      {/* ── Header: status pill + dismiss ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              isFailed ? 'bg-[#0A2540]/10 text-[#0A2540] border border-[#0A2540]/20'
              : isDone ? 'bg-[#111111] text-white border border-[#111111]'
              : 'bg-[#555555]/10 text-[#555555] border border-[#555555]/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              isFailed ? 'bg-[#0A2540] animate-pulse'
              : isDone ? 'bg-white'
              : 'bg-[#555555] animate-pulse'
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
          <div className="flex items-center gap-1.5">
            {isFailed && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0057D9] hover:bg-[#0048b3] px-3 py-1.5 rounded-md transition-all"
              >
                <RotateCw size={12} />
                Retry upload
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-xs font-medium text-tecdia-text/40 hover:text-tecdia-text px-2 py-1 rounded-md hover:bg-white/60 transition-all"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <div
        className={`relative w-full rounded-full h-2.5 mb-4 overflow-hidden bg-[#F2F2F2]`}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`relative h-full rounded-full overflow-hidden ${
            isFailed ? 'bg-[#0A2540]/30'
            : isDone ? 'bg-[#111111] shadow-[0_0_10px_rgba(17,17,17,0.2)]'
            : 'bg-[#333333]'
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
                    ? 'bg-[#333333] text-white shadow-sm'
                    : reached
                      ? 'bg-[#555555]/10 text-[#555555]'
                      : 'bg-[#F2F2F2] text-tecdia-text/30'
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
// AuditPanel
// ───────────────────────────────────────────────────────────────────────────
// Tails GET /admin/audit and renders an append-only table of admin actions.
// Filterable by action prefix (auth / machine / all). Backend reads from the
// JSONL file at data/audit.jsonl — entries persist across server restarts.
// ═══════════════════════════════════════════════════════════════════════════

const AUDIT_ACTION_COLORS = {
  'auth.admin_login':       { className: 'bg-tecdia-accent text-white', label: 'Login' },
  'auth.admin_logout':      { className: 'bg-white text-tecdia-textDeep border border-tecdia-border', label: 'Logout' },
  'machine.create':         { className: 'bg-tecdia-textDeep text-white', label: 'Machine Created' },
  'machine.delete':         { className: 'bg-tecdia-textDeep/80 text-white', label: 'Machine Deleted' },
  'machine.ingest_complete':{ className: 'bg-tecdia-surface text-tecdia-textDeep border border-tecdia-accent/50', label: 'Ingest Complete' },
  'machine.ingest_failed':  { className: 'bg-transparent text-tecdia-textDeep border border-tecdia-textDeep/30', label: 'Ingest Failed' },
};

// ═══════════════════════════════════════════════════════════════════════════
// SettingsPanel
// ═══════════════════════════════════════════════════════════════════════════

const fmtTime = s => {
  if (!s || s === 0) return "disabled";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
};

const SettingsTag = ({ children }) => <span className="stg-tag">{children}</span>;

const SettingsSectionCard = ({ title, subtitle, children }) => (
  <motion.div
    className="stg-section-card"
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
  >
    <div className="stg-section-header">
      <h3 className="stg-section-title">{title}</h3>
      {subtitle && <p className="stg-section-sub">{subtitle}</p>}
    </div>
    {children}
  </motion.div>
);

const SETTINGS_CSS = `
  .stg-root {
    --stg-bg:         #ffffff;
    --stg-surface:    #ffffff;
    --stg-border:     #e2e8f4;
    --stg-border-hi:  #c9d5ee;
    --stg-text:       #0f1c3f;
    --stg-muted:      #6b7a9e;
    --stg-dim:        #a0acc8;
    --stg-accent:     #2D8CFF;
    --stg-accent-lt:  #eaf3ff;
    --stg-accent-mid: #1a7ae6;
    --stg-blue-glow:  rgba(45,140,255,0.15);
    --stg-danger:     #e03b3b;
    --stg-radius:     16px;
    --stg-radius-sm:  10px;

    background: var(--stg-bg);
    color: var(--stg-text);
    padding: 10px 24px;
    width: 100%;
    box-sizing: border-box;
  }

  .stg-root .stg-page-header { margin-bottom: 44px; }

  .stg-root .stg-header-eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--stg-accent);
    margin-bottom: 10px;
  }

  .stg-root .stg-page-title { font-family: 'Sora', sans-serif;
    font-size: clamp(30px, 5vw, 46px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.06;
    color: var(--stg-text);
    margin-bottom: 10px;
  }

  .stg-root .stg-page-desc {
    font-size: 13.5px;
    color: var(--stg-muted);
    font-weight: 400;
  }

  .stg-section-card {
    background: var(--stg-surface);
    border: 1px solid var(--stg-border);
    border-radius: var(--stg-radius);
    padding: 28px 32px;
    margin-bottom: 18px;
    box-shadow: 0 2px 12px rgba(15,28,63,0.06), 0 1px 3px rgba(15,28,63,0.04);
    position: relative;
    overflow: hidden;
  }

  .stg-section-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--stg-accent), #6db3ff);
    border-radius: var(--stg-radius) var(--stg-radius) 0 0;
  }

  .stg-section-header { margin-bottom: 24px; }

  .stg-section-title { font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--stg-text);
    margin-bottom: 4px;
  }

  .stg-section-sub {
    font-size: 12.5px;
    color: var(--stg-muted);
    font-weight: 400;
  }

  .stg-root .stg-fields { display: flex; flex-direction: column; }

  .stg-root .stg-field-row {
    display: grid;
    grid-template-columns: 1fr 180px;
    gap: 24px;
    align-items: start;
    padding: 20px 0;
  }

  .stg-root .stg-field-meta { display: flex; flex-direction: column; gap: 5px; }

  .stg-root .stg-field-label {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--stg-text);
    letter-spacing: -0.01em;
  }

  .stg-root .stg-field-hint {
    font-size: 12px;
    color: var(--stg-muted);
    line-height: 1.6;
  }

  .stg-root .stg-field-control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 7px;
  }

  .stg-root .stg-divider { height: 1px; background: var(--stg-border); }

  .stg-root .stg-num-input {
    width: 110px;
    background: var(--stg-accent-lt);
    border: 1.5px solid var(--stg-border-hi);
    border-radius: var(--stg-radius-sm);
    color: var(--stg-text);
    font-size: 20px;
    font-weight: 500;
    padding: 8px 12px;
    text-align: right;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    -moz-appearance: textfield;
  }

  .stg-root .stg-num-input::-webkit-inner-spin-button,
  .stg-root .stg-num-input::-webkit-outer-spin-button { -webkit-appearance: none; }

  .stg-root .stg-num-input:focus {
    border-color: var(--stg-accent);
    background: #fff;
    box-shadow: 0 0 0 4px var(--stg-blue-glow);
  }

  .stg-root .stg-input-wrap { position: relative; display: flex; align-items: center; }
  .stg-root .stg-input-wrap .stg-num-input { padding-right: 48px; width: 130px; }

  .stg-root .stg-time-badge {
    position: absolute;
    right: 9px;
    font-size: 10px;
    font-weight: 500;
    color: var(--stg-accent);
    background: rgba(45,140,255,0.1);
    border-radius: 5px;
    padding: 2px 5px;
    pointer-events: none;
  }

  .stg-root .stg-range-label {
    font-size: 10px;
    color: var(--stg-dim);
  }

  .stg-root .stg-threshold-track {
    width: 110px;
    height: 4px;
    background: var(--stg-accent-lt);
    border-radius: 2px;
    overflow: hidden;
    border: 1px solid var(--stg-border);
  }

  .stg-root .stg-threshold-fill {
    height: 100%;
    background: linear-gradient(90deg, #6db3ff, var(--stg-accent));
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .stg-root .stg-save-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-top: 22px;
    margin-top: 10px;
    border-top: 1px solid var(--stg-border);
  }

  .stg-root .stg-save-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1.5px solid var(--stg-border-hi);
    background: var(--stg-accent-lt);
    color: var(--stg-dim);
    border-radius: var(--stg-radius-sm);
    padding: 10px 22px;
    cursor: not-allowed;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: all 0.22s;
  }

  .stg-root .stg-save-btn.stg-active {
    border-color: var(--stg-accent);
    background: var(--stg-accent);
    color: #fff;
    cursor: pointer;
    box-shadow: 0 4px 18px var(--stg-blue-glow);
  }

  .stg-root .stg-save-btn.stg-active:hover {
    background: var(--stg-accent-mid);
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(45,140,255,0.28);
  }

  .stg-root .stg-btn-spinner {
    width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: stg-spin 0.7s linear infinite;
  }

  @keyframes stg-spin { to { transform: rotate(360deg); } }

  .stg-root .stg-toast {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #166534;
    letter-spacing: 0.01em;
  }

  .stg-root .stg-toast-dot {
    width: 7px; height: 7px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 7px #22c55e;
    flex-shrink: 0;
  }

  .stg-root .stg-env-grid { display: flex; flex-direction: column; gap: 22px; }

  .stg-root .stg-env-key {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--stg-dim);
    margin-bottom: 10px;
  }

  .stg-root .stg-tag-row { display: flex; flex-wrap: wrap; gap: 8px; }

  .stg-tag {
    display: inline-flex;
    align-items: center;
    background: var(--stg-accent-lt);
    border: 1px solid var(--stg-border-hi);
    border-radius: 100px;
    padding: 5px 13px;
    font-size: 12px;
    color: var(--stg-accent);
    font-weight: 500;
    transition: background 0.18s, border-color 0.18s;
  }

  .stg-tag:hover {
    background: #d4e6ff;
    border-color: var(--stg-accent);
  }

  .stg-root .stg-empty-note {
    font-size: 13px;
    color: var(--stg-dim);
    font-style: italic;
  }

  .stg-root .stg-mono {
    font-size: 11.5px;
    background: var(--stg-accent-lt);
    border: 1px solid var(--stg-border-hi);
    padding: 1px 6px;
    border-radius: 5px;
    color: var(--stg-accent);
  }

  .stg-root .stg-loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    height: 200px;
    color: var(--stg-muted);
    font-size: 13px;
  }

  .stg-root .stg-loader {
    width: 18px; height: 18px;
    border: 2px solid var(--stg-border);
    border-top-color: var(--stg-accent);
    border-radius: 50%;
    animation: stg-spin 0.8s linear infinite;
  }

  .stg-root .stg-error-state {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    background: #fff5f5;
    border: 1px solid #fcd5d5;
    border-radius: var(--stg-radius);
    padding: 20px 24px;
    margin-top: 40px;
  }

  .stg-root .stg-error-icon {
    font-size: 14px;
    font-weight: 900;
    color: var(--stg-danger);
    background: #ffe4e4;
    border-radius: 50%;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .stg-root .stg-error-state strong { font-size: 14px; display: block; margin-bottom: 4px; color: var(--stg-text); }
  .stg-root .stg-error-state p { font-size: 13px; color: var(--stg-muted); }

  @media (max-width: 560px) {
    .stg-root { padding: 10px 16px; }
    .stg-root .stg-field-row { grid-template-columns: 1fr; }
    .stg-root .stg-field-control { align-items: flex-start; }
    .stg-section-card { padding: 20px 18px; }
    .stg-root .stg-num-input, .stg-root .stg-input-wrap .stg-num-input { width: 100%; text-align: left; }
    .stg-root .stg-threshold-track { width: 100%; }
  }
`;

const SettingsPanel = () => {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/admin/config");
      setConfig(data);
      setDraft({ alert_threshold: data.alert_threshold, alert_dedup_seconds: data.alert_dedup_seconds });
      setError(null);
    } catch (e) { setError(e.detail || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true); setToast("");
    try {
      const saved = await fetchApi("/admin/config", {
        method: "PATCH",
        body: JSON.stringify({ alert_threshold: Number(draft.alert_threshold), alert_dedup_seconds: Number(draft.alert_dedup_seconds) }),
      });
      setConfig(saved);
      setDraft({ alert_threshold: saved.alert_threshold, alert_dedup_seconds: saved.alert_dedup_seconds });
      setToast("Changes saved and live across all sessions");
      setTimeout(() => setToast(""), 3500);
    } catch (e) { setError(e.detail || e.message); }
    finally { setSaving(false); }
  };

  const dirty = config && (
    Number(draft.alert_threshold) !== config.alert_threshold ||
    Number(draft.alert_dedup_seconds) !== config.alert_dedup_seconds
  );

  const thresholdPct = Math.round((Number(draft.alert_threshold || 0) / 25) * 100);

  if (loading) return (
    <div className="stg-root">
      <style>{SETTINGS_CSS}</style>
      <div className="stg-loading-state">
        <div className="stg-loader" />
        <span>Loading configuration…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="stg-root">
      <style>{SETTINGS_CSS}</style>
      <div className="stg-error-state">
        <span className="stg-error-icon">!</span>
        <div><strong>Configuration error</strong><p>{error}</p></div>
      </div>
    </div>
  );

  if (!config) return null;

  return (
    <div className="stg-root">
      <style>{SETTINGS_CSS}</style>

      {/* ── Page Header ── */}
      <motion.header
        className="stg-page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="stg-header-eyebrow">Admin Console</div>
        <h1 className="stg-page-title">System Settings</h1>
        <p className="stg-page-desc">Runtime overrides take effect immediately and survive restart.</p>
      </motion.header>

      {/* ── Alert Configuration ── */}
      <SettingsSectionCard title="Alert Configuration" subtitle="Control when and how the system surfaces notifications.">
        <div className="stg-fields">

          <div className="stg-field-row">
            <div className="stg-field-meta">
              <span className="stg-field-label">Alert Threshold</span>
              <span className="stg-field-hint">
                Alerts fire when severity × machine significance ≥ this value. Higher = fewer, more critical alerts only.
              </span>
            </div>
            <div className="stg-field-control">
              <input
                type="number" min={1} max={25}
                value={draft.alert_threshold ?? ""}
                onChange={e => setDraft(d => ({ ...d, alert_threshold: e.target.value }))}
                className="stg-num-input"
              />
              <div className="stg-threshold-track">
                <div className="stg-threshold-fill" style={{ width: `${thresholdPct}%` }} />
              </div>
              <span className="stg-range-label">{thresholdPct}% of max (25)</span>
            </div>
          </div>

          <div className="stg-divider" />

          <div className="stg-field-row">
            <div className="stg-field-meta">
              <span className="stg-field-label">Deduplication Window</span>
              <span className="stg-field-hint">
                Suppress repeated alerts for the same machine + error code pair within this window. Set to 0 to disable.
              </span>
            </div>
            <div className="stg-field-control">
              <div className="stg-input-wrap">
                <input
                  type="number" min={0} max={86400}
                  value={draft.alert_dedup_seconds ?? ""}
                  onChange={e => setDraft(d => ({ ...d, alert_dedup_seconds: e.target.value }))}
                  className="stg-num-input"
                />
                <span className="stg-time-badge">{fmtTime(Number(draft.alert_dedup_seconds))}</span>
              </div>
              <span className="stg-range-label">seconds · max 86 400 (24 h)</span>
            </div>
          </div>

        </div>

        <div className="stg-save-row">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`stg-save-btn ${dirty ? "stg-active" : ""}`}
          >
            {saving
              ? <><div className="stg-btn-spinner" /><span>Saving…</span></>
              : <><span>↑</span><span>Save Changes</span></>
            }
          </button>

          <AnimatePresence>
            {toast && (
              <motion.div
                className="stg-toast"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="stg-toast-dot" />{toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SettingsSectionCard>

      {/* ── Environment ── */}
      <SettingsSectionCard
        title="Environment"
        subtitle={<>Loaded from <code className="stg-mono">.env</code> at startup — edit on the server to change.</>}
      >
        <div className="stg-env-grid">
          <div>
            <p className="stg-env-key">Admin Emails</p>
            <div className="stg-tag-row">
              {(config.admin_emails || []).length === 0
                ? <span className="stg-empty-note">None — magic-link login disabled</span>
                : config.admin_emails.map(e => <SettingsTag key={e}>{e}</SettingsTag>)
              }
            </div>
          </div>
          <div>
            <p className="stg-env-key">Worker Expertise Domains</p>
            <div className="stg-tag-row">
              {(config.allowed_domains || []).map(d => <SettingsTag key={d}>{d}</SettingsTag>)}
            </div>
          </div>
        </div>
      </SettingsSectionCard>

    </div>
  );
};






const BADGE_MAP = {
  'auth.admin_login':        'Login',
  'auth.admin_logout':       'Logout',
  'machine.create':          'Machine Created',
  'machine.delete':          'Machine Deleted',
  'machine.ingest_complete': 'Ingest Complete',
  'machine.ingest_failed':   'Ingest Failed',
};

const fmtTs = (ts) => {
  try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 19); } catch { return ts; }
};

const AuditPanel = () => {
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState(new Set());
  const [syncing, setSyncing]   = useState(false);

  const load = useCallback(async (f = filter) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '200' });
      if (f !== 'all') qs.set('action_prefix', f === 'auth' ? 'auth.' : 'machine.');
      const d = await fetchApi(`/admin/audit?${qs}`);
      setEntries(d.entries || []);
      setError(null);
    } catch (e) {
      setError(e.detail || e.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(filter); }, [filter, load]);

  const handleSync = async () => {
    setSyncing(true);
    await load(filter);
    setSyncing(false);
  };

  const toggleExpanded = (idx) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => (e.action || '').startsWith(filter === 'auth' ? 'auth.' : 'machine.'));

  return (
    <div style={s.root}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={s.pageHeader}>
        <div style={s.eyebrow}>Admin Console</div>
        <h1 style={s.pageTitle}>Audit Log</h1>
        <p style={s.pageDesc}>Append-only security record · last 200 events</p>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <div style={s.filterWrap}>
          {[
            { id: 'all',     label: 'All activity' },
            { id: 'auth',    label: 'Authentication' },
            { id: 'machine', label: 'Machine events' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setExpanded(new Set()); }}
              style={{ ...s.pill, ...(filter === f.id ? s.pillActive : {}) }}
              className="pill-btn"
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={handleSync} style={s.syncBtn} className="sync-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.6s', transform: syncing ? 'rotate(360deg)' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Sync
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Table card */}
      <div style={s.card}>
        {loading && filtered.length === 0 ? (
          <div style={s.loadState}>
            <div className="spinner" />
            <span style={{ fontSize: 13, color: '#6b7a9e' }}>Retrieving secure logs…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9d5ee" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#0f1c3f', marginBottom: 4 }}>No events found</p>
            <p style={{ fontSize: 12, color: '#6b7a9e' }}>The audit ledger is empty for this filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Timestamp <span style={s.thMono}>(utc)</span></th>
                  <th style={s.th}>Event</th>
                  <th style={s.th}>Principal</th>
                  <th style={s.th}>Resource</th>
                  <th style={s.th}>Origin IP</th>
                  <th style={s.th}>Status</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const isOpen    = expanded.has(i);
                  const isFail    = e.status === 'failure';
                  const hasDetail = e.details && Object.keys(e.details).length > 0;
                  const initials  = (e.actor || '?').charAt(0).toUpperCase();
                  const label     = BADGE_MAP[e.action] || e.action;

                  return (
                    <React.Fragment key={`${e.ts}-${i}`}>
                      <tr
                        onClick={() => toggleExpanded(i)}
                        style={{ ...s.tr, ...(isOpen ? s.trOpen : {}) }}
                        className="audit-row"
                      >
                        {/* Timestamp */}
                        <td style={s.td}>
                          <span style={{ ...s.monoSm, color: isOpen ? 'rgb(45,140,255)' : '#6b7a9e', fontWeight: isOpen ? 500 : 400 }}>
                            {fmtTs(e.ts)}
                          </span>
                        </td>

                        {/* Event badge — only 2 variants: default and failure */}
                        <td style={s.td}>
                          <span style={isFail ? s.badgeFail : s.badgeDefault}>
                            {label}
                          </span>
                        </td>

                        {/* Principal */}
                        <td style={s.td}>
                          <div style={s.actorWrap}>
                            <div style={s.avatar}>{initials}</div>
                            <span style={s.actorName}>{e.actor || 'Anonymous'}</span>
                          </div>
                        </td>

                        {/* Resource */}
                        <td style={s.td}>
                          <span style={s.monoChip}>{e.target || '*'}</span>
                        </td>

                        {/* IP */}
                        <td style={s.td}>
                          <span style={s.monoSm}>{e.ip || '—'}</span>
                        </td>

                        {/* Status — text only, no dot */}
                        <td style={s.td}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isFail ? '#e03b3b' : 'rgb(45,140,255)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}>
                            {isFail ? 'REJECTED' : 'SUCCESS'}
                          </span>
                        </td>

                        {/* Expand */}
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          {hasDetail && (
                            <button
                              onClick={ev => { ev.stopPropagation(); toggleExpanded(i); }}
                              style={{ ...s.expandBtn, ...(isOpen ? s.expandBtnOpen : {}) }}
                              className="expand-btn"
                              aria-label={isOpen ? 'Collapse payload' : 'Expand payload'}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Payload drawer */}
                      {isOpen && hasDetail && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div style={s.payloadWrap}>
                              <div style={s.payloadLabel}>Event payload</div>
                              <pre style={s.payloadPre}>{JSON.stringify(e.details, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={s.footer}>
          <span style={s.footerLeft}>
            Showing {filtered.length} log {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
          <span style={s.footerRight}>
            <span style={s.liveDot} className="live-dot" />
            Real-time sync active
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────── */
const s = {
  root: {
    fontFamily: "'Inter', sans-serif",
    background: '#ffffff',
    color: '#0f1c3f',
    minHeight: '100vh',
    padding: '40px 32px',
    maxWidth: 1100,
    margin: '0 auto',
  },
  pageHeader: { marginBottom: 28 },
  eyebrow: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: 'rgb(45,140,255)', marginBottom: 8,
  },
  pageTitle: {
    fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800,
    letterSpacing: '-0.03em', lineHeight: 1.06,
    color: '#0f1c3f', marginBottom: 6,
  },
  pageDesc: { fontSize: 13, color: '#6b7a9e' },

  controls: { 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
    background: '#ffffff', border: '1px solid #e2e8f4', borderRadius: 12, 
    padding: '6px', marginBottom: 20,
    boxShadow: '0 2px 8px rgba(15,28,63,0.04)' 
  },
  filterWrap: { display: 'flex', gap: 4 },
  pill: {
    fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
    cursor: 'pointer', border: 'none', background: 'transparent',
    color: '#6b7a9e', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
  },
  pillActive: { background: '#0f1c3f', color: '#ffffff' },
  syncBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
    padding: '8px 16px', borderRadius: 8,
    border: 'none', background: 'transparent',
    color: '#6b7a9e', cursor: 'pointer', transition: 'all 0.2s',
    letterSpacing: '0.04em',
  },

  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', borderRadius: 10,
    background: '#fff5f5', border: '1px solid #fcd5d5',
    color: '#e03b3b', fontSize: 13, fontWeight: 600, marginBottom: 14,
  },

  card: {
    background: '#fff', border: '1px solid #e2e8f4', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(15,28,63,0.06)', overflow: 'hidden',
    position: 'relative',
  },

  loadState: { padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyState: { padding: '48px 24px', textAlign: 'center' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  theadRow: { borderBottom: '1px solid #e2e8f4', background: '#ffffff' },
  th: {
    padding: '11px 16px', textAlign: 'left',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: '#0f1c3f',
    fontFamily: "'Inter', sans-serif",
  },
  thMono: { fontFamily: "'DM Mono', monospace", fontSize: 9, textTransform: 'lowercase', letterSpacing: 0 },

  tr: { borderBottom: '1px solid #e2e8f4', cursor: 'pointer', transition: 'background 0.14s' },
  trOpen: { background: '#e8f3ff', borderLeft: '2px solid rgb(45,140,255)' },
  td: { padding: '10px 16px', verticalAlign: 'middle' },

  /* Badges — just 2: default (neutral) and fail (red) */
  badgeDefault: {
    display: 'inline-block',
    fontSize: 10, fontWeight: 700,
    padding: '3px 9px', borderRadius: 6,
    background: '#ffffff', color: '#0f1c3f',
    border: '1px solid #e2e8f4',
    fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
  },
  badgeFail: {
    display: 'inline-block',
    fontSize: 10, fontWeight: 700,
    padding: '3px 9px', borderRadius: 6,
    background: '#fff5f5', color: '#e03b3b',
    border: '1px solid #fcd5d5',
    fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
  },

  actorWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#e8f3ff', border: '1px solid #c9d5ee',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: 'rgb(45,140,255)', flexShrink: 0,
    fontFamily: "'Inter', sans-serif",
  },
  actorName: { fontSize: 12, fontWeight: 600, color: '#0f1c3f' },

  monoSm: { fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b7a9e' },
  monoChip: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b7a9e',
    display: 'inline-block',
  },

  expandBtn: {
    padding: '4px 7px', borderRadius: 6,
    border: '1px solid #e2e8f4', background: '#ffffff',
    cursor: 'pointer', color: '#6b7a9e', transition: 'all 0.18s',
    display: 'inline-flex', alignItems: 'center',
  },
  expandBtnOpen: { background: 'rgb(45,140,255)', borderColor: 'rgb(45,140,255)', color: '#fff' },

  payloadWrap: {
    background: '#071226', margin: '0 16px 12px',
    borderRadius: 10, padding: '12px 14px',
    borderLeft: '2px solid rgb(45,140,255)',
  },
  payloadLabel: {
    fontFamily: "'DM Mono', monospace", fontSize: 9,
    color: '#5aadff', letterSpacing: '0.14em',
    textTransform: 'uppercase', marginBottom: 6,
  },
  payloadPre: {
    fontFamily: "'DM Mono', monospace", fontSize: 11,
    color: '#a8d4ff', overflowX: 'auto', lineHeight: 1.6, margin: 0,
  },

  footer: {
    background: '#ffffff', borderTop: '1px solid #e2e8f4',
    padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  footerLeft: { fontSize: 10, fontWeight: 700, color: '#a0acc8', letterSpacing: '0.1em', textTransform: 'uppercase' },
  footerRight: { fontSize: 10, fontWeight: 600, color: 'rgb(45,140,255)', display: 'flex', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: 'rgb(45,140,255)', display: 'inline-block' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  .audit-row:hover { background: #f8faff !important; }
  .pill-btn:hover:not([style*="color: #ffffff"]) { background: #f4f8ff !important; color: #0f1c3f !important; }
  .sync-btn:hover { background: #f4f8ff !important; color: #0f1c3f !important; }
  .expand-btn:hover { background: rgb(45,140,255) !important; border-color: rgb(45,140,255) !important; color: #fff !important; }

  .spinner {
    width: 20px; height: 20px;
    border: 2px solid #e2e8f4;
    border-top-color: rgb(45,140,255);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .live-dot { animation: pulse 1.8s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
`;


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

/* ─── Palette ──────────────────────────────────────────────────────── */
const P = {
  mint:    '#c0e1d2',
  sage:    '#e5eee4',
  cream:   '#f6f4e8',
  rose:    '#dc9b9b',
  blue:    '#2D8CFF',
  deep:    '#0f1c3f',
  text:    '#2e4e40',
  muted:   '#6d7c74',
  border:  '#e2e8f4',
  hover:   '#f8faff',
  activeB: '#e8f3ff',
};

const SEV_DONUT  = { 1: '#c0e1d2', 2: '#b8cc9a', 3: '#d4c070', 4: '#dc9b9b', 5: '#0f1c3f' };
const SEV_LABEL  = { 1: 'Informational', 2: 'Minor', 3: 'Degraded', 4: 'Production Impact', 5: 'Safety Risk' };
const SEV_BORDER = { 1: '#8ecfb8', 2: '#b8d4b5', 3: '#d4c88a', 4: '#dc9b9b', 5: '#505c7a' };

/* ─── Shared atoms ─────────────────────────────────────────────────── */
const ANALYTICS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');
  @keyframes sl-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  .sl-row:hover td { background: ${P.hover} !important; }
  .sl-sync:hover { background: ${P.blue} !important; color:#fff !important; }
`;

const tableCard = {
  background: '#fff', border: `1px solid ${P.border}`, borderRadius: 16,
  boxShadow: '0 2px 12px rgba(15,28,63,.06)', overflow: 'hidden',
};
const sectionCard = {
  background: '#fff', border: `1px solid ${P.border}`, borderRadius: 16,
  boxShadow: '0 2px 12px rgba(15,28,63,.06)', padding: '20px 24px',
};

const TH = (w, align = 'left', minW) => ({
  padding: '11px 14px', textAlign: align,
  fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
  color: P.deep, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
  width: w, minWidth: minW || 'auto',
});
const TD = (align = 'left') => ({ padding: '10px 14px', verticalAlign: 'middle', textAlign: align });
const mono = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };
const ctrlLabel = { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: P.muted };
const selectSt = {
  fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
  padding: '6px 22px 6px 0', border: 'none', borderBottom: `1px solid ${P.border}`,
  background: '#fff', color: P.deep, outline: 'none', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232D8CFF' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right center',
};
const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: P.deep, fontFamily: "'Inter', sans-serif", marginBottom: 4 };
const sectionSub   = { ...mono, fontSize: 10, color: P.muted, marginBottom: 16 };

const QuestionItem = ({ q }) => {
  const [isOpen, setIsOpen] = useState(false);
  const machineLabel = (q.machine || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
  return (
    <div className="flex flex-col bg-[#F0F0F0] mb-0.5 last:mb-0 transition-colors hover:bg-[#E5E5E5]">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer"
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[15px] font-medium text-black truncate">{q.question}</span>
          {machineLabel && (
            <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-tecdia-text/45">
              {machineLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-mono tabular-nums text-tecdia-text/45 font-semibold">×{q.count}</span>
          <span className="text-black text-2xl leading-none font-light">{isOpen ? '−' : '+'}</span>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-sm text-tecdia-text/70 border-t border-black/5 pt-3">
              This query has been asked <strong>{q.count}</strong> {q.count === 1 ? 'time' : 'times'}.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Most-asked questions, flat list. Initial render shows TOP_N, "Show more"
// expands the rest into a scroll area so the card doesn't dominate the page.
const TOP_QUESTIONS_INITIAL = 5;
const TopQuestions = ({ questions }) => {
  const [expanded, setExpanded] = useState(false);
  // Defensive sort — backend already orders by count, but if a caller wires
  // this up with a different source it'll still render the heaviest first.
  const sorted = [...questions].sort((a, b) => (b.count || 0) - (a.count || 0));
  const visible = expanded ? sorted : sorted.slice(0, TOP_QUESTIONS_INITIAL);
  const hiddenCount = Math.max(0, sorted.length - TOP_QUESTIONS_INITIAL);

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Most-asked questions</h3>
        <span className="text-[11px] font-mono text-tecdia-text/40 tabular-nums">{sorted.length} total</span>
      </div>
      <div className={`flex flex-col ${expanded ? 'custom-scrollbar max-h-[420px] overflow-y-auto pr-2' : ''}`}>
        {visible.map((q, i) => (
          <QuestionItem key={`${q.machine}_${q.question}_${i}`} q={q} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-4 w-full text-center text-[12px] font-bold uppercase tracking-[0.16em] text-tecdia-accent hover:text-tecdia-textDeep transition-colors"
        >
          {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
        </button>
      )}
    </SectionCard>
  );
};

// Sleek native-select wrapper used in the AnalyticsPanel filter row. Keeps
// the native <select> for accessibility/keyboard nav, but skins it with a
// custom chevron and the same surface treatment as the rest of the panel.
const AnalyticsFilter = ({ label, value, onChange, options, width = 160 }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-tecdia-text/45 uppercase tracking-[0.16em]">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth: width }}
        className="appearance-none bg-white border border-tecdia-border/80 rounded-lg pl-3.5 pr-9 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none transition-colors hover:border-tecdia-accent/60 focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tecdia-text/50"
      />
    </div>
  </div>
);

// Native date input styled to match AnalyticsFilter so the row looks uniform.
// Empty string = "no bound on this side" — backend treats both dates as
// optional, so leaving either blank just relaxes that end of the window.
const AnalyticsDateFilter = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-tecdia-text/45 uppercase tracking-[0.16em]">
      {label}
    </label>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border border-tecdia-border/80 rounded-lg px-3 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none transition-colors hover:border-tecdia-accent/60 focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20"
    />
  </div>
);

const AnalyticsPanel = () => {
  const { machines } = useMachines();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [seeding, setSeeding] = useState(false);
  // Machine + top-N are client-side filters (the backend already returns
  // per-machine breakdowns we can slice). Everything else refetches the
  // analytics endpoint with query params so the backend re-aggregates from
  // a filtered query log.
  const [machineFilter, setMachineFilter] = useState('all');
  const [topN, setTopN] = useState(10);
  const [days, setDays] = useState('all');       // 'all' | '1' | '7' | '30'
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all'); // 'all' | '1'..'5'
  const [shift, setShift] = useState('all');       // 'all' | 'Morning' | 'Afternoon' | 'Night'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (days !== 'all')          params.set('days', days);
      if (category !== 'all')      params.set('category', category);
      if (severity !== 'all')      params.set('severity', severity);
      if (shift !== 'all')         params.set('shift', shift);
      if (machineFilter !== 'all') params.set('machine_id', machineFilter);
      // Date inputs only kick in if `days` is 'all' (backend prefers days
      // when both are present, but we suppress them here for clarity).
      if (days === 'all' && dateFrom) params.set('date_from', dateFrom);
      if (days === 'all' && dateTo)   params.set('date_to', dateTo);
      const qs = params.toString() ? `?${params}` : '';
      const d = await fetchApi(`/admin/analytics${qs}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.detail || e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days, category, severity, shift, dateFrom, dateTo, machineFilter]);

  const seed = async ({ replace = false } = {}) => {
    setSeeding(true);
    try {
      await fetchApi(`/admin/_seed-analytics?count=120&replace=${replace}`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e.detail || e.message || 'Failed to seed analytics');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  // Full-page spinner only on first load. Once we have data, the inline
  // "Loading…" indicator in the filter row takes over so changing a filter
  // doesn't flash the whole panel.
  if (loading && !data) {
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

  const {
    totals, per_machine, code_frequency, severity_distribution, queries_per_hour_24h,
    top_questions, failure_likelihood = [], depreciation = [],
  } = data;
  const isEmpty = totals.queries === 0;

  // Apply the machine filter to anything that carries a machine_id, then cap
  // the list-style widgets at `topN`. Donut + hourly bars are intentionally
  // left untouched — they're already small and don't carry machine_id rows.
  const matchesMachine = (item) => {
    if (machineFilter === 'all') return true;
    return item.machine_id === machineFilter || item.machine === machineFilter;
  };
  const filteredPerMachine = (per_machine || []).filter(matchesMachine);
  const filteredCodes = (code_frequency || []).filter(matchesMachine).slice(0, topN);
  const filteredQuestions = (top_questions || []).filter(matchesMachine).slice(0, topN);
  const filteredFailures = (failure_likelihood || []).filter(matchesMachine);
  const filteredDeprec = (depreciation || []).filter(matchesMachine);
  // Build dropdown options from whatever machines actually show up in the
  // analytics payload — avoids listing stale machines that have no activity.
  const machineOptions = Array.from(new Set([
    ...(per_machine || []).map(m => m.machine_id),
    ...(code_frequency || []).map(c => c.machine).filter(Boolean),
  ])).sort();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* ── header + refresh ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-tecdia-textDeep flex items-center gap-2.5">
            Fleet Analytics
          </h2>
          <p className="text-[11px] font-medium text-tecdia-text/40 uppercase tracking-widest mt-1 ml-8">Real-time system diagnostics & query analytics</p>
        </div>
        <div className="flex items-center gap-2 w-fit">
          <button
            onClick={() => seed({ replace: true })}
            disabled={seeding || loading}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 disabled:opacity-50"
            title="Replace the in-memory query log with synthetic demo data"
          >
            {seeding ? 'Seeding...' : isEmpty ? 'Populate Demo Data' : 'Re-seed Demo Data'}
          </button>
          <button
            onClick={load}
            className="btn-secondary text-xs px-5 py-2 flex items-center gap-2"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-2xl p-5 mb-6 text-sm text-tecdia-text/70 flex items-center justify-between gap-4">
          <div>
            <span className="font-bold text-tecdia-textDeep">No query data yet.</span>
            {' '}Click <span className="font-semibold text-tecdia-accent">Populate Demo Data</span> to load synthetic activity for the demo, or wait for workers to start asking questions.
          </div>
        </div>
      )}

      {/* ── Filters row ─────────────────────────────────────────────── */}
      {(() => {
        // Categories are sourced from the machines context so admin-added
        // machines surface naturally. De-duped + sorted for the dropdown.
        const categoryOptions = Array.from(
          new Set((machines || []).map(m => m.category).filter(Boolean))
        ).sort();
        const filtersActive =
          machineFilter !== 'all' || topN !== 10 || days !== 'all'
          || category !== 'all' || severity !== 'all' || shift !== 'all'
          || dateFrom !== '' || dateTo !== '';
        const clearAll = () => {
          setMachineFilter('all'); setTopN(10); setDays('all');
          setCategory('all'); setSeverity('all'); setShift('all');
          setDateFrom(''); setDateTo('');
        };
        return (
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <AnalyticsFilter
              label="Machine"
              value={machineFilter}
              onChange={setMachineFilter}
              options={[
                { value: 'all', label: 'All machines' },
                ...machineOptions.map(id => ({
                  value: id,
                  label: id.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                })),
              ]}
            />
            <AnalyticsFilter
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                { value: 'all', label: 'All categories' },
                ...categoryOptions.map(c => ({ value: c, label: c })),
              ]}
              width={170}
            />
            <AnalyticsFilter
              label="Severity"
              value={severity}
              onChange={setSeverity}
              options={[
                { value: 'all', label: 'All severities' },
                { value: '1', label: 'Severity 1' },
                { value: '2', label: 'Severity 2' },
                { value: '3', label: 'Severity 3' },
                { value: '4', label: 'Severity 4' },
                { value: '5', label: 'Severity 5' },
              ]}
              width={150}
            />
            <AnalyticsFilter
              label="Shift"
              value={shift}
              onChange={setShift}
              options={[
                { value: 'all',       label: 'All shifts' },
                { value: 'Morning',   label: 'Morning' },
                { value: 'Afternoon', label: 'Afternoon' },
                { value: 'Night',     label: 'Night' },
              ]}
              width={140}
            />
            <AnalyticsFilter
              label="Time range"
              value={days}
              onChange={setDays}
              options={[
                { value: 'all', label: 'All time' },
                { value: '1',   label: 'Last 24 hours' },
                { value: '7',   label: 'Last 7 days' },
                { value: '30',  label: 'Last 30 days' },
              ]}
            />
            <AnalyticsDateFilter
              label="From"
              value={dateFrom}
              onChange={(v) => { setDateFrom(v); if (v) setDays('all'); }}
            />
            <AnalyticsDateFilter
              label="To"
              value={dateTo}
              onChange={(v) => { setDateTo(v); if (v) setDays('all'); }}
            />
            <AnalyticsFilter
              label="Show top"
              value={String(topN)}
              onChange={(v) => setTopN(Number(v))}
              options={[
                { value: '5',  label: 'Top 5' },
                { value: '10', label: 'Top 10' },
                { value: '20', label: 'Top 20' },
                { value: '999', label: 'Show all' },
              ]}
              width={130}
            />
            {filtersActive && (
              <button
                onClick={clearAll}
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-tecdia-accent hover:text-tecdia-textDeep transition-colors px-2 py-2 self-end"
              >
                Clear filters
              </button>
            )}
            {loading && (
              <span className="text-[11px] font-medium text-tecdia-text/40 px-2 py-2 self-end">Loading…</span>
            )}
          </div>
        );
      })()}

      <style>{ANALYTICS_CSS}</style>
      <div style={{ fontFamily:"'Inter', sans-serif", color:P.text, marginTop: 32, marginBottom: 32 }}>

        <section style={{ marginBottom:36 }}>
          <MachineTable data={filteredPerMachine} />
        </section>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, marginBottom:36 }}>
          <div style={sectionCard}><ErrorCodeTable codes={filteredCodes} /></div>
          <div style={sectionCard}><SeverityDonut distribution={severity_distribution} /></div>
        </div>

        <section style={{ marginBottom:36 }}>
          <ActivityBars buckets={queries_per_hour_24h} />
        </section>

        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          <FailureLikelihood rows={filteredFailures} />
          <AssetDepreciation rows={filteredDeprec} />
        </div>

      </div>

      {/* ── Top questions (flat list, machine shown per row) ────────── */}
      {filteredQuestions.length > 0 && (
        <TopQuestions questions={filteredQuestions} />
      )}
    </motion.div>
  );
};

const TableFooter = ({ shown, total, unit = 'entries' }) => (
  <div style={{ borderTop: `1px solid ${P.border}`, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={{ ...mono, fontWeight: 700, color: '#a0acc8', letterSpacing: '.1em', textTransform: 'uppercase' }}>
      Showing {shown} of {total} {unit}
    </span>
  </div>
);

const SevPill = ({ value }) => (
  <span style={{
    display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
    background: '#f4f6fb', color: P.deep, border: `1px solid ${P.border}`,
  }}>
    {value ? value.toFixed(1) : '0.0'}
  </span>
);

const CodeCountPill = ({ code, n }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    padding: '3px 8px', borderRadius: 20,
    background: '#f0f2f8', border: `1px solid ${P.border}`,
    whiteSpace: 'nowrap',
  }}>
    <span style={{ fontWeight: 700, color: P.deep }}>{code}</span>
    <span style={{ fontWeight: 400, color: P.muted }}>×{n}</span>
  </span>
);

/* ─── 1. MachineTable ──────────────────────────────────────────────── */
const MachineTable = ({ data = [] }) => {
  const [activeId, setActiveId] = useState(null);

  const rows = data;

  const totalQ = rows.reduce((a, r) => a + (r.query_count || 0), 0);
  const totalA = rows.reduce((a, r) => a + (r.alert_count || 0), 0);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${P.border}` }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:P.blue, marginBottom:4 }}>Analytics</div>
          <h2 style={{ fontSize:22, fontWeight:700, color:P.deep, letterSpacing:'-.02em', margin:'0 0 4px' }}>Per-machine activity</h2>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:P.muted }}>Query &amp; alert breakdown across all machines</div>
        </div>
        <div style={{ display:'flex', gap:32 }}>
          {[['Queries',totalQ],['Alerts',totalA],['Machines',rows.length]].map(([l,n]) => (
            <div key={l}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:22, fontWeight:700, lineHeight:1, color:P.blue }}>{n}</div>
              <div style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:'.12em', color:P.muted, marginTop:5 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 20 }}></div>

      <div style={tableCard}>
        {rows.length === 0
          ? <div style={{ padding:'32px 16px', textAlign:'center', fontSize:12, color:P.muted, fontStyle:'italic' }}>No machines match the current filter.</div>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <colgroup>
                  <col style={{ width:'22%' }} />
                  <col style={{ width:'9%' }} />
                  <col style={{ width:'8%' }} />
                  <col style={{ width:'9%' }} />
                  <col style={{ width:'12%' }} />
                  <col style={{ width:'40%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${P.border}`, background:'#fafbfd' }}>
                    <th style={TH(undefined,'left','140px')}>Machine</th>
                    <th style={TH(undefined,'right','64px')}>Queries</th>
                    <th style={TH(undefined,'right','56px')}>Alerts</th>
                    <th style={TH(undefined,'right','56px')}>Rate</th>
                    <th style={TH(undefined,'right','88px')}>Avg Severity</th>
                    <th style={TH(undefined,'left','180px')}>Top Alarm Codes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(m => {
                    const isActive = activeId === m.machine_id;
                    return (
                      <tr key={m.machine_id} className="sl-row" onClick={() => setActiveId(isActive ? null : m.machine_id)}
                        style={{ borderBottom:`1px solid ${P.border}`, cursor:'pointer', borderLeft:isActive?`3px solid ${P.blue}`:'3px solid transparent' }}>
                        <td style={{ ...TD(), background: isActive ? P.activeB : '#fff' }}>
                          <span style={{ fontSize:12, fontWeight:600, color:P.deep }}>{m.display_name}</span>
                        </td>
                        <td style={{ ...TD('right'), background: isActive ? P.activeB : '#fff' }}>
                          <span style={{ ...mono, color:P.deep }}>{m.query_count}</span>
                        </td>
                        <td style={{ ...TD('right'), background: isActive ? P.activeB : '#fff' }}>
                          <span style={{ ...mono, fontWeight:600, color:P.deep }}>{m.alert_count}</span>
                        </td>
                        <td style={{ ...TD('right'), background: isActive ? P.activeB : '#fff' }}>
                          <span style={{ ...mono, color:P.muted }}>{m.alert_rate_pct?.toFixed(1)}%</span>
                        </td>
                        <td style={{ ...TD('right'), background: isActive ? P.activeB : '#fff' }}>
                          <SevPill value={m.avg_severity} />
                        </td>
                        <td style={{ ...TD(), background: isActive ? P.activeB : '#fff' }}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {!m.most_asked_codes || m.most_asked_codes.length === 0
                              ? <span style={{ fontSize:11, color:'#a0acc8', fontStyle:'italic' }}>No codes</span>
                              : m.most_asked_codes.slice(0, 3).map(([c, n]) => (
                                  <CodeCountPill key={c} code={c} n={n} />
                                ))
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
        <TableFooter shown={rows.length} total={data.length} unit="machines" />
      </div>
    </div>
  );
};

/* ─── 2. ErrorCodeTable ────────────────────────────────────────────── */
const ErrorCodeTable = ({ codes = [] }) => (
  <div>
    <div style={{ marginBottom: 14 }}>
      <div style={sectionTitle}>Top Error / Alarm Codes</div>
      <div style={{ ...mono, fontSize: 10, color: P.muted, marginTop: 2 }}>Frequency across all machines</div>
    </div>
    <div style={tableCard}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: '52%' }} />
          <col style={{ width: '38%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `1px solid ${P.border}`, background: '#fafbfd' }}>
            <th style={TH(undefined, 'right', '36px')}>#</th>
            <th style={TH(undefined, 'left',  '80px')}>Code</th>
            <th style={TH(undefined, 'right', '70px')}>Count</th>
          </tr>
        </thead>
      </table>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '52%' }} />
            <col style={{ width: '38%' }} />
          </colgroup>
          <tbody>
            {codes.map((c, i) => (
              <tr key={`${c.code}-${i}`} className="sl-row" style={{ borderBottom: `1px solid ${P.border}` }}>
                <td style={{ ...TD('right') }}>
                  <span style={{ ...mono, fontWeight: 700, color: '#a0acc8' }}>{i + 1}</span>
                </td>
                <td style={TD()}>
                  <CodeCountPill code={c.code} n={c.count} />
                </td>
                <td style={{ ...TD('right') }}>
                  <span style={{ ...mono, fontWeight: 700, color: P.deep }}>{c.count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFooter shown={codes.length} total={codes.length} unit="codes" />
    </div>
  </div>
);

/* ─── 3. SeverityDonut ─────────────────────────────────────────────── */
const SeverityDonut = ({ distribution = {} }) => {
  const [hovered, setHovered] = useState(null);
  const entries = Object.entries(distribution).sort((a, b) => Number(a[0]) - Number(b[0]));
  const total = entries.reduce((s, [, c]) => s + c, 0);
  if (!total) return null;
  const r = 40, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div>
      <div style={sectionTitle}>Severity Distribution</div>
      <div style={{ height:4 }} />
      <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
        <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
          <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)', overflow:'visible' }}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#F0F0F0" strokeWidth="8"/>
            {entries.map(([sev, count]) => {
              const pct = count / total; if (!pct) return null;
              const dash = pct * circ, offset = -acc * circ; acc += pct;
              const isH = hovered === sev;
              return <circle key={sev} cx="50" cy="50" r={r} fill="none" stroke={SEV_DONUT[sev]}
                strokeWidth={isH ? 11 : 8} strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset} strokeLinecap="butt"
                style={{ transition:'stroke-width .2s', cursor:'pointer' }}
                onMouseEnter={() => setHovered(sev)} onMouseLeave={() => setHovered(null)}/>;
            })}
            <circle cx="50" cy="50" r="34" fill="white"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:18, fontWeight:700, color:P.deep, lineHeight:1 }}>{total}</span>
            <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.15em', color:P.muted, marginTop:3 }}>Queries</span>
          </div>
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
          {entries.map(([sev, count]) => {
            const pct = Math.round((count / total) * 100), isH = hovered === sev;
            return (
              <div key={sev} onMouseEnter={() => setHovered(sev)} onMouseLeave={() => setHovered(null)}
                style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', transform:isH?'translateX(4px)':'none', transition:'transform .15s' }}>
                <span style={{ width:10, height:10, borderRadius:2, background:SEV_DONUT[sev], border:`1px solid ${SEV_BORDER[sev]}`, flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:11, fontWeight:isH?600:400, color:isH?P.deep:P.text, transition:'color .15s' }}>Lv{sev} — {SEV_LABEL[sev]}</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, color:P.deep, width:24, textAlign:'right' }}>{count}</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:P.muted, width:28, textAlign:'right' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── 4. ActivityBars ──────────────────────────────────────────────── */
const ActivityBars = ({ buckets = [] }) => {
  const max = Math.max(1, ...buckets.map(b => b.count || 0));
  return (
    <div style={sectionCard}>
      <div style={sectionTitle}>Query volume — last 24h (UTC)</div>
      <div style={{ height:4 }} />
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:100, paddingBottom:8 }}>
        {buckets.map(b => (
          <div key={b.hour} style={{ flex:1, minWidth:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%', gap:4 }}>
            <motion.div initial={{ height:0 }} animate={{ height:`${((b.count || 0) / max) * 80}px` }}
              transition={{ duration:0.7, ease:'easeOut' }}
              style={{ width:'100%', background: P.blue, borderRadius:'3px 3px 0 0', minHeight:(b.count || 0) > 0 ? 2 : 0 }}/>
            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:P.muted, fontWeight:600 }}>
              {b.hour ? b.hour.split(':')[0] : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── 5. FailureLikelihood ─────────────────────────────────────────── */
const FailureLikelihood = ({ rows = [] }) => {
  const [activeId, setActiveId] = useState(null);
  return (
    <div style={{ flex:1 }}>
      <div style={{ marginBottom:16 }}>
        <div style={sectionTitle}>Failure likelihood</div>
        <div style={sectionSub}>Poisson estimate from last 7 days of alerts</div>
      </div>
      <div style={tableCard}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <colgroup>
              <col style={{ width:'36%' }} />
              <col style={{ width:'20%' }} />
              <col style={{ width:'15%' }} />
              <col style={{ width:'15%' }} />
              <col style={{ width:'14%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom:`1px solid ${P.border}`, background:'#fafbfd' }}>
                <th style={TH(undefined,'left','140px')}>Machine</th>
                <th style={TH(undefined,'right','72px')}>λ / day</th>
                <th style={TH(undefined,'right','48px')}>24H</th>
                <th style={TH(undefined,'right','40px')}>7D</th>
                <th style={TH(undefined,'right','40px')}>30D</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isActive = activeId === r.machine_id;
                const bg = isActive ? P.activeB : '#fff';
                return (
                  <tr key={r.machine_id} className="sl-row" onClick={() => setActiveId(isActive ? null : r.machine_id)}
                    style={{ borderBottom:`1px solid ${P.border}`, cursor:'pointer', borderLeft:isActive?`3px solid ${P.blue}`:'3px solid transparent' }}>
                    <td style={{ ...TD(), background:bg }}>
                      <div style={{ fontSize:12, fontWeight:600, color:P.deep }}>{r.display_name}</div>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:P.muted, marginTop:2 }}>{r.alerts_7d} alerts/7d</div>
                    </td>
                    <td style={{ ...TD('right'), background:bg }}>
                      <span style={{ ...mono, fontWeight:600, color:P.deep }}>{r.lambda_per_day?.toFixed(2)}</span>
                    </td>
                    {[r.prob_24h_pct, r.prob_7d_pct, r.prob_30d_pct].map((pct, j) => (
                      <td key={j} style={{ ...TD('right'), background:bg }}>
                        <span style={{ ...mono, fontWeight:700, color:P.deep }}>{pct}%</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TableFooter shown={rows.length} total={rows.length} unit="machines" />
      </div>
    </div>
  );
};

/* ─── 6. AssetDepreciation ─────────────────────────────────────────── */
const AssetDepreciation = ({ rows = [] }) => {
  const [activeId, setActiveId] = useState(null);
  const fmt = n => `₹${(n / 100000).toFixed(1)}L`;
  return (
    <div style={{ flex:1 }}>
      <div style={{ marginBottom:16 }}>
        <div style={sectionTitle}>Asset depreciation</div>
        <div style={sectionSub}>Straight-line, 12-month trailing</div>
      </div>
      <div style={tableCard}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <colgroup>
              <col style={{ width:'40%', minWidth:'160px' }} />
              <col style={{ width:'22%', minWidth:'110px' }} />
              <col style={{ width:'18%', minWidth:'90px' }} />
              <col style={{ width:'20%', minWidth:'100px' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom:`1px solid ${P.border}`, background:'#fafbfd' }}>
                <th style={TH(undefined, 'left',  '160px')}>Machine</th>
                <th style={TH(undefined, 'right', '110px')}>Current Value</th>
                <th style={TH(undefined, 'right',  '90px')}>Remaining</th>
                <th style={TH(undefined, 'right', '100px')}>Monthly Loss</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isActive = activeId === r.machine_id;
                const bg = isActive ? P.activeB : '#fff';
                return (
                  <tr key={r.machine_id} className="sl-row" onClick={() => setActiveId(isActive ? null : r.machine_id)}
                    style={{ borderBottom:`1px solid ${P.border}`, cursor:'pointer', borderLeft:isActive?`3px solid ${P.blue}`:'3px solid transparent' }}>
                    <td style={{ ...TD(), background:bg }}>
                      <span style={{ fontSize:12, fontWeight:600, color:P.deep }}>{r.display_name}</span>
                    </td>
                    <td style={{ ...TD('right'), background:bg }}>
                      <span style={{ ...mono, fontWeight:700, color:P.deep }}>{fmt(r.current_value)}</span>
                    </td>
                    <td style={{ ...TD('right'), background:bg }}>
                      <span style={{ ...mono, fontWeight:600, color: r.pct_remaining < 50 ? '#844d4d' : P.text }}>{r.pct_remaining}%</span>
                    </td>
                    <td style={{ ...TD('right'), background:bg }}>
                      <span style={{ ...mono, color:P.muted }}>−{fmt(r.monthly_loss)}/mo</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TableFooter shown={rows.length} total={rows.length} unit="assets" />
      </div>
    </div>
  );
};


const AdminDashboard = () => {
  const { adminLogout } = useAdminAuth();
  const { machines, addMachine, deleteMachine, activeJob, clearActiveJob, retryUpload, canRetryUpload } = useMachines();
  const {
    alerts, alertThreshold, snoozes, dedupSeconds,
    clearAlerts, testAlert, acknowledgeAlert, snoozeMachine,
  } = useAlerts();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'add' ? 'add' : 'machines');
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState('');
  const [fileErrors, setFileErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Selected machine for the parameter-editor modal (opens from inside the
  // expanded card via its "Edit shift log parameters" button).
  const [selectedMachine, setSelectedMachine] = useState(null);
  // id of the machine card currently expanded inline. null = all collapsed.
  const [expandedMachineId, setExpandedMachineId] = useState(null);
  const fileInputRef = useRef();

  const [seenAlertsCount, setSeenAlertsCount] = useState(0);
  const unreadAlertsCount = Math.max(0, alerts.length - seenAlertsCount);

  useEffect(() => {
    if (activeTab === 'alerts') {
      setSeenAlertsCount(alerts.length);
    }
  }, [activeTab, alerts.length]);

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
  const isDefault = (id) => ['INJECTION_MOLDING_MACHINE', 'LASER_CUTTING_MACHINE'].includes(id?.toUpperCase());

  return (
    <div className="relative z-0 min-h-screen bg-white pt-0 text-tecdia-text transition-all duration-500">

      {/* ── Dynamic Full-Page Background for Add Machine & Alerts ── */}
      <AnimatePresence>
        {(activeTab === 'add' || activeTab === 'alerts') && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[-1] pointer-events-none bg-[#FFFFFF]"
          />
        )}
      </AnimatePresence>

      {/* ── Tab Bar — sticky at top, always visible when scrolled ── */}
      <div className="sticky left-0 right-0 top-0 z-50 border-b border-white/10 bg-black">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          {/* Logo & Tabs */}
          <div className="flex items-center overflow-x-auto scrollbar-hide h-full">
            
            {/* Admin Panel Logo */}
            <div className="mr-5 flex h-[34px] shrink-0 items-center gap-3 border-r border-white/10 pr-5">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white">SmartFix Admin</span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 shrink-0 h-full">
              {[
                { id: 'machines',  label: 'All Machines' },
              { id: 'add',       label: 'Add Machine' },
              { id: 'alerts',    label: 'Alert History', count: unreadAlertsCount },
              { id: 'analytics', label: 'Analytics' },
              { id: 'shift_logs',label: 'Shift Logs' },
              { id: 'audit',     label: 'Audit Log' },
              { id: 'settings',  label: 'Settings' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 text-white h-full"
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-0.5 text-[10px] font-bold text-white/50">
                    {tab.count}
                  </span>
                )}
                {tab.isNew && (
                  <span className="ml-1 bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    NEW
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div layoutId="admin-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
                )}
              </button>
            ))}
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-2">
            {(() => {
              const defaultCount = machines.filter(m => isDefault(m.id)).length;
              return [
                { icon: Database, label: 'Total',   value: machines.length },
                { icon: Package,  label: 'Default', value: defaultCount },
                { icon: Plus,     label: 'Custom',  value: Math.max(0, machines.length - defaultCount) },
              ];
            })().map(s => {
              return (
                <div key={s.label} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 py-1.5 font-inter text-white">
                  <span className="text-sm font-bold leading-none">{s.value}</span>
                  <span className="text-sm font-bold">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`mx-auto max-w-6xl px-5 sm:px-8 lg:px-10 ${activeTab === 'add' ? 'pb-0' : 'pb-10'}`}>

        {/* ── Global ingestion progress bar ── */}
        <AnimatePresence>
          {activeJob && (
            <IngestionProgress
              job={activeJob}
              onDismiss={clearActiveJob}
              onRetry={canRetryUpload ? retryUpload : undefined}
            />
          )}
        </AnimatePresence>

        {/* ══════════════ TAB: Machines ══════════════ */}
        {activeTab === 'machines' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min items-start">
              {machines.map((machine) => {
                const isExpanded = expandedMachineId === machine.id;
                return (
                  <MachineCard
                    key={machine.id}
                    machine={machine}
                    isDefault={isDefault(machine.id)}
                    onDelete={handleDelete}
                    confirmingDelete={deleteConfirm === machine.id}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedMachineId(isExpanded ? null : machine.id)}
                    onEditParameters={() => setSelectedMachine(machine)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

      </div>{/* close max-w-7xl — Add Machine goes full width */}

        {/* ══════════════ TAB: Add Machine ══════════════ */}
        {activeTab === 'add' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative"
            style={{ background: '#ffffff' }}
          >
            <div className="flex w-full min-h-[calc(100vh-60px)]">

              {/* ── LEFT: image collage ── */}
              <div
                className="hidden md:block w-1/2 sticky top-[60px] overflow-hidden"
                style={{ height: 'calc(100vh - 60px)', background: '#ffffff' }}
              >
                <div className="grid grid-cols-2 w-full h-full" style={{ gridTemplateRows: '50% 50%' }}>
                  
                  {/* branding strip (overlaid) */}
                  <div className="absolute top-0 left-0 right-0 z-20 pt-6 pl-8" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)', paddingBottom: '40px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: '#0f172a', textTransform: 'uppercase' }}>
                      Smartfix · Machine Registry
                    </span>
                  </div>

                  {/* laser cutter */}
                  <div className="relative overflow-hidden">
                    <img
                      src={laserImg}
                      alt="Laser Cutter"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.05) saturate(1.1)' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.1))' }} />
                  </div>

                  {/* welding sparks */}
                  <div className="relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80"
                      alt="Welding"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.05) saturate(1.1)' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.1))' }} />
                  </div>

                  {/* circuit board */}
                  <div className="relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80"
                      alt="Circuit board"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.05) saturate(1.1)' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.1))' }} />
                  </div>

                  {/* CNC machine */}
                  <div className="relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80"
                      alt="CNC machine"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(1.05) saturate(1.1)' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.1))' }} />
                  </div>
                </div>

                {/* bottom caption */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px', background: 'linear-gradient(0deg,rgba(255,255,255,0.95),transparent)' }}>
                  <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: 11, lineHeight: 1.6, fontWeight: 500 }}>
                    Upload a new machine to begin indexing diagnostic data and enable AI-powered fault analysis.
                  </p>
                </div>
              </div>

              {/* ── RIGHT: light form ── */}
              <div
                className="w-full md:w-1/2 px-10 py-6 relative z-10 overflow-y-auto"
                style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0', minHeight: 'calc(100vh - 60px)' }}
              >
                <form onSubmit={handleAddMachine} style={{ width: '100%' }}>

                  {/* ── Machine Details ── */}
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>Machine Details</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* Machine Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Machine Name *</label>
                        <input
                          type="text" required
                          value={form.name}
                          onChange={e => {
                            const name = e.target.value;
                            setForm(f => ({ ...f, name, machine_id: f._slugEdited ? f.machine_id : toSlug(name) }));
                          }}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 16px', color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>

                      {/* Machine ID */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Machine ID *</label>
                        <input
                          type="text" required
                          value={form.machine_id}
                          onChange={e => setForm(f => ({ ...f, machine_id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''), _slugEdited: true }))}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 16px', color: '#0f172a', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Description</label>
                        <textarea
                          rows={4}
                          placeholder="Brief description of this machine's diagnostic capabilities..."
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 16px', color: '#0f172a', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                          onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Category</label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            style={{ width: '100%', appearance: 'none', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 40px 12px 16px', color: form.category ? '#0f172a' : '#94a3b8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                          >
                            <option value="" style={{ background: '#ffffff', color: '#94a3b8' }}>Select a category…</option>
                            {CATEGORY_OPTIONS.map(c => (
                              <option key={c} value={c} style={{ background: '#ffffff', color: '#0f172a' }}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        </div>
                      </div>

                      {/* Significance slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Machine Significance</label>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>Level {form.significance}</span>
                        </div>
                        <input
                          type="range" min="1" max="5" step="1"
                          value={form.significance}
                          onChange={e => setForm(f => ({ ...f, significance: parseInt(e.target.value) }))}
                          style={{ width: '100%', height: 6, borderRadius: 4, background: '#e2e8f0', accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Low Impact</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mission Critical</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Appearance ── */}
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>Appearance</p>

                    {/* Icon upload */}
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Icon</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="file" accept="image/*" id="custom-icon-upload" className="hidden"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) setForm(f => ({ ...f, customIconUrl: URL.createObjectURL(file) }));
                        }}
                      />
                      <label htmlFor="custom-icon-upload"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                        <Image size={13} /> Upload Custom Icon
                      </label>
                      {form.customIconUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={form.customIconUrl} alt="custom icon" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          <button type="button" onClick={() => setForm(f => ({ ...f, customIconUrl: null }))}
                            style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    <div style={{ marginTop: 16 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Preview</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 16px' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, display: 'block' }}>{form.name || 'Machine Name'}</span>
                          {form.category && <span style={{ fontSize: 10, color: '#64748b' }}>{form.category}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Files & Media ── */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <p style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, fontFamily: "'Sora', sans-serif" }}>Files & Media</p>
                      {form.files.length > 0 && (
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontWeight: 600 }}>
                          {form.files.length} file{form.files.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <input ref={fileInputRef} type="file" accept=".pdf"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 50 * 1024 * 1024) { setFileErrors(['File exceeds 50 MB limit.']); return; }
                        setForm(f => ({ ...f, pdfFile: file, files: [{ name: file.name, type: 'pdf', size: file.size }] }));
                        setFileErrors([]);
                      }}
                      style={{ display: 'none' }}
                    />

                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      style={{
                        width: '100%', borderRadius: 14, padding: '48px 24px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        border: `1px dashed ${isDragging ? '#3b82f6' : '#cbd5e1'}`,
                        background: isDragging ? '#eff6ff' : '#ffffff',
                        transition: 'all 0.2s', transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ width: 72, height: 72, borderRadius: '50%', background: isDragging ? '#dbeafe' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <FileText size={32} style={{ color: '#3b82f6' }} />
                      </div>
                      <p style={{ fontSize: 15, color: isDragging ? '#2563eb' : '#64748b', marginBottom: 10, fontWeight: 500 }}>
                        {isDragging ? 'Drop your file here' : 'Drag and drop your file'}
                      </p>
                      {!isDragging && (
                        <>
                          <p style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>or</p>
                          <div
                            onClick={() => fileInputRef.current.click()}
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: 13, fontWeight: 600, padding: '8px 24px', borderRadius: 8, cursor: 'pointer', marginBottom: 16 }}>
                            Browse
                          </div>
                        </>
                      )}
                      <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>PDF, JPG, PNG, WebP &nbsp;|&nbsp; Max 10 MB</p>
                    </div>

                    {/* Errors */}
                    <AnimatePresence>
                      {fileErrors.map((err, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 500 }}>
                          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                          {err}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* File list */}
                    {form.files.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Uploaded</p>
                        {form.files.map((file, idx) => file.type === 'pdf' && (
                          <div key={idx} className="group/pdf"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={14} style={{ color: '#3b82f6' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                              <p style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
                            </div>
                            <button type="button" onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Submit ── */}
                  <button
                    type="submit"
                    disabled={!form.name.trim() || !form.machine_id.trim() || !form.pdfFile || isSubmitting}
                    style={
                      form.name.trim() && form.machine_id.trim() && form.pdfFile && !isSubmitting
                        ? { width: '100%', padding: '14px', borderRadius: 16, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: 'none', background: '#3b82f6', color: 'white', boxShadow: '0 4px 12px rgba(59,130,246,0.25)', cursor: 'pointer', transition: 'all 0.2s' }
                        : { width: '100%', padding: '14px', borderRadius: 16, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }
                    }
                  >
                    {isSubmitting
                      ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Uploading...</>
                      : <><Plus size={18} /> Upload & Index Machine</>}
                  </button>

                </form>
              </div>{/* end right */}
            </div>{/* end flex */}
          </motion.div>
        )}

      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">{/* reopen container for remaining tabs */}

        {/* ══════════════ TAB: Alerts ══════════════ */}
        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {alertThreshold && (
              <p className="text-sm font-inter text-slate-500 mb-4">
                Alerts fire when score ≥ {alertThreshold} of 25.
                {dedupSeconds > 0 && (
                  <> Repeats for the same machine + code within {Math.round(dedupSeconds / 60)} min are auto-deduped.</>
                )}
              </p>
            )}

            {Object.keys(snoozes).length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-slate-800">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Snoozed:</span>
                {Object.entries(snoozes).map(([mid, until]) => (
                  <span key={mid} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-300 px-3 py-1 font-semibold text-slate-800">
                    {mid.replaceAll('_', ' ')}
                    <span className="text-slate-500 text-[11px]">until {new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      onClick={() => snoozeMachine(mid, 0)}
                      className="text-slate-500 hover:text-slate-800 underline text-[11px]"
                    >
                      lift
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl md:text-4xl font-bold font-sora text-slate-800 tracking-tight flex items-center gap-3">
                Critical Fault Alerts
              </h2>
              <div className="flex items-center gap-6 mr-48">
                <button onClick={handleTestAlert} className="text-sm font-bold font-inter text-slate-500 hover:text-slate-700 transition-colors">
                  Inject Test Alert
                </button>
                {alerts.length > 0 && (
                  <button onClick={handleClearAlerts} className="text-sm font-bold font-inter text-slate-400 hover:text-slate-600 transition-colors">
                    Clear All History
                  </button>
                )}
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white border border-landing-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-landing-background border border-landing-border flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-landing-text/30" />
                </div>
                <p className="text-landing-textDeep font-bold font-sora text-xl">No critical alerts detected</p>
                <p className="text-landing-text/60 font-inter text-base max-w-sm mt-2">High-severity fault reports will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.alert_id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group relative border-b border-slate-200 pb-5 mb-5 last:border-b-0 last:mb-0 transition-all duration-300 ${
                      alert.acknowledged_at ? 'opacity-50' : ''
                    }`}
                  >
                    
                    <div>
                      <div className="flex gap-6">
                        {/* Main Info */}
                        <div className="flex-1">
                          <div className="mb-2 flex items-baseline gap-3">
                            <h3 className="text-base font-bold font-sora text-slate-800 tracking-tight uppercase">
                              {alert.machine_id.replaceAll('_', ' ')}
                            </h3>
                            <span className="text-[13px] font-medium font-inter text-slate-400">
                              {new Date(alert.notified_at).toLocaleString('en-US', { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold font-inter text-slate-800">
                              Score {alert.score}
                            </span>
                            <span className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold font-inter text-slate-800">
                              Severity {alert.severity_level}
                            </span>
                            <span className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold font-inter text-slate-800">
                              Priority {alert.machine_significance}
                            </span>
                            <span className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold font-inter text-slate-800">
                              {alert.email_notified ? 'System Notified' : 'Dispatch Pending'}
                            </span>
                          </div>

                          <p className="text-sm font-inter text-slate-600 leading-relaxed">
                            {alert.answer_excerpt || alert.question}
                          </p>
                        </div>

                        {/* Image - top-right aligned */}
                        <div className="shrink-0 self-start mr-48">
                          <div className="w-[120px] h-[90px] rounded-2xl overflow-hidden shadow-sm relative">
                            <img
                              src={ALERT_MACHINE_IMAGES[alert.machine_id] || bbImg}
                              alt={alert.machine_id}
                              className={`w-full h-full ${
                                alert.machine_id === 'HP_500_HYDRAULIC_PRESS'
                                  ? 'object-contain bg-white p-1'
                                  : 'object-cover'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action row — ack + per-machine snooze. Hides the
                          snooze button if the machine is already snoozed
                          (the global banner at the top of the panel
                          already shows the state + a "lift" link). */}
                      <div className="mt-4 flex items-center gap-3">
                        {alert.acknowledged_at ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold font-inter text-black">
                            <CheckCircle size={13} />
                            Acknowledged
                            {alert.acknowledged_by && <span className="font-medium">· {alert.acknowledged_by}</span>}
                          </span>
                        ) : (
                          <button
                            onClick={() => acknowledgeAlert(alert.alert_id)}
                            className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold font-inter text-slate-800 hover:bg-slate-50 transition-colors uppercase"
                          >
                            Acknowledge
                          </button>
                        )}
                        {!snoozes[alert.machine_id] && (
                          <button
                            onClick={() => snoozeMachine(alert.machine_id, 60)}
                            className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-800 transition-colors"
                            title="Mute alerts for this machine for 1 hour"
                          >
                            Snooze 1h
                          </button>
                        )}
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

        {/* ══════════════ TAB: Shift Logs ══════════════ */}
        {activeTab === 'shift_logs' && <ShiftLogsPanel />}

        {/* ══════════════ TAB: Audit Log ══════════════ */}
        {activeTab === 'audit' && <AuditPanel />}

        {/* ══════════════ TAB: Settings ══════════════ */}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>

      {/* Per-machine detail + parameter editor (opens on MachineCard click) */}
      <MachineDetailModal
        machine={selectedMachine}
        isOpen={!!selectedMachine}
        onClose={() => setSelectedMachine(null)}
      />
    </div>
  );
};

export default AdminDashboard;
