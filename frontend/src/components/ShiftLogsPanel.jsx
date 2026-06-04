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

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// ── All available columns ─────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'time',      label: 'Time'      },
  { key: 'phase',     label: 'Phase'     },
  { key: 'machine',   label: 'Machine'   },
  { key: 'worker',    label: 'Worker'    },
  { key: 'severity',  label: 'Severity'  },
  { key: 'anomalies', label: 'Anomalies' },
];

const DEFAULT_VISIBLE = ['time', 'phase', 'machine', 'worker', 'severity', 'anomalies'];

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
  const [phaseFilter, setPhaseFilter]     = useState('');
  const [search, setSearch]               = useState('');
  const [selectedId, setSelectedId]       = useState(null);
  const [voidingId, setVoidingId]         = useState(null);
  const [voidReason, setVoidReason]       = useState('');
  const [syncing, setSyncing]             = useState(false);

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

  const handleSync = async () => { setSyncing(true); await load(); setSyncing(false); };

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

      <div style={s.headerSection}>
        <h1 style={s.pageTitle}>Shift Logs</h1>
      </div>

      <div style={s.statsContainerBox}>
        <div style={s.pageSubInsideBox}>Track machine conditions and automatically detect issues</div>
        <div style={s.statsRowInner}>
          {[
            { num: stats.thisWeek,  lbl: 'Logs this week:'  },
            { num: stats.anomalies, lbl: 'Issues found:'    },
            { num: stats.highSev,   lbl: 'Critical alerts:' },
            { num: stats.total,     lbl: 'Total logs:'      },
          ].map((s2, i, arr) => (
            <React.Fragment key={i}>
              <div style={s.statItem}>
                <span style={s.statLbl}>{s2.lbl}</span>
                <span style={{ ...s.statNum, color: '#1A53A1' }}>{s2.num}</span>
              </div>
              {i < arr.length - 1 && <span style={s.statSeparator}>|</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

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
                    {colVisible('time')      && <th style={s.th}>Time</th>}
                    {colVisible('phase')     && <th style={s.th}>Phase</th>}
                    {colVisible('machine')   && <th style={s.th}>Machine</th>}
                    {colVisible('worker')    && <th style={s.th}>Worker</th>}
                    {colVisible('severity')  && <th style={s.th}>Severity</th>}
                    {colVisible('anomalies') && <th style={s.th}>Anomalies</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, rowIdx) => {
                    const isVoid = !!log.void_at;
                    const isOpen = selectedLog?.id === log.id;
                    const aText  = log.anomalies?.length ? log.anomalies.map(a => a.title).join(', ') : '—';
                    const isEven = rowIdx % 2 === 0;

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
                        {colVisible('time') && (
                          <td style={s.td}>
                            <span style={{ ...s.cellText, color: isOpen ? '#2D8CFF' : '#0f1c3f', fontWeight: isOpen ? 600 : 400 }}>
                              {fmtTs(log.created_at)}
                            </span>
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
                        {colVisible('severity') && (
                          <td style={s.td}>
                            <span style={{ ...s.cellText, fontWeight: 600, color: '#0f1c3f' }}>
                              {log.severity}
                            </span>
                          </td>
                        )}
                        {colVisible('anomalies') && (
                          <td style={s.td}>
                            <span style={{ ...s.cellText, color: log.anomalies?.length ? '#844d4d' : '#6b7a9e' }}>
                              {aText}
                            </span>
                          </td>
                        )}
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
  root: { fontFamily: "'Inter', sans-serif", background: '#ffffff', color: '#2e4e40', minHeight: '100vh', padding: '0 24px 28px' },
  headerSection: { marginBottom: 16 },
  statsContainerBox: { background: '#f4f8fc', border: '1px solid #9fb3d0', padding: '8px 12px', marginBottom: 20 },
  pageSubInsideBox: { fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#2b446b', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #c9d8ee' },
  statsRowInner: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  statItem: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 },
  statSeparator: { color: '#9fb3d0', fontSize: 12 },
  pageTitle: { fontFamily: "'Sora', sans-serif", fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: '#000000', letterSpacing: '-0.02em', margin: '0' },
  statNum: { fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 600, lineHeight: 1 },
  statLbl: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#1a1d21' },
  controls: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  leftControls: { display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' },
  selectWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  selectLabel: { fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74' },
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
  detailPanel: { width: 280, flexShrink: 0, background: '#fff', padding: '0 8px' },
  detailHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  detailHeaderLeft: { display: 'flex', flexDirection: 'column' },
  detailMachine: { fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 600, color: '#2e4e40', lineHeight: 1.2 },
  unackBadge: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, color: '#2D8CFF', letterSpacing: '0.04em', marginTop: 2 },
  divider: { height: 1, background: '#e5e7eb', margin: '14px 0' },
  metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', gap: 8 },
  metaKey: { fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6d7c74' },
  metaVal: { fontSize: 12, fontWeight: 500, color: '#2e4e40' },
  sectionLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6d7c74', margin: '14px 0 6px' },
  readingsBlock: { display: 'flex', flexDirection: 'column' },
  readingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed #f2f4f7' },
  readingKey: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6d7c74' },
  readingVal: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: '#2e4e40' },
  notesBlock: { fontSize: 12, color: '#4e5a52', fontStyle: 'italic', lineHeight: 1.5, padding: '4px 0' },
  anomalyBlock: { padding: '4px 0' },
  anomalyItem: { marginBottom: 8 },
  anomalyTitle: { fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#844d4d' },
  anomalyDetail: { fontSize: 11, color: '#6d5335', fontStyle: 'italic' },
  voidBlock: { padding: '4px 0' },
  voidBy: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6d7c74' },
  sevBadge: { display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 2, border: '1px solid' },
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
  .sl-input:focus  { border-bottom-color: #2D8CFF !important; }
  .sl-select:focus { border-bottom-color: #2D8CFF !important; }
  .sl-spinner { width: 20px; height: 20px; border: 2px solid #e2e8f4; border-top-color: #2D8CFF; border-radius: 50%; animation: sl-spin 0.7s linear infinite; }
  @keyframes sl-spin  { to { transform: rotate(360deg); } }
  @keyframes sl-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  thead th:last-child { border-right: none !important; }
  tbody td:last-child { border-right: none !important; }
`;

export default ShiftLogsPanel;
