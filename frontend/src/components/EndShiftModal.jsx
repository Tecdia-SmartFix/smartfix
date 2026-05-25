import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { fetchApi } from '../api/apiClient';

// End-of-shift log form. Fields are not hardcoded — they're loaded from
// /machines/{machineId}/parameters, which the admin edits in
// MachineDetailModal. On submit we POST to /shifts/log; the backend computes
// anomalies + severity from the same parameter spec.

// `phase='end'` is the original end-of-shift log; `phase='start'` is the
// pre-shift checklist (same fields, same parameter spec, same backend table —
// just tagged differently so the admin can tell them apart).
const PHASE_COPY = {
  end: {
    eyebrow: 'End of Shift',
    heading: 'Log your machine before signing off',
    readingsHint: 'Take a glance at the machine. Out-of-range values trigger an alert.',
    skipLabel: 'Skip — nothing notable',
    submitLabel: 'Submit log',
  },
  start: {
    eyebrow: 'Pre-Shift Check',
    heading: 'Walk the machine before you start',
    readingsHint: 'Record the values as you find them. Anything out of range is flagged for the admin.',
    skipLabel: 'Skip — looks normal',
    submitLabel: 'Submit checklist',
  },
};

const EndShiftModal = ({ isOpen, onClose, machineId, machineName, phase = 'end' }) => {
  const copy = PHASE_COPY[phase] || PHASE_COPY.end;
  const [parameters, setParameters] = useState({ numeric_readings: [], visual_checks: [] });
  const [readings, setReadings] = useState({});
  const [visualChecks, setVisualChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Pre-shift only: the last few end-of-shift readings for context, keyed by
  // parameter `key`. e.g. { pressure: [78, 79, 76] }. Empty {} for end-shift.
  const [recentByKey, setRecentByKey] = useState({});

  useEffect(() => {
    if (!isOpen || !machineId || phase !== 'start') return;
    // Fetch a small window of end-of-shift logs so the worker can see what
    // the machine looked like recently. Only relevant on pre-shift; the
    // end-shift modal doesn't need this context.
    let cancelled = false;
    fetchApi(`/machines/${machineId}/shifts/recent?limit=3&phase=end`)
      .then(data => {
        if (cancelled) return;
        const byKey = {};
        (data.logs || []).forEach(log => {
          Object.entries(log.readings || {}).forEach(([k, v]) => {
            if (!byKey[k]) byKey[k] = [];
            byKey[k].push(v);
          });
        });
        setRecentByKey(byKey);
      })
      .catch(() => !cancelled && setRecentByKey({}));
    return () => { cancelled = true; };
  }, [isOpen, machineId, phase]);

  useEffect(() => {
    if (!isOpen || !machineId) return;
    let cancelled = false;
    setIsLoading(true);
    setError('');
    fetchApi(`/machines/${machineId}/parameters`)
      .then(data => {
        if (cancelled) return;
        setParameters(data);
        // Initialise form state from the spec — empty strings for readings,
        // default-non-anomaly for visual checks (so an unedited form is "clean").
        const initialReadings = {};
        (data.numeric_readings || []).forEach(r => { initialReadings[r.key] = ''; });
        const initialChecks = {};
        (data.visual_checks || []).forEach(c => {
          // Default the checkbox to whatever value is NOT the anomaly trigger,
          // so a worker who submits without touching anything reports "all good".
          initialChecks[c.key] = !c.anomaly_when;
        });
        setReadings(initialReadings);
        setVisualChecks(initialChecks);
        setNotes('');
      })
      .catch(err => !cancelled && setError(`Couldn't load parameters: ${err.message}`))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [isOpen, machineId]);

  const updateReading = (key, value) => setReadings(r => ({ ...r, [key]: value }));
  const toggleCheck = (key) => setVisualChecks(c => ({ ...c, [key]: !c[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!machineId) return;
    setIsSubmitting(true);
    setError('');
    try {
      // Coerce numeric strings to numbers; drop empty entries so the backend
      // doesn't compare "" against a numeric range.
      const numericReadings = {};
      Object.entries(readings).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        const n = Number(v);
        numericReadings[k] = Number.isFinite(n) ? n : v;
      });
      await fetchApi('/shifts/log', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: machineId,
          readings: numericReadings,
          visual_checks: visualChecks,
          notes: notes.trim() || null,
          // worker_label intentionally omitted — the backend derives it from
          // the session cookie + workstation binding (see _derive_worker_label
          // in src/api.py). Sending it from the client lets it be spoofed.
          phase,
        }),
      });
      onClose();
    } catch (err) {
      setError(`Submit failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasParams = parameters.numeric_readings?.length || parameters.visual_checks?.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="theme-modal-panel relative z-10 max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-[28px] border border-white/12 bg-[#080b0d]/95 p-7 text-white shadow-2xl shadow-black/60 sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-white/42 transition-colors hover:text-white"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            <div className="mb-6">
              <span className="mb-3 block text-[11px] font-black uppercase tracking-[0.24em] text-[#70dceb]">
                {copy.eyebrow}
              </span>
              <h2 className="mb-3 text-[clamp(2rem,5vw,3.25rem)] font-black uppercase leading-[0.95] tracking-normal text-white">
                {copy.heading}
              </h2>
              <p className="text-sm font-medium text-white/58">
                {machineName || machineId || 'Machine'}
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-white/40">
                <Loader2 size={20} className="animate-spin" />
                <span className="ml-2 text-sm">Loading parameters…</span>
              </div>
            ) : !hasParams ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-8 text-center text-[14px] text-white/55">
                No parameters configured for this machine yet.
                <br />
                Ask your admin to set them up in the admin dashboard.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {parameters.numeric_readings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-1 text-sm font-black uppercase tracking-[0.18em] text-white">Readings</h3>
                    <p className="mb-4 text-[13px] font-medium text-white/48">
                      {copy.readingsHint}
                    </p>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                      {parameters.numeric_readings.map(r => {
                        const range = (r.expected_min != null || r.expected_max != null)
                          ? `expected ${r.expected_min ?? '—'}${r.expected_max != null ? `–${r.expected_max}` : ''}${r.unit ? ` ${r.unit}` : ''}`
                          : null;
                        // Pre-shift only: surface the previous few end-of-shift
                        // values so the worker can eyeball drift before
                        // entering the current reading.
                        const recent = phase === 'start' ? (recentByKey[r.key] || []) : [];
                        return (
                          <div key={r.key}>
                            <label className="mb-1.5 block text-[13px] font-bold text-white/84">
                              {r.label}{r.unit ? ` (${r.unit})` : ''}
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={readings[r.key] ?? ''}
                              onChange={(e) => updateReading(r.key, e.target.value)}
                              className="w-full rounded-xl border border-white/12 bg-white/[0.055] px-4 py-2.5 text-[15px] font-semibold text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                            />
                            {range && <p className="mt-1.5 text-[12px] text-white/36">{range}</p>}
                            {recent.length > 0 && (
                              <p className="mt-1 text-[11px] text-[#70dceb]/70 font-mono">
                                last {recent.length}: {recent.join(' · ')}{r.unit ? ` ${r.unit}` : ''}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {parameters.visual_checks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-white">Visual checks</h3>
                    <div className="space-y-3">
                      {parameters.visual_checks.map(c => {
                        const isAnomaly = visualChecks[c.key] === c.anomaly_when;
                        // Anomaly-trigger checks render orange when "ticked into the
                        // anomaly state"; normal-state checks render green when OK.
                        const boxClasses = isAnomaly
                          ? 'bg-[#ff6b00] border-[#ff6b00]'
                          : c.anomaly_when === false && visualChecks[c.key]
                            ? 'bg-[#10b981] border-[#10b981]'
                            : visualChecks[c.key]
                              ? 'bg-[#2b8cff] border-[#2b8cff]'
                              : 'border-white/24 group-hover:border-[#70dceb]';
                        return (
                          <label key={c.key} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${boxClasses}`}>
                              {visualChecks[c.key] && (
                                isAnomaly
                                  ? <AlertCircle size={14} className="text-white" strokeWidth={2.5} />
                                  : <Check size={14} className="text-white" strokeWidth={3} />
                              )}
                            </div>
                            <span className="text-[14px] text-white/82">{c.label}</span>
                            {isAnomaly && (
                              <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-bold text-[#ff6b00] border border-[#ff6b00] bg-orange-50">
                                Will flag
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={!!visualChecks[c.key]}
                              onChange={() => toggleCheck(c.key)}
                              className="hidden"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-white">Anything else?</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="custom-scrollbar h-20 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-[14px] text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                  />
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[13px] font-bold text-white/46 transition-colors hover:text-white"
                  >
                    {copy.skipLabel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] px-7 py-3 text-[14px] font-bold text-white shadow-lg shadow-[#2b8cff]/25 transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {isSubmitting ? 'Submitting…' : <>{copy.submitLabel} <span className="text-lg leading-none">→</span></>}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EndShiftModal;
