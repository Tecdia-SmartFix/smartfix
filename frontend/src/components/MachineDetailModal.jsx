import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { fetchApi } from '../api/apiClient';

// Admin-facing modal opened by clicking a MachineCard in AdminDashboard.
// Two sections:
//   1. Machine info (read-only, sourced from /admin/machines).
//   2. Shift-log parameters editor — numeric readings + visual checks. These
//      drive EndShiftModal's dynamic form AND the anomaly computation that
//      ShiftLogsPanel shows.
//
// `key` (the field referenced in submitted readings) is auto-derived from the
// label and never shown — admins shouldn't have to think about slug uniqueness.

const slugify = (label, existing) => {
  const base = (label || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'item';
  let candidate = base;
  let n = 2;
  const taken = new Set(existing);
  while (taken.has(candidate)) {
    candidate = `${base}_${n++}`;
  }
  return candidate;
};

const MachineDetailModal = ({ machine, isOpen, onClose }) => {
  const [numericReadings, setNumericReadings] = useState([]);
  const [visualChecks, setVisualChecks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState('');
  // Track original spec so we can detect dirty state and reset on cancel.
  const originalRef = useRef({ numericReadings: [], visualChecks: [] });

  useEffect(() => {
    if (!isOpen || !machine?.id) return;
    let cancelled = false;
    setIsLoading(true);
    fetchApi(`/machines/${machine.id}/parameters`)
      .then(data => {
        if (cancelled) return;
        const nr = data.numeric_readings || [];
        const vc = data.visual_checks || [];
        setNumericReadings(nr);
        setVisualChecks(vc);
        originalRef.current = { numericReadings: nr, visualChecks: vc };
      })
      .catch(err => !cancelled && setToast(`Error loading: ${err.message}`))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [isOpen, machine?.id]);

  const addReading = () => setNumericReadings(rows => {
    const usedKeys = rows.map(r => r.key);
    return [...rows, {
      key: slugify('reading', usedKeys),
      label: '',
      unit: '',
      expected_min: '',
      expected_max: '',
    }];
  });

  const updateReading = (idx, field, value) => setNumericReadings(rows => {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    if (field === 'label' && !next[idx].keyLocked) {
      const others = next.filter((_, i) => i !== idx).map(r => r.key);
      next[idx].key = slugify(value, others);
    }
    return next;
  });

  const removeReading = (idx) => setNumericReadings(rows => rows.filter((_, i) => i !== idx));

  const addCheck = () => setVisualChecks(rows => {
    const usedKeys = rows.map(r => r.key);
    return [...rows, {
      key: slugify('check', usedKeys),
      label: '',
      anomaly_when: true,
    }];
  });

  const updateCheck = (idx, field, value) => setVisualChecks(rows => {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    if (field === 'label') {
      const others = next.filter((_, i) => i !== idx).map(r => r.key);
      next[idx].key = slugify(value, others);
    }
    return next;
  });

  const removeCheck = (idx) => setVisualChecks(rows => rows.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Coerce empty min/max strings to null and numeric strings to numbers.
      // Keeps the JSON shape consistent with what the backend Pydantic model expects.
      const numericPayload = numericReadings
        .filter(r => r.label.trim())
        .map(r => ({
          key: r.key,
          label: r.label.trim(),
          unit: (r.unit || '').trim(),
          expected_min: r.expected_min === '' || r.expected_min === null ? null : Number(r.expected_min),
          expected_max: r.expected_max === '' || r.expected_max === null ? null : Number(r.expected_max),
        }));
      const checkPayload = visualChecks
        .filter(c => c.label.trim())
        .map(c => ({
          key: c.key,
          label: c.label.trim(),
          anomaly_when: !!c.anomaly_when,
        }));
      const saved = await fetchApi(`/admin/machines/${machine.id}/parameters`, {
        method: 'PUT',
        body: JSON.stringify({
          numeric_readings: numericPayload,
          visual_checks: checkPayload,
        }),
      });
      originalRef.current = {
        numericReadings: saved.numeric_readings,
        visualChecks: saved.visual_checks,
      };
      setNumericReadings(saved.numeric_readings);
      setVisualChecks(saved.visual_checks);
      setToast('Parameters saved.');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!machine) return null;

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
            className="relative z-10 max-h-[90vh] w-full max-w-[860px] overflow-y-auto rounded-[28px] border border-white/12 bg-[#080b0d]/95 p-7 text-white shadow-2xl shadow-black/60 sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-white/42 transition-colors hover:text-white"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {/* ── Machine info ───────────────────────────────────────── */}
            <div className="mb-7 border-b border-white/10 pb-6">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.24em] text-[#70dceb]">
                Machine
              </span>
              <h2 className="mb-2 text-[clamp(1.5rem,4vw,2.4rem)] font-black uppercase leading-[0.95] tracking-normal text-white">
                {machine.name}
              </h2>
              <p className="text-sm font-medium text-white/58">
                <span className="font-mono">{machine.id}</span>
                {machine.category && <> · {machine.category}</>}
                {typeof machine.significance === 'number' && <> · Significance {machine.significance}/5</>}
              </p>
              {machine.description && (
                <p className="mt-3 text-[14px] text-white/70">{machine.description}</p>
              )}
            </div>

            {/* ── Parameters editor ──────────────────────────────────── */}
            <div className="mb-6">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.24em] text-[#70dceb]">
                Shift log parameters
              </span>
              <p className="text-[13px] text-white/55">
                These drive the End-of-Shift form the worker sees and decide which readings count as anomalies.
                Used for the pre-shift checklist too once that's built.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-white/40">
                <Loader2 size={20} className="animate-spin" />
                <span className="ml-2 text-sm">Loading parameters…</span>
              </div>
            ) : (
              <>
                {/* ── Numeric readings ─────────────────────────────── */}
                <section className="mb-7">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Numeric readings</h3>
                    <button
                      onClick={addReading}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[12px] font-bold text-white/80 transition-colors hover:border-[#70dceb] hover:text-[#70dceb]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  {numericReadings.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/40">
                      No readings yet. Add one to start.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {numericReadings.map((r, idx) => (
                        <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                          <input
                            type="text"
                            placeholder="Label (e.g. Hydraulic pressure)"
                            value={r.label}
                            onChange={(e) => updateReading(idx, 'label', e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-[#70dceb]"
                          />
                          <input
                            type="text"
                            placeholder="Unit"
                            value={r.unit || ''}
                            onChange={(e) => updateReading(idx, 'unit', e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-[#70dceb]"
                          />
                          <input
                            type="number"
                            placeholder="Min"
                            value={r.expected_min ?? ''}
                            onChange={(e) => updateReading(idx, 'expected_min', e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-[#70dceb]"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={r.expected_max ?? ''}
                            onChange={(e) => updateReading(idx, 'expected_max', e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-[#70dceb]"
                          />
                          <button
                            onClick={() => removeReading(idx)}
                            className="rounded-lg p-2 text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── Visual checks ────────────────────────────────── */}
                <section className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Visual checks</h3>
                    <button
                      onClick={addCheck}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[12px] font-bold text-white/80 transition-colors hover:border-[#70dceb] hover:text-[#70dceb]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  {visualChecks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/40">
                      No checks yet. Add one to start.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {visualChecks.map((c, idx) => (
                        <div key={idx} className="grid grid-cols-[2fr_1.5fr_auto] gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                          <input
                            type="text"
                            placeholder="Label (e.g. Leaks observed)"
                            value={c.label}
                            onChange={(e) => updateCheck(idx, 'label', e.target.value)}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-[#70dceb]"
                          />
                          <select
                            value={String(c.anomaly_when)}
                            onChange={(e) => updateCheck(idx, 'anomaly_when', e.target.value === 'true')}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-[#70dceb]"
                            title="When does this count as an anomaly?"
                          >
                            <option value="true">Anomaly when ticked</option>
                            <option value="false">Anomaly when NOT ticked</option>
                          </select>
                          <button
                            onClick={() => removeCheck(idx)}
                            className="rounded-lg p-2 text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── Footer ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-[12px] text-white/40">
                {toast || 'Workers see these in the End-of-Shift form.'}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="text-[13px] font-bold text-white/46 transition-colors hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] px-6 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-[#2b8cff]/25 transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? 'Saving…' : 'Save parameters'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MachineDetailModal;
