import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { fetchApi, downloadFile } from '../api/apiClient';
import { useMachines } from '../context/MachineContext';

const SEVERITY_STYLES = {
  1: { label: '1 - Info',     color: '#163b2c', bg: '#cfe8db', border: '#7bb89b' },
  2: { label: '2 - Minor',    color: '#4b3a05', bg: '#fde68a', border: '#eab308' },
  3: { label: '3 - Degraded', color: '#4b3a05', bg: '#facc15', border: '#a16207' },
  4: { label: '4 - Impact',   color: '#431407', bg: '#fb923c', border: '#c2410c' },
  5: { label: '5 - Safety',   color: '#ffffff', bg: '#dc2626', border: '#7f1d1d' },
};

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const CALENDAR_SEVERITY_STYLES = {
  1: { label: 'Info',     color: '#163b2c', bg: '#cfe8db', border: '#7bb89b', dot: '#2e4e40' },
  2: { label: 'Minor',    color: '#4b3a05', bg: '#fde68a', border: '#eab308', dot: '#ca8a04' },
  3: { label: 'Degraded', color: '#4b3a05', bg: '#facc15', border: '#a16207', dot: '#a16207' },
  4: { label: 'Impact',   color: '#431407', bg: '#fb923c', border: '#c2410c', dot: '#c2410c' },
  5: { label: 'Safety',   color: '#ffffff', bg: '#dc2626', border: '#7f1d1d', dot: '#7f1d1d' },
};

// ── All available columns ─────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'date',      label: 'Date'      },
  { key: 'time',      label: 'Time'      },
  { key: 'shift',     label: 'Shift'     },
  { key: 'phase',     label: 'Phase'     },
  { key: 'machine',   label: 'Machine'   },
  { key: 'worker',    label: 'Worker'    },
  { key: 'severity',  label: 'Severity'  },
];

const DEFAULT_VISIBLE = ['date', 'time', 'shift', 'phase', 'machine', 'worker', 'severity'];

const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd   = String(d.getDate()).padStart(2, '0');
  const mon  = MONTH_NAMES[d.getMonth()];
  const yyyy = d.getFullYear();
  const hhmm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dd}-${mon}-${yyyy} ${hhmm}`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd   = String(d.getDate()).padStart(2, '0');
  const mon  = MONTH_NAMES[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mon}-${yyyy}`;
};

