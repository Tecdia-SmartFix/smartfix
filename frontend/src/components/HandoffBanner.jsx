import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { fetchApi } from '../api/apiClient';

// Renders at the top of a machine chat IF the most recent end-of-shift log
// for that machine flagged at least one anomaly and hasn't been acknowledged.
// Pulls /machines/{id}/shifts/recent?limit=1 on mount and bails out silently
// if there's nothing to show.
//
// Worker-facing: clicking Acknowledge POSTs /shifts/{id}/acknowledge so the
// banner stays dismissed across reloads + across shifts (until the next log).

const SEVERITY_STYLES = {
  1: { ring: 'border-emerald-200',  pill: 'bg-emerald-600',  text: 'text-emerald-700',  body: 'bg-emerald-50/70',  rail: 'bg-emerald-500',  detailText: 'text-emerald-800',  label: 'Info' },
  2: { ring: 'border-yellow-200',   pill: 'bg-yellow-500',   text: 'text-yellow-800',   body: 'bg-yellow-50/70',   rail: 'bg-yellow-500',   detailText: 'text-yellow-900',   label: 'Minor' },
  3: { ring: 'border-orange-200/80',pill: 'bg-[#ea580c]',    text: 'text-[#ea580c]',    body: 'bg-orange-50/70',   rail: 'bg-[#ea580c]',    detailText: 'text-[#9a3412]',    label: 'Degraded' },
  4: { ring: 'border-red-200',      pill: 'bg-red-600',      text: 'text-red-700',      body: 'bg-red-50/70',      rail: 'bg-red-600',      detailText: 'text-red-900',      label: 'Impact' },
  5: { ring: 'border-red-300',      pill: 'bg-red-700',      text: 'text-red-800',      body: 'bg-red-100/70',     rail: 'bg-red-700',      detailText: 'text-red-900',      label: 'Safety' },
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `today, ${hhmm}`;
  if (isYesterday) return `yesterday, ${hhmm}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${hhmm}`;
};

const HandoffBanner = ({ machineId }) => {
  // `log` is set to the latest end-of-shift log when we want to render either
  // the loud anomaly banner OR the quiet all-clear pill. `cleanLog` is true
  // for the quiet case so the render path can take the smaller treatment.
  const [log, setLog] = useState(null);
  const [cleanLog, setCleanLog] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!machineId) return;
    let cancelled = false;
    setDismissed(false);
    setExpanded(false);
    // phase=end so a fresh start-of-shift log doesn't bury the previous
    // shift's end-of-shift anomalies that this banner is meant to surface.
    fetchApi(`/machines/${machineId}/shifts/recent?limit=1&phase=end`)
      .then(data => {
        if (cancelled) return;
        const latest = (data.logs || [])[0];
        if (!latest) {
          setLog(null);
          setCleanLog(false);
          return;
        }
        const hasAnomalies = (latest.anomalies?.length || 0) > 0;
        if (hasAnomalies && !latest.acknowledged) {
          // Loud anomaly banner — needs the worker's attention.
          setLog(latest);
          setCleanLog(false);
        } else if (!hasAnomalies) {
          // Quiet all-clear confirmation. We deliberately ignore the ack flag
          // here: a "previous shift was fine" reminder is information-only,
          // not a thing to dismiss.
          setLog(latest);
          setCleanLog(true);
        } else {
          // Acknowledged anomaly log — already handled, don't re-nag.
          setLog(null);
          setCleanLog(false);
        }
      })
      .catch(() => { if (!cancelled) { setLog(null); setCleanLog(false); } });
    return () => { cancelled = true; };
  }, [machineId]);

  const handleAcknowledge = async () => {
    if (!log) return;
    setBusy(true);
    try {
      await fetchApi(`/shifts/${log.id}/acknowledge`, { method: 'POST' });
    } catch {
      // Even if persistence fails, hide the banner locally so the worker
      // isn't blocked. The next page load will re-fetch and re-show if the
      // server didn't actually record the ack.
    } finally {
      setDismissed(true);
      setBusy(false);
    }
  };

  if (!log || dismissed) return null;
  const when = formatTime(log.created_at);

  // ── Quiet all-clear pill ──────────────────────────────────────────────
  // Tiny, low-contrast, never expandable. Just a positive confirmation that
  // a previous shift logged out and reported nothing of concern.
  if (cleanLog) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl px-5 mb-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-700 backdrop-blur-sm">
          <CheckCircle2 size={13} strokeWidth={2.5} />
          Previous shift: all clear
          {log.worker_label && <span className="text-emerald-600/70 font-normal">· {log.worker_label}</span>}
          {when && <span className="text-emerald-600/70 font-normal">· {when}</span>}
        </div>
      </motion.div>
    );
  }

  const sev = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES[1];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="w-full max-w-3xl px-5 mb-4"
      >
        <div className={`relative overflow-hidden rounded-2xl border ${sev.ring} ${sev.body} backdrop-blur-md shadow-sm`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${sev.rail}`} />
          <div className="flex items-start justify-between gap-4 px-5 py-4 pl-7">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className={`${sev.pill} text-white p-2 rounded-xl mt-0.5 shadow-sm shrink-0`}>
                <AlertTriangle size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${sev.text} block mb-1`}>
                  Previous shift &middot; Sev {log.severity} &middot; {sev.label}
                </span>
                <p className={`text-[15px] font-bold ${sev.detailText} leading-snug`}>
                  {log.anomalies.length === 1
                    ? log.anomalies[0].title
                    : `${log.anomalies.length} issues flagged at end of last shift`}
                </p>
                {log.notes && (
                  <p className={`text-[13px] ${sev.detailText}/80 mt-1 italic line-clamp-2`}>
                    &ldquo;{log.notes}&rdquo; {log.worker_label && <>&mdash; {log.worker_label}</>}{when && <>, {when}</>}
                  </p>
                )}
                {!log.notes && (log.worker_label || when) && (
                  <p className={`text-[12px] ${sev.detailText}/70 mt-1`}>
                    {log.worker_label}{log.worker_label && when ? ' · ' : ''}{when}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => setExpanded(e => !e)}
                className={`${sev.pill} hover:brightness-110 text-white text-[12px] font-bold px-4 py-1.5 rounded-lg transition-all active:scale-95`}
              >
                {expanded ? 'Hide details' : 'View details'}
              </button>
              <button
                onClick={handleAcknowledge}
                disabled={busy}
                className={`text-[11px] font-bold ${sev.text} hover:underline transition-colors disabled:opacity-50 flex items-center gap-1`}
              >
                <X size={11} strokeWidth={3} />
                {busy ? 'Dismissing…' : 'Acknowledge'}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={`px-5 pb-4 pl-7 pt-1 border-t border-black/5 ${sev.detailText}`}>
                  {log.anomalies.length > 1 && (
                    <ul className="space-y-1.5 mb-3">
                      {log.anomalies.map((a, i) => (
                        <li key={i} className="text-[13px] flex gap-2">
                          <span className="font-bold">·</span>
                          <span><span className="font-bold">{a.title}</span>{a.detail && <span className="opacity-80"> — {a.detail}</span>}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {Object.keys(log.readings || {}).length > 0 && (
                    <div className="mt-2 text-[12px]">
                      <span className="font-bold uppercase tracking-wider opacity-60">Readings: </span>
                      {Object.entries(log.readings).map(([k, v], i, arr) => (
                        <span key={k} className="font-mono">{k} = {String(v)}{i < arr.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HandoffBanner;
