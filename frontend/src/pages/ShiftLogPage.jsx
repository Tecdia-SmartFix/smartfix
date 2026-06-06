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

  // ── Pre-shift: pull the last few end-of-shift values for context ─────────
  useEffect(() => {
    if (!machineId || phase !== 'start') { setRecentByKey({}); return; }
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
  }, [machineId, phase]);

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
      {/* Sticky header — sits just below the global Navbar */}
      <header className="sticky top-[64px] z-30 border-b border-tecdia-border bg-white">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <button
            onClick={exitToChat}
            className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-tecdia-secondary transition-colors hover:text-tecdia-textDeep"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Back to chat
          </button>
          <div className="flex items-center gap-3">
            <div
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                phase === 'start'
                  ? 'bg-tecdia-accent/10 text-tecdia-accent'
                  : 'bg-orange-50 text-orange-600'
              }`}
            >
              {copy.eyebrow}
            </div>
            <button
              onClick={exitToChat}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-tecdia-border text-tecdia-secondary transition-colors hover:bg-gray-50 hover:text-tecdia-textDeep"
              aria-label="Close"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 pb-40 pt-8 sm:px-8">
        {/* Intro */}
        <section className="mb-6">
          <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight text-tecdia-textDeep">
            {copy.heading}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-tecdia-secondary">
            {copy.sub}
          </p>
        </section>

        {/* Inspection-sheet metadata strip — mirrors the four header cells on
            a paper 設備点検表: equipment, inspector, shift, date. */}
        <div className="mb-7 overflow-hidden rounded-2xl border border-tecdia-border bg-white">
          <div className="grid grid-cols-2 divide-tecdia-border sm:grid-cols-4 sm:divide-x">
            <MetaCell label="Machine" value={machineName} />
            <MetaCell label="Inspector" value="You" />
            <MetaCell label="Shift" value={currentShift()} />
            <MetaCell label="Date" value={fmtToday()} mono />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-tecdia-border bg-white py-16 text-tecdia-muted">
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
          <form onSubmit={submit} className="space-y-7">
            {/* ── Visual checks (inspection-sheet table) ───────────────── */}
            {parameters.visual_checks?.length > 0 && (
              <Section title="Point of inspection" hint="Tap each row. ○ marks the item OK; ✕ flags it for your admin.">
                <div className="overflow-hidden rounded-2xl border border-tecdia-border bg-white">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/60">
                        <th className="w-12 border-b border-tecdia-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>#</th>
                        <th className="border-b border-tecdia-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>Check item</th>
                        <th className="w-44 border-b border-tecdia-border px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.visual_checks.map((c, idx) => {
                        const checked   = !!visualChecks[c.key];
                        const isAnomaly = checked === !!c.anomaly_when;
                        return (
                          <tr
                            key={c.key}
                            onClick={() => toggleCheck(c.key)}
                            className={`cursor-pointer border-b border-tecdia-border transition-colors last:border-b-0 ${
                              isAnomaly ? 'bg-orange-50/60 hover:bg-orange-50' : 'hover:bg-gray-50/60'
                            }`}
                          >
                            <td className="w-12 px-2 py-4 text-center font-mono text-[12px] text-tecdia-muted tabular-nums">{idx + 1}</td>
                            <td className="px-4 py-4 text-[14px] font-medium text-tecdia-textDeep">{c.label}</td>
                            <td className="w-44 px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleCheck(c.key); }}
                                className={`inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors ${
                                  isAnomaly
                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                }`}
                              >
                                {isAnomaly
                                  ? <><AlertTriangle size={13} strokeWidth={2.8} /> Flag</>
                                  : <><Check size={13} strokeWidth={3} /> OK</>}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── Numeric readings (inspection-sheet table) ───────────── */}
            {parameters.numeric_readings?.length > 0 && (
              <Section
                title="Measurements"
                hint={
                  phase === 'start'
                    ? 'Glance at each gauge. Out-of-range values will be flagged automatically.'
                    : 'Record what you see at end of shift. Anything outside the expected range is flagged for the next shift.'
                }
              >
                <div className="overflow-hidden rounded-2xl border border-tecdia-border bg-white">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50/60">
                        <th className="hidden w-12 border-b border-tecdia-border px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.16em] sm:table-cell" style={{ color: SHEET_RED }}>#</th>
                        <th className="border-b border-tecdia-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: SHEET_RED }}>Measurement</th>
                        <th className="hidden border-b border-tecdia-border px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] sm:table-cell" style={{ color: SHEET_RED }}>Expected</th>
                        <th className="w-36 border-b border-tecdia-border px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] sm:w-44" style={{ color: SHEET_RED }}>Your reading</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.numeric_readings.map((r, idx) => {
                        const Icon   = iconFor(r.label, r.unit);
                        const drift  = isReadingOutOfRange(r);
                        const recent = phase === 'start' ? (recentByKey[r.key] || []) : [];
                        const rangeText = (r.expected_min != null || r.expected_max != null)
                          ? `${r.expected_min ?? '—'}${r.expected_max != null ? ` – ${r.expected_max}` : ''}${r.unit ? ` ${r.unit}` : ''}`
                          : '—';
                        return (
                          <tr
                            key={r.key}
                            className={`border-b border-tecdia-border last:border-b-0 ${
                              drift ? 'bg-orange-50/40' : ''
                            }`}
                          >
                            <td className="hidden w-12 px-2 py-4 text-center align-top font-mono text-[12px] text-tecdia-muted tabular-nums sm:table-cell">{idx + 1}</td>
                            <td className="px-4 py-4 align-top">
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
                                      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                                        i === 0
                                          ? 'border-tecdia-accent/40 bg-tecdia-accent/10 text-tecdia-accent'
                                          : 'border-tecdia-border bg-tecdia-background text-tecdia-secondary'
                                      }`}
                                    >
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="hidden px-4 py-4 align-top text-[13px] font-medium text-tecdia-secondary sm:table-cell tabular-nums">
                              {rangeText}
                            </td>
                            <td className="w-36 px-3 py-3 align-top sm:w-44">
                              <input
                                id={`reading-${r.key}`}
                                type="text"
                                inputMode="decimal"
                                value={readings[r.key] ?? ''}
                                onChange={(e) => updateReading(r.key, e.target.value)}
                                placeholder="—"
                                className={`w-full rounded-lg border px-3 py-2 text-center text-[15px] font-bold tabular-nums outline-none transition-colors ${
                                  drift
                                    ? 'border-orange-400 bg-orange-50 text-orange-700 focus:ring-2 focus:ring-orange-200'
                                    : 'border-tecdia-border bg-tecdia-background text-tecdia-textDeep focus:border-tecdia-accent focus:bg-white focus:ring-2 focus:ring-tecdia-accent/15'
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

            {/* ── Notes ──────────────────────────────────────────────── */}
            <Section title="Notes" hint="Anything the next shift should know? Optional.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. cleaned coolant tank, replaced belt at 14:30…"
                className="h-28 w-full resize-none rounded-2xl border border-tecdia-border bg-white px-4 py-3 text-[14px] text-tecdia-textDeep outline-none transition-colors focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/15"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {NOTE_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => appendNote(s)}
                    className="rounded-full border border-tecdia-border bg-white px-3 py-1.5 text-[12px] font-semibold text-tecdia-secondary transition-colors hover:border-tecdia-accent hover:text-tecdia-accent"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </Section>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
                <AlertCircle size={14} strokeWidth={2.6} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </form>
        )}
      </main>

      {/* Sticky footer — Skip + Submit, always reachable */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-tecdia-border bg-white">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !machineId}
            className="text-[12px] font-bold text-tecdia-muted transition-colors hover:text-tecdia-textDeep disabled:opacity-40"
          >
            {copy.skipLabel}
          </button>

          <div className="flex items-center gap-3">
            {anomalyPreview > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-700">
                <AlertTriangle size={12} strokeWidth={2.6} />
                {anomalyPreview} {anomalyPreview === 1 ? 'issue' : 'issues'} will be flagged
              </span>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !machineId}
              className="flex items-center gap-2 rounded-full bg-tecdia-accent px-6 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-white shadow-sm transition-all hover:bg-tecdia-hover disabled:opacity-50"
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

const Section = ({ title, hint, children }) => (
  <section>
    <div className="mb-3 flex items-baseline gap-3">
      <span className="h-[2px] w-6" style={{ background: SHEET_RED }} />
      <h2 className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: SHEET_RED }}>{title}</h2>
    </div>
    {hint && <p className="mb-3 text-[12px] text-tecdia-muted">{hint}</p>}
    {children}
  </section>
);

const MetaCell = ({ label, value, mono = false }) => (
  <div className="border-b border-tecdia-border p-3.5 last:border-b-0 sm:border-b-0">
    <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: SHEET_RED }}>
      {label}
    </div>
    <div className={`mt-1 truncate text-[13px] font-bold text-tecdia-textDeep ${mono ? 'font-mono tabular-nums' : ''}`}>
      {value}
    </div>
  </div>
);

const EmptyCard = ({ title, body, cta }) => (
  <div className="rounded-3xl border border-tecdia-border bg-white px-6 py-12 text-center">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-tecdia-accent/10 text-tecdia-accent">
      <AlertCircle size={18} strokeWidth={2.4} />
    </div>
    <div className="text-[15px] font-bold text-tecdia-textDeep">{title}</div>
    <div className="mt-1.5 text-[13px] text-tecdia-secondary">{body}</div>
    {cta && <div className="mt-4 text-[13px]">{cta}</div>}
  </div>
);

export default ShiftLogPage;
