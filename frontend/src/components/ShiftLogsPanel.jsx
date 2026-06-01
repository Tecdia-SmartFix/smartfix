import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchApi } from '../api/apiClient';
import { useMachines } from '../context/MachineContext';

const SEVERITY_STYLES = {
  1: { label: '1 — Info',     color: '#2e4e40', bg: '#e5eee4', border: '#c0e1d2' },
  2: { label: '2 — Minor',    color: '#6d5335', bg: '#fbfaf5', border: '#e5eee4' },
  3: { label: '3 — Degraded', color: '#844d4d', bg: '#f6f4e8', border: '#dc9b9b' },
  4: { label: '4 — Impact',   color: '#ffffff', bg: '#dc9b9b', border: '#dc9b9b' },
  5: { label: '5 — Safety',   color: '#4a1515', bg: '#f4d2d2', border: '#dc9b9b' },
};

const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const hhmm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.toDateString() === now.toDateString()) return `Today ${hhmm}`;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${hhmm}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${hhmm}`;
};

const ShiftLogsPanel = () => {
  const { machines } = useMachines();

  const [logs, setLogs]                   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [phaseFilter, setPhaseFilter]     = useState('');
  const [search, setSearch]               = useState('');
  const [selectedId, setSelectedId]       = useState(null);
  const [voidingId, setVoidingId]         = useState(null);
  const [voidReason, setVoidReason]       = useState('');
  const [syncing, setSyncing]             = useState(false);

  const machineNameFor = useCallback((id) => {
    const m = machines.find(x => x.id === id);
    return m?.display_name || m?.name || id.replaceAll('_', ' ');
  }, [machines]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (machineFilter) qs.set('machine_id', machineFilter);
      if (phaseFilter)   qs.set('phase', phaseFilter);
      qs.set('limit', '200');
      const data = await fetchApi(`/admin/shifts?${qs.toString()}`);
      setLogs(data.logs || []);
    } catch (e) {
      setError(e.message || 'Failed to load shift logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [machineFilter, phaseFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    await load();
    setSyncing(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const n = search.trim().toLowerCase();
    return logs.filter(l =>
      (l.worker_label || '').toLowerCase().includes(n) ||
      (l.notes || '').toLowerCase().includes(n) ||
      machineNameFor(l.machine_id).toLowerCase().includes(n) ||
      (l.anomalies || []).some(a => (a.title || '').toLowerCase().includes(n))
    );
  }, [logs, search, machineNameFor]);

  const selectedLog = selectedId ? filtered.find(l => l.id === selectedId) || null : null;

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      thisWeek:  logs.filter(l => new Date(l.created_at).getTime() >= weekAgo).length,
      anomalies: logs.reduce((s, l) => s + (l.anomalies?.length || 0), 0),
      highSev:   logs.filter(l => l.severity >= 4).length,
      total:     logs.length,
    };
  }, [logs]);

  const handleAcknowledge = async (id) => {
    try {
      await fetchApi(`/admin/shifts/${id}/acknowledge`, { method: 'POST' });
      load();
    } catch (e) { setError(e.message); }
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

      <div style={s.topbar}>
        <div>
          <div style={s.eyebrow}>Admin Console</div>
          <h1 style={s.pageTitle}>Shift Logs</h1>
          <div style={s.pageSub}>End-of-shift machine condition records · anomalies flagged automatically</div>
        </div>
        <div style={s.statsRow}>
          {[
            { num: stats.thisWeek, lbl: 'This week'  },
            { num: stats.anomalies, lbl: 'Anomalies'  },
            { num: stats.highSev,   lbl: 'Sev ≥ 4'    },
            { num: stats.total,      lbl: 'Total'       },
          ].map((s2, i) => (
            <div key={i} style={s.statBox}>
              <div style={{ ...s.statNum, color: '#2D8CFF' }}>{s2.num}</div>
              <div style={s.statLbl}>{s2.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.controls}>
        <div style={s.leftControls}>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>Machine</div>
            <select value={machineFilter} onChange={e => setMachineFilter(e.target.value)} style={s.select} className="sl-select">
              <option value="">All machines</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.display_name || m.name}</option>)}
            </select>
          </div>
          <div style={s.selectWrap}>
            <div style={s.selectLabel}>Phase</div>
            <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} style={s.select} className="sl-select">
              <option value="">All phases</option>
              <option value="start">Pre-shift</option>
              <option value="end">End of shift</option>
            </select>
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
        <button onClick={handleSync} style={s.syncBtn} className="sl-sync-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ flexShrink: 0, transition: 'transform 0.6s', transform: syncing ? 'rotate(360deg)' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Sync
        </button>
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
                    <th style={s.th}>Time <span style={s.thMono}>(local)</span></th>
                    <th style={s.th}>Phase</th>
                    <th style={s.th}>Machine</th>
                    <th style={s.th}>Worker</th>
                    <th style={s.th}>Severity</th>
                    <th style={s.th}>Anomalies</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => {
                    const isVoid = !!log.void_at;
                    const isOpen = selectedLog?.id === log.id;
                    const aText  = log.anomalies?.length ? log.anomalies.map(a => a.title).join(', ') : '—';

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedId(log.id)}
                        style={{
                          ...s.tr,
                          ...(isOpen ? s.trOpen : {}),
                          ...(isVoid ? s.trVoid : {}),
                        }}
                        className="sl-row"
                      >
                        <td style={s.td}>
                          <span style={{ ...s.monoSm, color: isOpen ? '#2D8CFF' : '#6b7a9e', fontWeight: isOpen ? 500 : 400 }}>
                            {fmtTs(log.created_at)}
                          </span>
                        </td>

                        <td style={s.td}>
                          {isVoid
                            ? <span style={s.badgeFail}>Void</span>
                            : <span style={s.badgeDefault}>{log.phase === 'start' ? 'Pre-shift' : 'End of shift'}</span>
                          }
                        </td>

                        <td style={s.td}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#0f1c3f' }}>
                            {machineNameFor(log.machine_id)}
                          </span>
                        </td>

                        <td style={s.td}>
                          <div style={s.actorWrap}>
                            <div style={s.avatar}>{(log.worker_label || '?').charAt(0).toUpperCase()}</div>
                            <span style={s.actorName}>{log.worker_label || '—'}</span>
                          </div>
                        </td>

                        <td style={s.td}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: '#0f1c3f' }}>
                            {log.severity}
                          </span>
                        </td>

                        <td style={s.td}>
                          <span style={{ ...s.monoSm, color: '#0f1c3f', fontWeight: log.anomalies?.length ? 500 : 400 }}>
                            {aText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={s.tableFooter}>
            <span style={s.footerLeft}>Showing {filtered.length} of {logs.length} {logs.length === 1 ? 'entry' : 'entries'}</span>
            <span style={s.footerRight}>
              <span style={s.liveDot} className="sl-live-dot" />
              Real-time sync active
            </span>
          </div>
        </div>

        {selectedLog && (() => {
          const sev = SEVERITY_STYLES[selectedLog.severity] || SEVERITY_STYLES[1];
          const readings = Object.entries(selectedLog.readings || {});
          const isVoid = !!selectedLog.void_at;

          return (
            <div style={s.detailPanel}>
              <div style={s.detailHeader}>
                <div style={s.detailHeaderLeft}>
                  <span style={{ ...s.sevBadge, color: sev.color, background: sev.bg, borderColor: sev.border, marginBottom: 8, display: 'inline-block' }}>
                    SEV {selectedLog.severity}
                  </span>
                  <div style={s.detailMachine}>{machineNameFor(selectedLog.machine_id)}</div>
                </div>
                {!selectedLog.acknowledged && !isVoid && (
                  <span style={s.unackBadge}>Unacknowledged</span>
                )}
              </div>

              <div style={s.divider} />

              {[
                ['Worker',       selectedLog.worker_label || '—'],
                ['Time',         fmtTs(selectedLog.created_at)],
                ['Phase',        selectedLog.phase === 'start' ? 'Pre-shift' : 'End of shift'],
                ['Workstation',  selectedLog.workstation_ip || '—'],
                ['Acknowledged', selectedLog.acknowledged ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} style={s.metaRow}>
                  <span style={s.metaKey}>{k}</span>
                  <span style={{
                    ...s.metaVal,
                    color: k === 'Workstation' ? '#2D8CFF' : '#2e4e40',
                    fontFamily: k === 'Workstation' || k === 'Time' ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif",
                  }}>{v}</span>
                </div>
              ))}

              {readings.length > 0 && (
                <>
                  <div style={s.sectionLabel}>Readings</div>
                  <div style={s.readingsBlock}>
                    {readings.map(([k, v]) => (
                      <div key={k} style={s.readingRow}>
                        <span style={s.readingKey}>{k}</span>
                        <span style={s.readingVal}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedLog.notes && (
                <>
                  <div style={s.sectionLabel}>Notes</div>
                  <div style={s.notesBlock}>"{selectedLog.notes}"</div>
                </>
              )}

              {selectedLog.anomalies?.length > 0 && (
                <>
                  <div style={{ ...s.sectionLabel, color: '#844d4d' }}>Anomalies</div>
                  <div style={s.anomalyBlock}>
                    {selectedLog.anomalies.map((a, idx) => (
                      <div key={idx} style={s.anomalyItem}>
                        <div style={s.anomalyTitle}>{a.title}</div>
                        {a.detail && <div style={s.anomalyDetail}>{a.detail}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {isVoid && (
                <>
                  <div style={{ ...s.sectionLabel, color: '#6d7c74' }}>Void record</div>
                  <div style={s.voidBlock}>
                    {selectedLog.void_reason || '(no reason given)'}
                    {selectedLog.voided_by && <div style={s.voidBy}>by {selectedLog.voided_by}</div>}
                  </div>
                </>
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
          );
        })()}
      </div>
    </div>
  );
};

const s = {
  root: {
    fontFamily: "'Inter', sans-serif",
    background: '#ffffff', color: '#2e4e40',
    minHeight: '100vh', padding: '28px 24px',
  },

  topbar: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16, marginBottom: 24,
    paddingBottom: 20, borderBottom: '1px solid #e5e7eb',
  },
  eyebrow:   { fontFamily: "'Sora', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#2D8CFF', marginBottom: 4 },
  pageTitle: { fontFamily: "'Sora', sans-serif", fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: '#2e4e40', letterSpacing: '-0.02em', margin: '0 0 4px' },
  pageSub:   { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6d7c74' },
  statsRow:  { display: 'flex', gap: 32 },
  statBox:   { minWidth: 60 },
  statNum:   { fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1 },
  statLbl:   { fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6d7c74', marginTop: 5 },

  controls:     { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  leftControls: { display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  selectWrap:   { display: 'flex', flexDirection: 'column', gap: 6 },
  selectLabel:  { fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74' },
  select: {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
    padding: '6px 24px 6px 0px', border: 'none', borderBottom: '1px solid #e5e7eb',
    background: '#fff', color: '#2e4e40', outline: 'none', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232D8CFF' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right center',
  },
  searchWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  searchInput: {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
    padding: '6px 10px 6px 24px', border: 'none', borderBottom: '1px solid #e5e7eb',
    background: '#fff', color: '#2e4e40', outline: 'none', width: 200,
  },
  syncBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
    padding: '6px 12px', border: '1px solid #2D8CFF', borderRadius: 4,
    background: '#fff', color: '#2D8CFF', cursor: 'pointer', transition: 'all 0.12s',
  },

  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 4,
    background: '#fef2f2', border: '1px solid #dc9b9b',
    color: '#844d4d', fontSize: 12, fontWeight: 600, marginBottom: 14,
  },

  mainLayout: { display: 'flex', alignItems: 'flex-start', gap: 24 },

  card: {
    flex: 1,
    background: '#fff', border: '1px solid #e2e8f4', borderRadius: 16,
    boxShadow: '0 2px 12px rgba(15,28,63,0.06)', overflow: 'hidden',
  },
  loadState:  { padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyState: { padding: '40px 24px', textAlign: 'center' },

  table:    { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' },
  theadRow: { borderBottom: '1px solid #e2e8f4', background: '#ffffff' },
  th: {
    padding: '11px 16px', textAlign: 'left',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: '#0f1c3f',
    fontFamily: "'Sora', sans-serif",
  },
  thMono: { fontFamily: "'DM Mono', monospace", fontSize: 9, textTransform: 'lowercase', letterSpacing: 0 },
  tr:       { borderBottom: '1px solid #e2e8f4', cursor: 'pointer', transition: 'background 0.14s' },
  trOpen: { background: '#e8f3ff', borderLeft: '3px solid #2D8CFF' },
  trVoid: {},
  td:       { padding: '10px 16px', verticalAlign: 'middle' },

  monoSm: { fontFamily: "'DM Mono', monospace", fontSize: 11 },

  badgeDefault: {
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '3px 9px', borderRadius: 6,
    background: '#ffffff', color: '#000000', border: '1px solid #e2e8f4',
    fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
  },
  badgeFail: {
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '3px 9px', borderRadius: 6,
    background: '#ffffff', color: '#000000', border: '1px solid #e2e8f4',
    fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
  },

  actorWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#e8f3ff', border: '1px solid #c9d5ee',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, color: '#2D8CFF', flexShrink: 0,
    fontFamily: "'Sora', sans-serif",
  },
  actorName: { fontSize: 12, fontWeight: 600, color: '#0f1c3f' },

  tableFooter: {
    borderTop: '1px solid #e2e8f4',
    padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  footerLeft:  { fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, color: '#a0acc8', letterSpacing: '0.1em', textTransform: 'uppercase' },
  footerRight: { fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, color: '#2D8CFF', display: 'flex', alignItems: 'center', gap: 5 },
  liveDot:     { width: 6, height: 6, borderRadius: '50%', background: '#2D8CFF', display: 'inline-block' },

  detailPanel: {
    width: 280, flexShrink: 0,
    background: '#fff', padding: '0 8px',
  },
  detailHeader:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  detailHeaderLeft: { display: 'flex', flexDirection: 'column' },
  detailMachine:    { fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: '#2e4e40', lineHeight: 1.2 },
  unackBadge: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
    color: '#2D8CFF', letterSpacing: '0.04em', marginTop: 2,
  },
  divider:  { height: 1, background: '#e5e7eb', margin: '14px 0' },
  metaRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', gap: 8 },
  metaKey:  { fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6d7c74' },
  metaVal:  { fontSize: 12, fontWeight: 500, color: '#2e4e40' },
  sectionLabel: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74',
    margin: '14px 0 6px',
  },
  readingsBlock: { display: 'flex', flexDirection: 'column' },
  readingRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 0', borderBottom: '1px dashed #f2f4f7',
  },
  readingKey:   { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6d7c74' },
  readingVal:   { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: '#2e4e40' },
  notesBlock:   { fontSize: 12, color: '#4e5a52', fontStyle: 'italic', lineHeight: 1.5, padding: '4px 0' },
  anomalyBlock: { padding: '4px 0' },
  anomalyItem:  { marginBottom: 8 },
  anomalyTitle: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#844d4d' },
  anomalyDetail:{ fontSize: 11, color: '#6d5335', fontStyle: 'italic' },
  voidBlock:    { padding: '4px 0' },
  voidBy:       { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6d7c74' },

  sevBadge: {
    display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10, fontWeight: 600, padding: '2px 6px',
    borderRadius: 2, border: '1px solid',
  },

  ackBtn: {
    flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
    padding: '8px 0', border: 'none', borderRadius: 4,
    background: '#2D8CFF', color: '#ffffff', cursor: 'pointer', transition: 'all 0.12s',
  },
  voidBtn: {
    fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
    padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 4,
    background: '#fff', color: '#6d7c74', cursor: 'pointer', transition: 'all 0.12s',
  },
  voidInput: {
    width: '100%', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    padding: '6px 0', border: 'none', borderBottom: '1px solid #dc9b9b',
    background: '#fff', color: '#2e4e40', outline: 'none',
  },
  cancelBtn: {
    flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
    padding: '8px 0', border: '1px solid #e5e7eb', borderRadius: 4,
    background: '#fff', color: '#6d7c74', cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
    padding: '8px 0', border: 'none', borderRadius: 4,
    background: '#dc9b9b', color: '#fff', cursor: 'pointer',
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&family=DM+Mono:wght@400;500&display=swap');
  .sl-row:hover { background: #f8faff !important; }
  .sl-sync-btn:hover { background: #2D8CFF !important; color: #fff !important; }
  .sl-ack-btn:hover:not(:disabled) { background: #1A75E8 !important; }
  .sl-void-btn:hover { border-color: #dc9b9b !important; color: #844d4d !important; }
  .sl-cancel-btn:hover { background: #f2f4f7 !important; }
  .sl-input:focus { border-bottom-color: #2D8CFF !important; }
  .sl-select:focus { border-bottom-color: #2D8CFF !important; }
  .sl-spinner {
    width: 20px; height: 20px;
    border: 2px solid #e2e8f4; border-top-color: #2D8CFF;
    border-radius: 50%; animation: sl-spin 0.7s linear infinite;
  }
  .sl-live-dot { }
  @keyframes sl-spin  { to { transform: rotate(360deg); } }
  @keyframes sl-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
`;

export default ShiftLogsPanel;