// Relative date: "Today" / "Yesterday" / "N days ago" up to a week, then "27 May 2026".
const fmtRelativeDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(today) - startOfDay(d)) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  const monthFull = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${d.getDate()} ${monthFull} ${d.getFullYear()}`;
};

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Facility runs two shifts: 1st 06:00–18:00, 2nd 18:00–06:00.
const shiftFor = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const h = d.getHours();
  return (h >= 6 && h < 18) ? '1st shift' : '2nd shift';
};

const humanizeKey = (key) => (
  String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
);

const pad2 = (n) => String(n).padStart(2, '0');

const dateKeyFromDate = (date) => (
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
);

const dateKeyFromIso = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return dateKeyFromDate(d);
};

const formatMonthTitle = (date) => `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`;

const formatHotDayDate = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, delta) => new Date(date.getFullYear(), date.getMonth() + delta, 1);

const buildCalendarDays = (monthDate) => {
  const start = monthStart(monthDate);
  const mondayOffset = (start.getDay() + 6) % 7;
  const firstCell = new Date(start.getFullYear(), start.getMonth(), 1 - mondayOffset);
  const todayKey = dateKeyFromDate(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index);
    const key = dateKeyFromDate(date);
    return {
      date,
      key,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === start.getMonth(),
      isToday: key === todayKey,
    };
  });
};

const summarizeShiftLogsByDay = (logs) => {
  const activeLogs = logs.filter(log => !log.void_at && dateKeyFromIso(log.created_at));
  const byDay = {};

  activeLogs.forEach(log => {
    const dateKey = dateKeyFromIso(log.created_at);
    const severity = Math.max(1, Math.min(5, Number(log.severity) || 1));
    if (!byDay[dateKey]) {
      byDay[dateKey] = {
        dateKey,
        count: 0,
        maxSeverity: 1,
        anomalies: 0,
        criticalCount: 0,
        machineCounts: {},
      };
    }

    const day = byDay[dateKey];
    day.count += 1;
    day.maxSeverity = Math.max(day.maxSeverity, severity);
    day.anomalies += log.anomalies?.length || 0;
    if (severity >= 4) day.criticalCount += 1;
    day.machineCounts[log.machine_id] = (day.machineCounts[log.machine_id] || 0) + 1;
  });

  Object.values(byDay).forEach(day => {
    const [machineId] = Object.entries(day.machineCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || [];
    day.topMachineId = machineId || '';
  });

  return { activeLogs, byDay };
};

const getHotDays = (byDay) => (
  Object.values(byDay)
    .sort((a, b) =>
      b.maxSeverity - a.maxSeverity ||
      b.anomalies - a.anomalies ||
      b.count - a.count ||
      b.dateKey.localeCompare(a.dateKey)
    )
    .slice(0, 3)
);

// ── Select Columns Modal ──────────────────────────────────────────────────────
const SelectColumnsModal = ({ visible, draft, onToggle, onUpdate, onClose }) => {
  if (!visible) return null;
  return (
    <>
      <div onClick={onClose} style={m.backdrop} />
      <div style={m.modal}>
        <div style={m.header}>
          <span style={m.title}>Select columns to be displayed:</span>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>
        <div style={m.body}>
          {ALL_COLUMNS.map(col => (
            <label key={col.key} style={m.checkRow}>
              <input
                type="checkbox"
                checked={draft.includes(col.key)}
                onChange={() => onToggle(col.key)}
                style={m.checkbox}
              />
              <span style={m.checkLabel}>{col.label}</span>
            </label>
          ))}
        </div>
        <div style={m.noteBox}>
          <div style={m.noteHeader}>
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" fill="#5a72a0"/>
              <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">i</text>
            </svg>
            <span style={m.noteTitle}>Note</span>
          </div>
          <p style={m.noteText}>Hidden columns won't appear in the table. You can show them again at any time.</p>
        </div>
        <div style={m.footer}>
          <button onClick={onUpdate} style={m.updateBtn}>Update</button>
          <span style={m.pipe}>|</span>
          <button onClick={onClose} style={m.footerCloseBtn}>Close</button>
        </div>
      </div>
    </>
  );
};

const m = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,28,63,0.18)', zIndex: 1000 },
  modal: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', zIndex: 1001,
    background: '#fff', border: '1px solid #9fb3d0', borderRadius: 6,
    width: 300, boxShadow: '0 8px 32px rgba(15,28,63,0.16)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px 10px', borderBottom: '1px solid #dbe6f4',
  },
  title: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: '#1A53A1' },
  closeBtn: {
    background: 'none', border: '1px solid #9fb3d0', borderRadius: 3,
    color: '#5a72a0', fontSize: 11, fontWeight: 700,
    width: 20, height: 20, cursor: 'pointer', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  },
  body: { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  checkbox: { width: 14, height: 14, accentColor: '#5a72a0', cursor: 'pointer', flexShrink: 0 },
  checkLabel: { fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#0f1c3f' },
  noteBox: {
    margin: '4px 14px 10px', background: '#eef3fb',
    border: '1px solid #9fb3d0', borderRadius: 4, padding: '8px 10px',
  },
  noteHeader: { display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  noteTitle: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: '#2b446b' },
  noteText: { fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#4a6080', margin: 0, lineHeight: 1.5 },
  footer: {
    borderTop: '1px solid #dbe6f4', padding: '8px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
  },
  updateBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#1A53A1', padding: 0,
  },
  pipe: { color: '#9fb3d0', fontSize: 12 },
  footerCloseBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#1A53A1', padding: 0,
  },
};

// ── Main Component ────────────────────────────────────────────────────────────
const ShiftLogsPanel = () => {
  const { machines } = useMachines();

  const [logs, setLogs]                   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [shiftFilter, setShiftFilter]     = useState('all');
  const [daysFilter, setDaysFilter]       = useState('all');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [search, setSearch]               = useState('');
  const [selectedId, setSelectedId]       = useState(null);
  const [voidingId, setVoidingId]         = useState(null);
  const [voidReason, setVoidReason]       = useState('');
  const [syncing, setSyncing]             = useState(false);
  const [exportOpen, setExportOpen]       = useState(false);
  const [exporting, setExporting]         = useState(false);
  const [visibleMonth, setVisibleMonth]   = useState(() => monthStart(new Date()));
  const [calendarMonthTouched, setCalendarMonthTouched] = useState(false);

  // Column visibility
  const [visibleCols, setVisibleCols]   = useState(DEFAULT_VISIBLE);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [draftCols, setDraftCols]       = useState(DEFAULT_VISIBLE);

  const openColModal   = () => { setDraftCols(visibleCols); setColModalOpen(true); };
  const closeColModal  = () => setColModalOpen(false);
  const toggleDraft    = (key) => setDraftCols(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );
  const applyColUpdate = () => { setVisibleCols(draftCols); setColModalOpen(false); };
  const colVisible     = (key) => visibleCols.includes(key);

  const machineNameFor = useCallback((id) => {
    const mx = machines.find(x => x.id === id);
    return mx?.display_name || mx?.name || id.replaceAll('_', ' ');
  }, [machines]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (machineFilter) qs.set('machine_id', machineFilter);
      qs.set('limit', '200');
      const data = await fetchApi(`/admin/shifts?${qs.toString()}`);
      setLogs(data.logs || []);
    } catch (e) {
      setError(e.message || 'Failed to load shift logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [machineFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => { setSyncing(true); await load(); setSyncing(false); };

  const buildExportUrl = (format) => {
    const qs = new URLSearchParams();
    if (machineFilter)         qs.set('machine_id', machineFilter);
    if (severityFilter !== 'all') qs.set('severity', severityFilter);
    if (shiftFilter !== 'all')    qs.set('shift', shiftFilter);
    if (daysFilter !== 'all')     qs.set('days', daysFilter);
    if (daysFilter === 'all' && dateFrom) qs.set('date_from', dateFrom);
    if (daysFilter === 'all' && dateTo)   qs.set('date_to', dateTo);
    const q = qs.toString();
    return `/admin/shifts/export.${format}${q ? `?${q}` : ''}`;
  };

  const handleExport = async (format) => {
    setExportOpen(false);
    setExporting(true);
    try { await downloadFile(buildExportUrl(format), `shift_logs.${format}`); }
    catch (e) { setError(e.message || `Failed to export ${format.toUpperCase()}`); }
    finally   { setExporting(false); }
  };

  const { activeLogs, byDay: calendarByDay } = useMemo(() => summarizeShiftLogsByDay(logs), [logs]);

  useEffect(() => {
    if (calendarMonthTouched || activeLogs.length === 0) return;
    const newestLog = activeLogs.reduce((latest, log) => {
      const currentTs = new Date(log.created_at).getTime();
      const latestTs = latest ? new Date(latest.created_at).getTime() : -Infinity;
      return currentTs > latestTs ? log : latest;
    }, null);
    if (newestLog) setVisibleMonth(monthStart(new Date(newestLog.created_at)));
  }, [activeLogs, calendarMonthTouched]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const hotDays = useMemo(() => getHotDays(calendarByDay), [calendarByDay]);
  const selectedDayKey = dateFrom && dateTo && dateFrom === dateTo ? dateFrom : '';

  const moveCalendarMonth = (delta) => {
    setCalendarMonthTouched(true);
    setVisibleMonth(prev => addMonths(prev, delta));
  };

  const handleCalendarDayClick = (dayKey) => {
    if (!calendarByDay[dayKey]) return;
    setDateFrom(dayKey);
    setDateTo(dayKey);
    setDaysFilter('all');
    setSelectedId(null);
  };

  const handleAllDays = () => {
    setDateFrom('');
    setDateTo('');
    setDaysFilter('all');
    setSelectedId(null);
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const daysMs = daysFilter === 'all' ? null : Number(daysFilter) * 86400000;
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs   = dateTo   ? new Date(dateTo   + 'T23:59:59').getTime() : null;
    const n      = search.trim().toLowerCase();

    return logs.filter(l => {
      const t = new Date(l.created_at).getTime();

      if (daysMs !== null && (now - t) > daysMs) return false;
      if (daysFilter === 'all' && fromTs !== null && t < fromTs) return false;
      if (daysFilter === 'all' && toTs   !== null && t > toTs)   return false;

      if (severityFilter !== 'all' && String(l.severity) !== severityFilter) return false;
      if (shiftFilter    !== 'all' && shiftFor(l.created_at) !== shiftFilter) return false;

      if (n) {
        const inSearch =
          (l.worker_label || '').toLowerCase().includes(n) ||
          (l.notes || '').toLowerCase().includes(n) ||
          machineNameFor(l.machine_id).toLowerCase().includes(n) ||
          (l.anomalies || []).some(a => (a.title || '').toLowerCase().includes(n));
        if (!inSearch) return false;
      }
      return true;
    });
  }, [logs, search, machineNameFor, severityFilter, shiftFilter, daysFilter, dateFrom, dateTo]);

  const selectedLog = selectedId ? filtered.find(l => l.id === selectedId) || null : null;

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const daySummaries = Object.values(calendarByDay);
    return {
      thisWeek:     activeLogs.filter(l => new Date(l.created_at).getTime() >= weekAgo).length,
      anomalies:    activeLogs.reduce((sum, log) => sum + (log.anomalies?.length || 0), 0),
      criticalDays: daySummaries.filter(day => day.maxSeverity >= 4).length,
      highSev:      activeLogs.filter(l => Number(l.severity) >= 4).length,
    };
  }, [activeLogs, calendarByDay]);

  const handleAcknowledge = async (id) => {
    try { await fetchApi(`/admin/shifts/${id}/acknowledge`, { method: 'POST' }); load(); }
    catch (e) { setError(e.message); }
  };

  const handleVoid = async (id) => {
    if (!voidReason.trim()) return;
    try {
      await fetchApi(`/admin/shifts/${id}/void`, { method: 'POST', body: JSON.stringify({ reason: voidReason }) });
      setVoidingId(null); setVoidReason(''); load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={s.root}>
      <style>{CSS}</style>

      <SelectColumnsModal
        visible={colModalOpen}
        draft={draftCols}
        onToggle={toggleDraft}
        onUpdate={applyColUpdate}
        onClose={closeColModal}
      />

      <section style={s.hero} className="sl-hero">
        <div style={s.heroIntro}>
          <div style={s.heroKicker}>Shift intelligence</div>
          <h1 style={s.pageTitle}>Shift Logs</h1>
          <p style={s.heroCopy}>Daily condition history by severity and anomaly volume.</p>

          <div style={s.heroStatsGrid}>
            {[
              { num: stats.thisWeek,     lbl: 'Logs this week' },
              { num: stats.anomalies,    lbl: 'Issues found' },
              { num: stats.criticalDays, lbl: 'Critical days' },
              { num: stats.highSev,      lbl: 'Critical alerts' },
            ].map(item => (
              <div key={item.lbl} style={s.heroStat}>
                <span style={s.heroStatNum}>{item.num}</span>
                <span style={s.heroStatLbl}>{item.lbl}</span>
              </div>
            ))}
          </div>

          <div style={s.legendRow}>
            {[1, 3, 4, 5].map(level => {
              const sev = CALENDAR_SEVERITY_STYLES[level];
              return (
                <span key={level} style={s.legendItem}>
                  <span style={{ ...s.legendDot, background: sev.dot }} />
                  {level === 3 ? 'Sev 2-3' : `Sev ${level}`}
                </span>
              );
            })}
          </div>
        </div>

        <div style={s.calendarPanel}>
          <div style={s.calendarHeader}>
            <button
              type="button"
              onClick={() => moveCalendarMonth(-1)}
              style={s.monthBtn}
              className="sl-icon-btn"
              aria-label="Previous month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <div style={s.calendarTitleBlock}>
              <div style={s.calendarTitle}>{formatMonthTitle(visibleMonth)}</div>
              <div style={s.calendarSubtitle}>
                {selectedDayKey ? `${formatHotDayDate(selectedDayKey)} selected` : 'Severity by local shift date'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => moveCalendarMonth(1)}
              style={s.monthBtn}
              className="sl-icon-btn"
              aria-label="Next month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div style={s.weekdayGrid}>
            {WEEKDAY_LABELS.map(day => <span key={day} style={s.weekday}>{day}</span>)}
          </div>

          <div style={s.calendarGrid}>
            {calendarDays.map(day => {
              const summary = calendarByDay[day.key];
              const sev = summary ? CALENDAR_SEVERITY_STYLES[summary.maxSeverity] : null;
              const isSelected = selectedDayKey === day.key;
              const dayStyle = {
                ...s.calendarDay,
                ...(!day.isCurrentMonth ? s.calendarDayOutside : null),
                ...(summary ? {
                  background: sev.bg,
                  borderColor: sev.border,
                  color: sev.color,
                  cursor: 'pointer',
                } : null),
                ...(summary?.maxSeverity >= 4 ? {
                  boxShadow: `inset 0 -3px 0 ${sev.dot}`,
                } : null),
                ...(summary?.maxSeverity === 5 ? {
                  boxShadow: '0 0 0 2px rgba(239,68,68,0.38), 0 10px 22px rgba(127,29,29,0.22)',
                } : null),
                ...(isSelected ? {
                  borderColor: '#2D8CFF',
                  boxShadow: summary?.maxSeverity === 5
                    ? '0 0 0 2px rgba(45,140,255,0.42), 0 10px 22px rgba(127,29,29,0.22)'
                    : '0 0 0 2px rgba(45,140,255,0.22)',
                } : null),
              };

              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={!summary}
                  onClick={() => handleCalendarDayClick(day.key)}
                  style={dayStyle}
                  className={`sl-calendar-day${summary ? ' sl-calendar-day-active' : ''}${summary?.maxSeverity === 5 ? ' sl-calendar-day-alarm' : ''}`}
                  title={summary ? `${summary.count} logs · max severity ${summary.maxSeverity}` : undefined}
                >
                  <span style={s.calendarDayTop}>
                    <span style={{ ...s.calendarDayNum, fontWeight: day.isToday ? 800 : 700 }}>{day.day}</span>
                    {summary?.maxSeverity === 5 && <span style={s.alarmMark}>!</span>}
                  </span>
                  {summary && <span style={{ ...s.calendarCount, color: summary.maxSeverity === 5 ? '#ffffff' : 'inherit' }}>{summary.count}</span>}
                </button>
              );
            })}
          </div>

          <div style={s.calendarFooter}>
            <button type="button" onClick={handleAllDays} style={s.allDaysBtn} className="sl-all-days-btn">
              All days
            </button>
            <span style={s.calendarFootnote}>Local dates · voided logs excluded</span>
          </div>
        </div>

        <div style={s.hotPanel}>
          <div style={s.hotHeader}>
            <span style={s.hotKicker}>Hot days</span>
            <span style={s.hotCount}>{hotDays.length}</span>
          </div>
          {hotDays.length === 0 ? (
            <div style={s.hotEmpty}>No shift logs in the loaded window.</div>
          ) : (
            <div style={s.hotList}>
              {hotDays.map(day => {
                const sev = CALENDAR_SEVERITY_STYLES[day.maxSeverity];
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => handleCalendarDayClick(day.dateKey)}
                    style={{
                      ...s.hotItem,
                      borderLeftColor: sev.dot,
                      background: selectedDayKey === day.dateKey ? '#eef6ff' : '#ffffff',
                    }}
                    className="sl-hot-item"
                  >
                    <div style={s.hotItemTop}>
                      <span style={s.hotDate}>{formatHotDayDate(day.dateKey)}</span>
                      <span style={{ ...s.hotSev, color: sev.color, background: sev.bg, borderColor: sev.border }}>
                        Sev {day.maxSeverity}
                      </span>
                    </div>
                    <div style={s.hotMachine}>{day.topMachineId ? machineNameFor(day.topMachineId) : 'All machines'}</div>
                    <div style={s.hotMeta}>
                      {day.count} logs · {day.anomalies} issues · {day.criticalCount} critical
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div style={s.controls}>
        <div style={s.leftControls}>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>Machine</div>
            <select value={machineFilter} onChange={e => setMachineFilter(e.target.value)} style={s.select} className="sl-select">
              <option value="">All machines</option>
              {machines.map(mx => <option key={mx.id} value={mx.id}>{mx.display_name || mx.name}</option>)}
            </select>
          </div>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>Severity</div>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={s.select} className="sl-select">
              <option value="all">All severities</option>
              <option value="1">Severity 1</option>
              <option value="2">Severity 2</option>
              <option value="3">Severity 3</option>
              <option value="4">Severity 4</option>
              <option value="5">Severity 5</option>
            </select>
          </div>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>Shift</div>
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} style={s.select} className="sl-select">
              <option value="all">All shifts</option>
              <option value="1st shift">1st shift</option>
              <option value="2nd shift">2nd shift</option>
            </select>
          </div>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>Time range</div>
            <select
              value={daysFilter}
              onChange={e => { setDaysFilter(e.target.value); if (e.target.value !== 'all') { setDateFrom(''); setDateTo(''); } }}
              style={s.select} className="sl-select"
            >
              <option value="all">All time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>From</div>
            <input
              type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); if (e.target.value) setDaysFilter('all'); }}
              style={s.dateInput} className="sl-input"
            />
          </div>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>To</div>
            <input
              type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); if (e.target.value) setDaysFilter('all'); }}
              style={s.dateInput} className="sl-input"
            />
          </div>
          <div style={s.searchWrap}>
            <div style={s.selectLabel}>Search</div>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2D8CFF" strokeWidth="2" strokeLinecap="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Worker, notes, anomaly…"
                style={s.searchInput} className="sl-input"
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {/* ── Select Columns button ── */}
          <button onClick={openColModal} style={s.linkBtn} className="sl-col-btn">
            <div style={s.linkIconBox}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </div>
            <span style={s.linkText}>Select columns</span>
          </button>

          <button onClick={handleSync} style={s.linkBtn} className="sl-sync-btn">
            <div style={s.linkIconBox}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, transition: 'transform 0.6s', transform: syncing ? 'rotate(360deg)' : 'none' }}>
                <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>
            <span style={s.linkText}>Refresh</span>
          </button>

          {/* ── Export menu ── */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={exporting}
              style={s.linkBtn}
              className="sl-export-btn"
            >
              <div style={s.linkIconBox}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>
                </svg>
              </div>
              <span style={s.linkText}>{exporting ? 'Exporting…' : 'Export'}</span>
            </button>
            {exportOpen && (
              <>
                <div onClick={() => setExportOpen(false)} style={s.exportBackdrop} />
                <div style={s.exportMenu}>
                  <button onClick={() => handleExport('xlsx')} style={s.exportItem} className="sl-export-item">
                    <span style={s.exportItemLabel}>Excel</span>
                    <span style={s.exportItemHint}>.xlsx</span>
                  </button>
                  <button onClick={() => handleExport('pdf')} style={s.exportItem} className="sl-export-item">
                    <span style={s.exportItemLabel}>PDF</span>
                    <span style={s.exportItemHint}>.pdf</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={s.errorBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <div style={s.mainLayout}>
        <div style={s.card}>
          {loading && logs.length === 0 ? (
            <div style={s.loadState}>
              <div className="sl-spinner" />
              <span style={{ fontSize: 13, color: '#6b7a9e' }}>Loading shift logs…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 13, color: '#6b7a9e', fontStyle: 'italic' }}>No shift logs found.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr style={s.theadRow}>
                    {colVisible('date')      && <th style={s.th}>Date</th>}
                    {colVisible('time')      && <th style={s.th}>Time</th>}
                    {colVisible('shift')     && <th style={s.th}>Shift</th>}
                    {colVisible('phase')     && <th style={s.th}>Phase</th>}
	                    {colVisible('machine')   && <th style={s.th}>Machine</th>}
	                    {colVisible('worker')    && <th style={s.th}>Worker</th>}
	                    {colVisible('severity')  && <th style={s.th}>Severity</th>}
	                  </tr>
	                </thead>
	                <tbody>
	                  {filtered.map((log) => {
	                    const isVoid = !!log.void_at;
	                    const isOpen = selectedLog?.id === log.id;

	                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedId(log.id)}
                        style={{
                          ...s.tr,
                          background: isOpen ? '#deeeff' : '#ffffff',
                          borderLeft: isOpen ? '3px solid #2D8CFF' : '3px solid transparent',
                          opacity: isVoid ? 0.55 : 1,
                        }}
                        className="sl-row"
                      >
                        {colVisible('date') && (
                          <td style={s.td} title={fmtDate(log.created_at)}>
                            <span style={{ ...s.cellText, color: isOpen ? '#2D8CFF' : '#0f1c3f', fontWeight: isOpen ? 600 : 500 }}>
                              {fmtRelativeDate(log.created_at)}
                            </span>
                          </td>
                        )}
                        {colVisible('time') && (
                          <td style={s.td}>
                            <span style={{ ...s.cellText, color: isOpen ? '#2D8CFF' : '#0f1c3f', fontWeight: isOpen ? 600 : 400 }}>
                              {fmtTime(log.created_at)}
                            </span>
                          </td>
                        )}
                        {colVisible('shift') && (
                          <td style={s.td}>
                            <span style={s.cellText}>{shiftFor(log.created_at)}</span>
                          </td>
                        )}
                        {colVisible('phase') && (
                          <td style={s.td}>
                            <span style={s.cellText}>
                              {isVoid ? 'Void' : log.phase === 'start' ? 'Pre-shift' : 'End of shift'}
                            </span>
                          </td>
                        )}
                        {colVisible('machine') && (
                          <td style={s.td}>
                            <span style={{ ...s.cellText, fontWeight: 600, color: '#0f1c3f' }}>
                              {machineNameFor(log.machine_id)}
                            </span>
                          </td>
                        )}
                        {colVisible('worker') && (
                          <td style={s.td}>
                            <div style={s.actorWrap}>
                              <div style={s.avatar}>{(log.worker_label || '?').charAt(0).toUpperCase()}</div>
                              <span style={{ ...s.cellText, fontWeight: 600, color: '#0f1c3f' }}>{log.worker_label || '—'}</span>
                            </div>
                          </td>
                        )}
                        {colVisible('severity') && (() => {
                          const sev = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES[1];
                          return (
                            <td style={s.td}>
                              <span style={{ ...s.sevPill, color: sev.color, background: sev.bg, borderColor: sev.border }}>
                                {sev.label}
                              </span>
                            </td>
                          );
                        })()}
	                      </tr>
	                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedLog && (() => {
          const sev = SEVERITY_STYLES[selectedLog.severity] || SEVERITY_STYLES[1];
          const readings = Object.entries(selectedLog.readings || {});
          const isVoid = !!selectedLog.void_at;

          return ReactDOM.createPortal(
            <>
              <div onClick={() => setSelectedId(null)} style={s.modalBackdrop} />
	              <div style={s.detailPanel}>
	                <button onClick={() => setSelectedId(null)} style={s.detailCloseBtn}>✕</button>
	                <div style={s.detailHeader}>
	                  <div style={s.detailHeaderLeft}>
	                    <span style={{ ...s.sevBadge, color: sev.color, background: sev.bg, borderColor: sev.border }}>
	                      Severity {selectedLog.severity} - {sev.label.split(' - ')[1] || sev.label}
	                    </span>
	                    <div style={s.detailMachine}>{machineNameFor(selectedLog.machine_id)}</div>
	                    <div style={s.detailSubline}>
	                      {selectedLog.phase === 'start' ? 'Pre-shift checklist' : 'End-of-shift log'} · {fmtTs(selectedLog.created_at)}
	                    </div>
	                  </div>
                </div>

                <div style={s.detailGrid} className="sl-detail-grid">
                  {[
                    ['Worker', selectedLog.worker_label || '—'],
                    ['Shift', shiftFor(selectedLog.created_at)],
                    ['Status', selectedLog.acknowledged ? 'Acknowledged' : 'Needs review'],
                    ['Station', selectedLog.workstation_ip || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={s.metaCard}>
                      <span style={s.metaKey}>{k}</span>
                      <span style={{
                        ...s.metaVal,
                        color: k === 'Status' && !selectedLog.acknowledged ? '#c2410c' : '#0f172a',
                        fontFamily: k === 'Station' ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif",
                      }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={s.detailContentGrid} className="sl-detail-content-grid">
                  {readings.length > 0 && (
                    <section style={s.detailSection}>
                      <div style={s.sectionHeader}>
                        <span style={s.sectionLabel}>Readings</span>
                        <span style={s.sectionCount}>{readings.length}</span>
                      </div>
                      <div style={s.readingsBlock}>
                        {readings.map(([k, v]) => (
                          <div key={k} style={s.readingRow}>
                            <span style={s.readingKey}>{humanizeKey(k)}</span>
                            <span style={s.readingVal}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section style={s.detailSection}>
                    <div style={s.sectionHeader}>
                      <span style={{ ...s.sectionLabel, color: selectedLog.anomalies?.length ? '#7f1d1d' : '#6d7c74' }}>Anomalies</span>
                      <span style={s.sectionCount}>{selectedLog.anomalies?.length || 0}</span>
                    </div>
                    {selectedLog.anomalies?.length > 0 ? (
                      <div style={s.anomalyBlock}>
                        {selectedLog.anomalies.map((a, idx) => (
                          <div key={idx} style={s.anomalyItem}>
                            <div style={s.anomalyTitle}>{a.title}</div>
                            {a.detail && <div style={s.anomalyDetail}>{a.detail}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={s.noAnomaly}>No anomalies reported for this log.</div>
                    )}
                  </section>
                </div>

                {selectedLog.notes && (
                  <div style={s.notesBlock}>
                    <span style={s.notesLabel}>Notes</span>
                    <span style={s.notesText}>{selectedLog.notes}</span>
                  </div>
                )}

                {isVoid && (
                  <div style={s.voidBlock}>
                    <strong>Void record:</strong> {selectedLog.void_reason || '(no reason given)'}
                    {selectedLog.voided_by && <div style={s.voidBy}>by {selectedLog.voided_by}</div>}
                  </div>
                )}

	              <div style={s.divider} />

              {voidingId === selectedLog.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={s.sectionLabel}>Reason for voiding</div>
                  <input
                    autoFocus type="text" value={voidReason}
                    onChange={e => setVoidReason(e.target.value)}
                    placeholder="e.g. submitted by mistake"
                    style={s.voidInput} className="sl-input"
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setVoidingId(null); setVoidReason(''); }} style={s.cancelBtn} className="sl-cancel-btn">Cancel</button>
                    <button onClick={() => handleVoid(selectedLog.id)} disabled={!voidReason.trim()} style={s.confirmBtn}>Confirm void</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAcknowledge(selectedLog.id)}
                    disabled={selectedLog.acknowledged}
                    style={s.ackBtn}
                    className="sl-ack-btn"
                  >
                    {selectedLog.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                  {!isVoid && (
                    <button onClick={() => { setVoidingId(selectedLog.id); setVoidReason(''); }} style={s.voidBtn} className="sl-void-btn">
                      Void
                    </button>
                  )}
                </div>
              )}
            </div>
            </>
          , document.body);
        })()}
      </div>
    </div>
  );
};

const s = {
  root: { fontFamily: "'Inter', sans-serif", background: '#ffffff', color: '#2e4e40', minHeight: '100vh', padding: '0 24px 28px' },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(210px, 0.8fr) minmax(360px, 1.15fr) minmax(230px, 0.9fr)',
    gap: 14,
    alignItems: 'stretch',
    margin: '0 0 22px',
  },
  heroIntro: {
    background: '#ffffff',
    border: '1px solid #d7e1ee',
    borderRadius: 8,
    padding: 18,
    minWidth: 0,
    boxShadow: '0 14px 34px rgba(15,28,63,0.06)',
  },
  heroKicker: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2D8CFF', marginBottom: 8 },
  pageTitle: { fontFamily: "'Sora', sans-serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#0f172a', letterSpacing: 0, margin: '0' },
  heroCopy: { fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, color: '#4a6080', margin: '8px 0 16px' },
  heroStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 },
  heroStat: {
    minHeight: 68,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '10px 11px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#f8fbff',
  },
  heroStatNum: { fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, lineHeight: 1, color: '#0f172a' },
  heroStatLbl: { fontSize: 11, fontWeight: 700, color: '#5a6d88', lineHeight: 1.25 },
  legendRow: { display: 'flex', flexWrap: 'wrap', gap: '8px 10px', marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0' },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#53657d' },
  legendDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  calendarPanel: {
    background: '#ffffff',
    border: '1px solid #c9d8ee',
    borderRadius: 8,
    padding: 16,
    minWidth: 0,
    boxShadow: '0 18px 44px rgba(45,140,255,0.08)',
  },
  calendarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  monthBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: '1px solid #c9d8ee',
    background: '#ffffff',
    color: '#2D8CFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  calendarTitleBlock: { textAlign: 'center', minWidth: 0 },
  calendarTitle: { fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 800, color: '#0f172a', lineHeight: 1.15 },
  calendarSubtitle: { fontSize: 11, fontWeight: 700, color: '#6b7a9e', marginTop: 3 },
  weekdayGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 6 },
  weekday: { textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a8ca8' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 },
  calendarDay: {
    aspectRatio: '1 / 1',
    minHeight: 42,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#f8fafc',
    color: '#8391a7',
    padding: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    cursor: 'default',
    transition: 'transform 0.12s, border-color 0.12s, box-shadow 0.12s, background 0.12s',
  },
  calendarDayOutside: { opacity: 0.38 },
  calendarDayTop: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  calendarDayNum: { fontFamily: "'Sora', sans-serif", fontSize: 13, lineHeight: 1 },
  alarmMark: {
    width: 15,
    height: 15,
    borderRadius: '50%',
    background: '#7f1d1d',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.65)',
  },
  calendarCount: { alignSelf: 'flex-end', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, lineHeight: 1, color: 'inherit' },
  calendarFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' },
  allDaysBtn: { border: '1px solid #c9d8ee', borderRadius: 6, background: '#ffffff', color: '#2D8CFF', fontSize: 12, fontWeight: 800, padding: '7px 11px', cursor: 'pointer' },
  calendarFootnote: { fontSize: 11, fontWeight: 600, color: '#7a8ca8', textAlign: 'right' },
  hotPanel: {
    background: '#ffffff',
    border: '1px solid #d7e1ee',
    borderRadius: 8,
    padding: 16,
    minWidth: 0,
    boxShadow: '0 14px 34px rgba(15,28,63,0.06)',
  },
  hotHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  hotKicker: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0f172a' },
  hotCount: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 800, color: '#2D8CFF', border: '1px solid #c9d8ee', borderRadius: 6, padding: '3px 7px' },
  hotEmpty: { minHeight: 174, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#7a8ca8', fontSize: 12, fontWeight: 600, border: '1px dashed #d7e1ee', borderRadius: 8, padding: 16 },
  hotList: { display: 'flex', flexDirection: 'column', gap: 9 },
  hotItem: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #2D8CFF',
    borderRadius: 8,
    padding: '10px 11px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s, transform 0.12s',
  },
  hotItemTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  hotDate: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 800, color: '#0f172a' },
  hotSev: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800, border: '1px solid', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' },
  hotMachine: { fontSize: 12, fontWeight: 800, color: '#2e4e40', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  hotMeta: { fontSize: 11, fontWeight: 600, color: '#6b7a9e', marginTop: 3 },
  controls: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  leftControls: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    alignItems: 'end',
    gap: '12px 16px',
    flex: 1,
    minWidth: 0,
  },
  selectWrap: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  selectLabel: { fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74' },
  select: {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
    padding: '6px 24px 6px 0px', border: 'none', borderBottom: '1px solid #e5e7eb',
    background: '#fff', color: '#2e4e40', outline: 'none', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232D8CFF' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right center',
    width: '100%', minWidth: 0,
  },
  searchWrap: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  searchInput: {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
    padding: '6px 10px 6px 24px', border: 'none', borderBottom: '1px solid #e5e7eb',
    background: '#fff', color: '#2e4e40', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  dateInput: {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
    padding: '6px 0', border: 'none', borderBottom: '1px solid #e5e7eb',
    background: '#fff', color: '#2e4e40', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  linkBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0, outline: 'none',
  },
  linkIconBox: {
    background: '#2D8CFF', color: '#fff', padding: '3px 4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2,
  },
  linkText: {
    fontSize: 14, color: '#888', textDecoration: 'underline',
    fontFamily: "'Inter', sans-serif",
  },
  exportBackdrop: { position: 'fixed', inset: 0, zIndex: 998 },
  exportMenu: {
    position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 999,
    background: '#fff', border: '1px solid #9fb3d0', borderRadius: 6,
    boxShadow: '0 6px 24px rgba(15,28,63,0.12)', minWidth: 140, overflow: 'hidden',
  },
  exportItem: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, padding: '10px 14px', border: 'none', background: 'transparent',
    cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  },
  exportItemLabel: { fontSize: 12, fontWeight: 600, color: '#0f1c3f' },
  exportItemHint:  { fontSize: 11, color: '#6b7a9e', fontFamily: "'IBM Plex Mono', monospace" },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 4,
    background: '#fef2f2', border: '1px solid #dc9b9b', color: '#844d4d', fontSize: 12, fontWeight: 600, marginBottom: 14,
  },
  mainLayout: { display: 'flex', alignItems: 'flex-start', gap: 24 },
  card: {
    flex: 1,
    background: '#fff', border: '1px solid #b0b0b0', borderRadius: 0,
    boxShadow: 'none', overflow: 'hidden',
  },
  loadState: { padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyState: { padding: '40px 24px', textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' },
  theadRow: { background: '#5a72a0' },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: '#ffffff',
    fontFamily: "'Inter', sans-serif",
    borderRight: '1px solid #b0b0b0',
  },
  tr: {
    borderBottom: '1px solid #b0b0b0',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  td: { padding: '9px 14px', verticalAlign: 'middle', borderRight: '1px solid #b0b0b0' },
  cellText: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: '#2e4e40' },
  actorWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 22, height: 22, borderRadius: '50%', background: '#e8f3ff', border: '1px solid #c9d5ee',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: '#2D8CFF', flexShrink: 0, fontFamily: "'Sora', sans-serif",
  },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(15,28,63,0.18)', zIndex: 1000 },
  detailPanel: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 'min(720px, calc(100vw - 40px))', background: '#fff', padding: '22px 24px', borderRadius: 10,
    boxShadow: '0 18px 54px rgba(15,28,63,0.20)', zIndex: 1001, maxHeight: '86vh', overflowY: 'auto',
    boxSizing: 'border-box',
  },
  detailCloseBtn: {
    position: 'absolute', top: 18, right: 18, background: '#fff', border: '1px solid #9fb3d0', borderRadius: 3,
    color: '#5a72a0', fontSize: 11, fontWeight: 700, width: 24, height: 24, cursor: 'pointer', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 10
  },
  detailHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14, paddingRight: 34 },
  detailHeaderLeft: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  detailMachine: { fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.15 },
  detailSubline: { fontSize: 12, fontWeight: 700, color: '#5a6d88' },
  unackBadge: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, color: '#2D8CFF', letterSpacing: '0.04em', marginTop: 2 },
  divider: { height: 1, background: '#e5e7eb', margin: '16px 0' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 12 },
  metaCard: { border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', padding: '9px 10px', minWidth: 0 },
  metaKey: { display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#6d7c74', marginBottom: 4 },
  metaVal: { display: 'block', fontSize: 12, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  detailContentGrid: { display: 'grid', gridTemplateColumns: '0.82fr 1.18fr', gap: 12, alignItems: 'start' },
  detailSection: { border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff', overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  sectionLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74', margin: 0 },
  sectionCount: { minWidth: 20, height: 20, borderRadius: 999, background: '#e8f3ff', color: '#1A53A1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800 },
  readingsBlock: { display: 'grid', gridTemplateColumns: '1fr', gap: 0, padding: '6px 11px' },
  readingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px dashed #e5e7eb' },
  readingKey: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: '#53657d' },
  readingVal: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 800, color: '#0f172a' },
  notesBlock: { display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10, alignItems: 'start', marginTop: 12, padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' },
  notesLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74' },
  notesText: { fontSize: 12, color: '#4e5a52', lineHeight: 1.45 },
  anomalyBlock: { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 },
  anomalyItem: { border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', borderRadius: 7, background: '#fff7f7', padding: '8px 10px' },
  anomalyTitle: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 800, color: '#7f1d1d', marginBottom: 3 },
  anomalyDetail: { fontSize: 11, color: '#6d5335', lineHeight: 1.45 },
  noAnomaly: { padding: '14px 11px', fontSize: 12, fontWeight: 700, color: '#6d7c74' },
  voidBlock: { marginTop: 12, padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', fontSize: 12, color: '#4e5a52' },
  voidBy: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6d7c74' },
  sevBadge: { display: 'inline-block', alignSelf: 'flex-start', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 800, padding: '5px 9px', borderRadius: 5, border: '1px solid', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sevPill: {
    display: 'inline-block', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
    padding: '3px 10px', borderRadius: 999, border: '1px solid', whiteSpace: 'nowrap', letterSpacing: '0.01em',
  },
  ackBtn: { flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, padding: '8px 0', border: 'none', borderRadius: 4, background: '#2D8CFF', color: '#ffffff', cursor: 'pointer', transition: 'all 0.12s' },
  voidBtn: { fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#6d7c74', cursor: 'pointer', transition: 'all 0.12s' },
  voidInput: { width: '100%', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: '6px 0', border: 'none', borderBottom: '1px solid #dc9b9b', background: '#fff', color: '#2e4e40', outline: 'none' },
  cancelBtn: { flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, padding: '8px 0', border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', color: '#6d7c74', cursor: 'pointer' },
  confirmBtn: { flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, padding: '8px 0', border: 'none', borderRadius: 4, background: '#dc9b9b', color: '#fff', cursor: 'pointer' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
  .sl-row:hover { background: #eef4ff !important; }
  .sl-ack-btn:hover:not(:disabled) { background: #1A75E8 !important; }
  .sl-void-btn:hover { border-color: #dc9b9b !important; color: #844d4d !important; }
  .sl-cancel-btn:hover { background: #f2f4f7 !important; }
  .sl-export-item:hover { background: #eef4ff !important; }
  .sl-icon-btn:hover { background: #eef6ff !important; border-color: #2D8CFF !important; }
  .sl-calendar-day-active:hover { transform: translateY(-1px); border-color: #2D8CFF !important; }
  .sl-calendar-day-alarm { animation: sl-alarm-glow 1.9s ease-in-out infinite; }
  .sl-all-days-btn:hover { background: #eef6ff !important; border-color: #2D8CFF !important; }
  .sl-hot-item:hover { background: #f8fbff !important; border-color: #c9d8ee !important; transform: translateY(-1px); }
  .sl-input:focus  { border-bottom-color: #2D8CFF !important; }
  .sl-select:focus { border-bottom-color: #2D8CFF !important; }
  .sl-spinner { width: 20px; height: 20px; border: 2px solid #e2e8f4; border-top-color: #2D8CFF; border-radius: 50%; animation: sl-spin 0.7s linear infinite; }
  @keyframes sl-spin  { to { transform: rotate(360deg); } }
  @keyframes sl-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes sl-alarm-glow {
    0%, 100% { filter: saturate(1); }
    50% { filter: saturate(1.28); }
  }
  thead th:last-child { border-right: none !important; }
  tbody td:last-child { border-right: none !important; }
  @media (max-width: 1180px) {
    .sl-hero { grid-template-columns: 1fr 1fr !important; }
    .sl-hero > div:first-child { grid-column: 1 / -1; }
  }
  @media (max-width: 760px) {
    .sl-hero { grid-template-columns: 1fr !important; }
    .sl-detail-grid { grid-template-columns: 1fr 1fr !important; }
    .sl-detail-content-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 520px) {
    .sl-hero { gap: 10px !important; }
    .sl-calendar-day { min-height: 36px !important; padding: 4px !important; }
  }
`;

export default ShiftLogsPanel;
