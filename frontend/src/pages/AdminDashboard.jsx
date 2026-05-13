import React, { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Upload, FileText, Image, Trash2, LogOut, Settings2,
  Printer, Scissors, Bot, Wrench, Gauge, Cpu, ChevronRight,
  CheckCircle, X, LayoutDashboard, Package, Database, Shield, AlertCircle,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, Pipette, BellRing
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useMachines } from '../context/MachineContext';
import { useAlerts } from '../context/AlertContext';

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
    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-tecdia-surface border border-emerald-500/30 text-emerald-600 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium">
    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
      <CheckCircle size={15} className="text-emerald-600" />
    </div>
    {message}
    <button onClick={onClose} className="ml-2 text-tecdia-text/40 hover:text-tecdia-text transition-colors"><X size={13} /></button>
  </motion.div>
);

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-tecdia-surface border border-tecdia-border rounded-2xl p-6 shadow-sm ${className}`}>
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
        isFailed ? 'bg-red-50 border-red-200'
        : isDone ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-tecdia-border'
      }`}
    >
      {/* ── Header: status pill + dismiss ───────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              isFailed ? 'bg-red-100 text-red-700 border border-red-200'
              : isDone ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-tecdia-accent/10 text-tecdia-accent border border-tecdia-accent/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              isFailed ? 'bg-red-500'
              : isDone ? 'bg-emerald-500'
              : 'bg-tecdia-accent animate-pulse'
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
        className={`relative w-full rounded-full h-3 mb-4 overflow-hidden ${
          isFailed ? 'bg-red-100' : isDone ? 'bg-emerald-100' : 'bg-tecdia-background'
        }`}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`relative h-3 rounded-full overflow-hidden ${
            isFailed ? 'bg-red-400'
            : isDone ? 'bg-emerald-500'
            : 'bg-tecdia-accent'
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
                  ? 'bg-red-100 text-red-600'
                  : isCurrent
                    ? 'bg-tecdia-accent text-white shadow-sm'
                    : reached
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-tecdia-background text-tecdia-text/30'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${
                isCurrent ? 'bg-white animate-pulse'
                : reached ? (isFailed ? 'bg-red-500' : 'bg-emerald-500')
                : 'bg-tecdia-text/20'
              }`} />
              {stage.label}
            </div>
          );
        })}
      </div>

      {/* ── Live step / error message ───────────────────────────────────── */}
      <p className={`mt-3 text-[11px] font-medium ${
        isFailed ? 'text-red-600'
        : isDone ? 'text-emerald-700'
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

  const handleLogout = () => { adminLogout(); navigate('/admin/login'); };

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
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-tecdia-text/60 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-200">
              <LogOut size={14} /> Logout
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
            {[
              { icon: Database, label: 'Total', value: machines.length, color: 'text-white', bg: 'bg-[#00A9FF]', border: 'border-[#00A9FF]/20' },
              { icon: Package, label: 'Default', value: 6, color: 'text-tecdia-textDeep', bg: 'bg-[#89CFF3]', border: 'border-[#89CFF3]/20' },
              { icon: Plus, label: 'Custom', value: Math.max(0, machines.length - 6), color: 'text-tecdia-textDeep', bg: 'bg-[#A0E9FF]', border: 'border-[#A0E9FF]/20' },
            ].map(s => {
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
            { id: 'machines', label: 'All Machines', icon: Package },
            { id: 'add',      label: 'Add Machine',  icon: Plus },
            { id: 'alerts',   label: 'Alert History', icon: BellRing, count: alerts.length },
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
                                ? 'bg-red-50 border-red-200 text-red-600'
                                : 'text-transparent group-hover:text-tecdia-text/40 border-transparent hover:!text-red-600 hover:bg-red-50 hover:border-red-200'
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
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= machine.significance ? 'bg-tecdia-accent' : 'bg-tecdia-border'}`} />
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
                        className="w-full h-1.5 bg-tecdia-background rounded-lg appearance-none cursor-pointer accent-tecdia-accent border border-tecdia-border" 
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
                            className="w-6 h-6 rounded-full bg-tecdia-background border border-tecdia-border flex items-center justify-center text-tecdia-text/40 hover:text-red-500 transition-colors">
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
                      className="flex items-start gap-2.5 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-500 text-xs">
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
                                className="w-6 h-6 bg-white/70 rounded-full items-center justify-center text-tecdia-textDeep hover:text-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity flex">
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
                      <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl group/pdf">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                          <FileText size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-tecdia-textDeep truncate">{file.name}</p>
                          <p className="text-[10px] text-tecdia-text/60">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                        </div>
                        <button type="button" onClick={() => removeFile(idx)}
                          className="text-tecdia-text/40 hover:text-red-500 transition-colors opacity-0 group-hover/pdf:opacity-100 flex-shrink-0">
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
                <BellRing size={20} className="text-red-500" />
                Critical Fault Alerts
              </h2>
              <div className="flex items-center gap-4">
                <button onClick={handleTestAlert} className="text-xs font-bold text-tecdia-accent hover:text-tecdia-accent/80 transition-colors">
                  Inject Test Alert
                </button>
                {alerts.length > 0 && (
                  <button onClick={handleClearAlerts} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors">
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
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <motion.div key={alert.alert_id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-white border-l-4 border-l-red-500 border border-tecdia-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">Score {alert.score}</span>
                          <h3 className="font-bold text-tecdia-textDeep">{alert.machine_id}</h3>
                          <span className="text-[10px] text-tecdia-text/40 font-medium">{new Date(alert.notified_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-2 text-[10px] text-tecdia-text/50 font-bold uppercase tracking-tight">
                          <span>Sev Level: {alert.severity_level}</span>
                          <span className="text-tecdia-border">|</span>
                          <span>Machine Sig: {alert.machine_significance}</span>
                        </div>
                        <p className="text-xs text-tecdia-text/70 line-clamp-2 italic">"{alert.answer_excerpt || alert.question}"</p>
                      </div>
                      <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border flex-shrink-0 ${ alert.email_notified ? 'bg-emerald-50 border-emerald-100' : 'bg-yellow-50 border-yellow-100' }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${ alert.email_notified ? 'bg-emerald-100' : 'bg-yellow-100' }`}>
                          <CheckCircle size={11} className={alert.email_notified ? 'text-emerald-600' : 'text-yellow-500'} />
                        </div>
                        <span className={`text-[11px] font-bold ${ alert.email_notified ? 'text-emerald-700' : 'text-yellow-700' }`}>
                          {alert.email_notified ? 'Email Notified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
