import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, AlertCircle, AlertTriangle, Check,
  Gauge, Thermometer, Clock, Activity, Loader2, X,
} from 'lucide-react';
import { fetchApi } from '../api/apiClient';
import { useMachines } from '../context/MachineContext';

// Full-page shift log. One component drives both phases — the route decides
// which one via the `phase` prop in App.jsx.
//
// Backend contract is unchanged: GET /machines/{id}/parameters drives the form,
// POST /shifts/log accepts { machine_id, readings, visual_checks, notes, phase }.

const PHASE_COPY = {
  start: {
    eyebrow: 'Pre-Shift Inspection',
    heading: 'Walk the machine before you start',
    sub:     'Take a moment to look at the machine. Mark anything that looks off — your admin will see it.',
    skipLabel:   'Skip — looks normal',
    submitLabel: 'Submit checklist',
  },
  end: {
    eyebrow: 'End-of-Shift Inspection',
    heading: 'Log the machine before signing off',
    sub:     'Record the readings you see. Anything outside the expected range gets flagged for the next shift.',
    skipLabel:   'Skip — nothing notable',
    submitLabel: 'Submit log',
  },
};

// Inspection-sheet red. Used only for section eyebrows + table column headers so
// the page evokes the paper 設備点検表 aesthetic without going full red-everywhere.
const SHEET_RED = '#c0392b';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtToday = () => {
  const d = new Date();
  const hhmm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()} · ${hhmm}`;
};
// Same 2-shift split used by Shift Logs page: 1st 06–18, 2nd 18–06.
const currentShift = () => {
  const h = new Date().getHours();
  return (h >= 6 && h < 18) ? '1st shift' : '2nd shift';
};

const NOTE_SUGGESTIONS = [
  'All good',
  'Cleaned coolant',
  'Replaced filter',
  'Heard rattling',
  'Topped up oil',
  'Reset alarm',
];

// Pick a sensible icon for a reading based on label / unit. Falls back to a
// generic gauge.
const iconFor = (label = '', unit = '') => {
  const t = `${label} ${unit}`.toLowerCase();
  if (/temp|°c|°f|celsius|fahrenheit/.test(t)) return Thermometer;
  if (/pressure|bar|psi|kpa/.test(t))           return Gauge;
  if (/time|hour|minute|cycle/.test(t))         return Clock;
  return Activity;
};

const draftKey = (phase, mid) => `shift-draft:${phase}:${mid || 'unknown'}`;

const ShiftLogPage = ({ phase = 'end' }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { machines } = useMachines();
  const copy = PHASE_COPY[phase] || PHASE_COPY.end;

  const machineParam = params.get('machine') || '';
  const machineId    = machineParam.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  const machine      = useMemo(
    () => machines.find(m => m.id === machineId) || null,
    [machines, machineId],
  );
  const machineName = machine?.display_name || machine?.name || machineParam || 'Machine';

  const [parameters,   setParameters]   = useState({ numeric_readings: [], visual_checks: [] });
  const [readings,     setReadings]     = useState({});
  const [visualChecks, setVisualChecks] = useState({});
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [recentByKey,  setRecentByKey]  = useState({});

  // ── Load parameters + restore any draft from sessionStorage ──────────────
  useEffect(() => {
    if (!machineId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchApi(`/machines/${machineId}/parameters`)
      .then(data => {
        if (cancelled) return;
        setParameters(data);

        const initR = {};
        (data.numeric_readings || []).forEach(r => { initR[r.key] = ''; });
        const initC = {};
        (data.visual_checks || []).forEach(c => { initC[c.key] = !c.anomaly_when; });

        // Restore draft if one exists for this (phase, machine) pair. The
        // draft is keyed on phase too so a half-finished pre-shift doesn't
        // leak into the end-shift form.
        try {
          const raw = sessionStorage.getItem(draftKey(phase, machineId));
          if (raw) {
            const d = JSON.parse(raw);
            setReadings({ ...initR, ...(d.readings || {}) });
            setVisualChecks({ ...initC, ...(d.visualChecks || {}) });
            setNotes(d.notes || '');
            return;
          }
        } catch { /* corrupt draft, ignore */ }

        setReadings(initR);
        setVisualChecks(initC);
        setNotes('');
      })
      .catch(err => !cancelled && setError(`Couldn't load parameters: ${err.message}`))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [machineId, phase]);

  // ── Pull the last 3 end-of-shift values for trend context (both phases) ──
  // For pre-shift the worker sees what the machine looked like at end of the
  // previous shift; for end-shift the worker can compare today's reading
  // against the recent trend.
  useEffect(() => {
    if (!machineId) { setRecentByKey({}); return; }
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
  }, [machineId]);

  // ── Persist draft on every change so a refresh doesn't lose work ─────────
  useEffect(() => {
    if (!machineId || loading) return;
    try {
      sessionStorage.setItem(
        draftKey(phase, machineId),
        JSON.stringify({ readings, visualChecks, notes }),
      );
    } catch { /* quota exceeded etc., ignore */ }
  }, [phase, machineId, readings, visualChecks, notes, loading]);

  // ── Live anomaly preview ─────────────────────────────────────────────────
  // Counts how many things would be flagged at submit time so the worker sees
  // it before they hit Submit.
  const anomalyPreview = useMemo(() => {
    let count = 0;
    (parameters.visual_checks || []).forEach(c => {
      if (visualChecks[c.key] === c.anomaly_when) count += 1;
    });
    (parameters.numeric_readings || []).forEach(r => {
      const raw = readings[r.key];
      if (raw === '' || raw == null) return;
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      if (r.expected_min != null && n < r.expected_min) count += 1;
      else if (r.expected_max != null && n > r.expected_max) count += 1;
    });
    return count;
  }, [parameters, readings, visualChecks]);

  const isReadingOutOfRange = (r) => {
    const raw = readings[r.key];
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (r.expected_min != null && n < r.expected_min) return 'low';
    if (r.expected_max != null && n > r.expected_max) return 'high';
    return null;
  };

  const updateReading = (key, value) => setReadings(r => ({ ...r, [key]: value }));
  const toggleCheck   = (key) => setVisualChecks(c => ({ ...c, [key]: !c[key] }));
  const appendNote    = (txt) => setNotes(n => (n ? `${n.replace(/\s+$/, '')}\n${txt}` : txt));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!machineId) return;
    setSubmitting(true);
    setError('');
    try {
      const numeric = {};
      Object.entries(readings).forEach(([k, v]) => {
        if (v === '' || v == null) return;
        const n = Number(v);
        numeric[k] = Number.isFinite(n) ? n : v;
      });
      await fetchApi('/shifts/log', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: machineId,
          readings: numeric,
          visual_checks: visualChecks,
          notes: notes.trim() || null,
          phase,
        }),
      });
      // Wipe the draft on success so a re-open shows a clean form next shift.
      sessionStorage.removeItem(draftKey(phase, machineId));
      navigate(
        `/shift/success?phase=${phase}&machine=${encodeURIComponent(machineParam)}&flagged=${anomalyPreview}`,
        { replace: true },
      );
    } catch (err) {
      setError(`Submit failed: ${err.message}`);
      setSubmitting(false);
    }
  };

  const exitToChat = () => {
    navigate(machineParam ? `/chat?machine=${encodeURIComponent(machineParam)}` : '/chat');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-tecdia-background text-tecdia-textDeep pt-[64px]">
      {/* Document title bar — wide, dense, looks like the header of a printed form */}
      <header className="sticky top-[64px] z-30 border-b border-tecdia-border bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <button
            onClick={exitToChat}
            className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-tecdia-secondary transition-colors hover:text-tecdia-textDeep"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Back to chat
          </button>
          <div className="hidden items-baseline gap-3 sm:flex">
            <span className="text-[12px] font-black uppercase tracking-[0.18em] text-tecdia-textDeep">
              Equipment Inspection Report
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-tecdia-muted">
              SF-{phase === 'start' ? 'PRE' : 'END'}-001 · Rev 06.2026
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                phase === 'start'
                  ? 'bg-tecdia-accent/10 text-tecdia-accent'
                  : 'bg-orange-50 text-orange-600'
              }`}
            >
              {copy.eyebrow}
            </div>
            <button
              onClick={exitToChat}
              className="flex h-7 w-7 items-center justify-center border border-tecdia-border text-tecdia-secondary transition-colors hover:bg-gray-50 hover:text-tecdia-textDeep"
              aria-label="Close"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-3 pb-40 pt-5 sm:px-6">
        {/* Document header — title block + metadata strip, like the top of a
            printed inspection form. The brief sub-text sits inside so it
            doesn't push the form down. */}
        <div className="mb-5 border border-tecdia-border bg-white">
          <div className="border-b border-tecdia-border px-5 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-[clamp(1.2rem,2.4vw,1.7rem)] font-black uppercase tracking-tight text-tecdia-textDeep">
                {copy.eyebrow}
              </h1>
              <span className="hidden font-mono text-[10px] uppercase tracking-wider text-tecdia-muted sm:inline">
                Form SF-{phase === 'start' ? 'PRE' : 'END'}-001
              </span>
            </div>
            <p className="mt-1 text-[13px] text-tecdia-secondary">{copy.sub}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <MetaCell label="Machine" value={machineName} />
            <MetaCell label="Inspector" value="You" />
            <MetaCell label="Shift" value={currentShift()} />
            <MetaCell label="Date · Time" value={fmtToday()} mono />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center border border-tecdia-border bg-white py-12 text-tecdia-muted">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-2 text-sm">Loading parameters…</span>
          </div>
        ) : !machineId ? (
          <EmptyCard
            title="Pick a machine first"
            body="Open a machine chat, then choose Start or End shift from the top bar."
            cta={<Link to="/machines" className="font-bold text-tecdia-accent hover:text-tecdia-hover">Browse machines →</Link>}
          />
        ) : !(parameters.numeric_readings?.length || parameters.visual_checks?.length) ? (
          <EmptyCard
            title="No parameters set up yet"
            body="Ask your admin to configure the checks and readings for this machine in the admin dashboard."
          />
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {/* ── 1. Point of inspection ───────────────────────────────── */}
            {parameters.visual_checks?.length > 0 && (
              <Section number="1" title="Point of inspection" hint="For each item, tap OK if it looks fine or FLAG to mark a problem for your admin.">
                <div className="border border-tecdia-border bg-white">
                  <table className="sheet-table w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/60">
                        <th className="w-10 px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>#</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>Check item</th>
                        <th className="w-48 px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.visual_checks.map((c, idx) => {
                        const checked   = !!visualChecks[c.key];
                        const isAnomaly = checked === !!c.anomaly_when;
                        return (
                          <tr
                            key={c.key}
                            className={isAnomaly ? 'bg-orange-50/50' : ''}
                          >
                            <td className="w-10 px-2 py-2.5 text-center font-mono text-[12px] text-tecdia-muted tabular-nums">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-[14px] font-medium text-tecdia-textDeep">{c.label}</td>
                            <td className="w-48 px-3 py-2 text-center">
                              {/* Two-button toggle — like radio buttons on a paper form */}
                              <div className="inline-flex overflow-hidden border border-tecdia-border">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Force the "OK" (non-anomaly) state for this check.
                                    setVisualChecks(s => ({ ...s, [c.key]: !c.anomaly_when }));
                                  }}
                                  className={`flex min-w-[64px] items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                                    !isAnomaly
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white text-tecdia-secondary hover:bg-gray-50'
                                  }`}
                                >
                                  <Check size={12} strokeWidth={3} /> OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Force the "FLAG" (anomaly) state for this check.
                                    setVisualChecks(s => ({ ...s, [c.key]: !!c.anomaly_when }));
                                  }}
                                  className={`flex min-w-[64px] items-center justify-center gap-1.5 border-l border-tecdia-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                                    isAnomaly
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-white text-tecdia-secondary hover:bg-gray-50'
                                  }`}
                                >
                                  <AlertTriangle size={12} strokeWidth={2.8} /> Flag
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── 2. Measurements ─────────────────────────────────────── */}
            {parameters.numeric_readings?.length > 0 && (
              <Section
                number="2"
                title="Measurements"
                hint={
                  phase === 'start'
                    ? 'Glance at each gauge and enter what you see. Out-of-range values are flagged automatically.'
                    : 'Enter what you see at the end of shift. Anything outside the expected range is flagged for the next shift.'
                }
              >
                <div className="border border-tecdia-border bg-white">
                  <table className="sheet-table w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/60">
                        <th className="hidden w-10 px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.16em] sm:table-cell" style={{ color: SHEET_RED }}>#</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>Measurement</th>
                        <th className="hidden px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] sm:table-cell" style={{ color: SHEET_RED }}>Expected</th>
                        <th className="w-36 px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.16em] sm:w-44" style={{ color: SHEET_RED }}>Your reading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.numeric_readings.map((r, idx) => {
                        const Icon   = iconFor(r.label, r.unit);
                        const drift  = isReadingOutOfRange(r);
                        const recent = recentByKey[r.key] || [];
                        const rangeText = (r.expected_min != null || r.expected_max != null)
                          ? `${r.expected_min ?? '—'}${r.expected_max != null ? ` – ${r.expected_max}` : ''}${r.unit ? ` ${r.unit}` : ''}`
                          : '—';
                        return (
                          <tr
                            key={r.key}
                            className={drift ? 'bg-orange-50/40' : ''}
                          >
                            <td className="hidden w-10 px-2 py-3 text-center align-top font-mono text-[12px] text-tecdia-muted tabular-nums sm:table-cell">{idx + 1}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="shrink-0 text-tecdia-accent" strokeWidth={2.4} />
                                <span className="text-[14px] font-medium text-tecdia-textDeep">
                                  {r.label}{r.unit ? ` (${r.unit})` : ''}
                                </span>
                              </div>
                              {/* Inline expected hint on mobile (column hidden there) */}
                              <div className="mt-1 text-[11px] text-tecdia-muted sm:hidden">
                                Expected {rangeText}
                              </div>
                              {recent.length > 0 && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-tecdia-muted">prev</span>
                                  {recent.map((v, i) => (
                                    <span
                                      key={i}
                                      title={i === 0 ? 'Most recent end-of-shift reading' : `${i + 1} shifts ago`}
                                      className={`inline-flex items-center border font-mono font-bold tabular-nums ${
                                        i === 0
                                          ? 'border-tecdia-accent bg-tecdia-accent px-2 py-1 text-[12px] text-white'
                                          : 'border-tecdia-border bg-white px-1.5 py-0.5 text-[11px] text-tecdia-secondary'
                                      }`}
                                    >
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="hidden px-4 py-3 align-top text-[13px] font-medium text-tecdia-secondary sm:table-cell tabular-nums">
                              {rangeText}
                            </td>
                            <td className="w-36 px-3 py-2.5 align-top sm:w-44">
                              <input
                                id={`reading-${r.key}`}
                                type="text"
                                inputMode="decimal"
                                value={readings[r.key] ?? ''}
                                onChange={(e) => updateReading(r.key, e.target.value)}
                                placeholder="—"
                                className={`w-full border px-3 py-1.5 text-center text-[15px] font-bold tabular-nums outline-none transition-colors ${
                                  drift
                                    ? 'border-orange-400 bg-orange-50 text-orange-700 focus:ring-1 focus:ring-orange-300'
                                    : 'border-tecdia-border bg-white text-tecdia-textDeep focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/40'
                                }`}
                              />
                              {drift && (
                                <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600">
                                  {drift === 'low' ? '↓ Below expected' : '↑ Above expected'}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── 3. Notes & remarks ─────────────────────────────────── */}
            <Section number="3" title="Notes & remarks" hint="Anything the next shift should know? Optional.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. cleaned coolant tank, replaced belt at 14:30…"
                className="h-24 w-full resize-none border border-tecdia-border bg-white px-3.5 py-2.5 text-[14px] text-tecdia-textDeep outline-none transition-colors focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/40"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {NOTE_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => appendNote(s)}
                    className="border border-tecdia-border bg-white px-2.5 py-1 text-[12px] font-semibold text-tecdia-secondary transition-colors hover:border-tecdia-accent hover:text-tecdia-accent"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Signature / acknowledgment block ───────────────────── */}
            <div className="grid grid-cols-1 border border-tecdia-border bg-white sm:grid-cols-3">
              <SigCell label="Inspector" value="You" />
              <SigCell label="Shift" value={currentShift()} />
              <SigCell label="Filled at" value={fmtToday()} mono />
            </div>

            {error && (
              <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
                <AlertCircle size={14} strokeWidth={2.6} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </form>
        )}
      </main>

      {/* Sticky footer — Skip + flag preview + Submit */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-tecdia-border bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !machineId}
            className="text-[12px] font-bold uppercase tracking-[0.12em] text-tecdia-muted transition-colors hover:text-tecdia-textDeep disabled:opacity-40"
          >
            {copy.skipLabel}
          </button>

          <div className="flex items-center gap-3">
            {anomalyPreview > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                <AlertTriangle size={12} strokeWidth={2.6} />
                {anomalyPreview} {anomalyPreview === 1 ? 'issue' : 'issues'} will be flagged
              </span>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !machineId}
              className="flex items-center gap-2 bg-tecdia-accent px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-tecdia-hover disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Submitting…' : copy.submitLabel}
              {!submitting && <ArrowRight size={14} strokeWidth={2.6} />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Section = ({ number, title, hint, children }) => (
  <section>
    <div className="mb-2 flex items-baseline gap-2 border-b border-tecdia-border pb-1.5">
      {number && (
        <span
          className="flex h-5 w-5 items-center justify-center font-mono text-[11px] font-bold text-white"
          style={{ background: SHEET_RED }}
        >
          {number}
        </span>
      )}
      <h2 className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: SHEET_RED }}>{title}</h2>
    </div>
    {hint && <p className="mb-2.5 text-[12px] italic text-tecdia-muted">{hint}</p>}
    {children}
  </section>
);

const MetaCell = ({ label, value, mono = false }) => (
  <div className="border-r border-t border-tecdia-border p-3 first:border-t-0 sm:border-t-0 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:last:border-r-0">
    <div className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: SHEET_RED }}>
      {label}
    </div>
    <div className={`mt-1 truncate text-[13px] font-bold text-tecdia-textDeep ${mono ? 'font-mono tabular-nums' : ''}`}>
      {value}
    </div>
  </div>
);

const SigCell = ({ label, value, mono = false }) => (
  <div className="border-t border-tecdia-border p-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-tecdia-muted">
      {label}
    </div>
    <div className={`mt-0.5 text-[13px] font-bold text-tecdia-textDeep ${mono ? 'font-mono tabular-nums' : ''}`}>
      {value}
    </div>
  </div>
);

const EmptyCard = ({ title, body, cta }) => (
  <div className="border border-tecdia-border bg-white px-6 py-10 text-center">
    <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center bg-tecdia-accent/10 text-tecdia-accent">
      <AlertCircle size={16} strokeWidth={2.4} />
    </div>
    <div className="text-[14px] font-bold text-tecdia-textDeep">{title}</div>
    <div className="mt-1 text-[13px] text-tecdia-secondary">{body}</div>
    {cta && <div className="mt-4 text-[13px]">{cta}</div>}
  </div>
);

export default ShiftLogPage;
