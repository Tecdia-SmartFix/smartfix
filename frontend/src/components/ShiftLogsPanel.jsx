import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { fetchApi } from '../api/apiClient';
import { useMachines } from '../context/MachineContext';

// Severity → visual treatment. Single source of truth so the table cells, the
// badge in the side panel, and the stat cards stay consistent.
const SEVERITY_STYLES = {
  1: { label: '1 - Info',     color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  2: { label: '2 - Minor',    color: 'text-yellow-700',  bg: 'bg-yellow-50',   border: 'border-yellow-200' },
  3: { label: '3 - Degraded', color: 'text-[#ea580c]',   bg: 'bg-[#ffedd5]',   border: 'border-[#fdba74]' },
  4: { label: '4 - Impact',   color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200' },
  5: { label: '5 - Safety',   color: 'text-red-700',     bg: 'bg-red-100',     border: 'border-red-300' },
};

// Pretty-print an ISO timestamp like "Today 19:00", "Yesterday 07:14",
// "May 18 19:00". Keeps the table scannable without a date library.
const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `Today ${hhmm}`;
  if (isYesterday) return `Yesterday ${hhmm}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${hhmm}`;
};

const ShiftLogsPanel = () => {
  const { machines } = useMachines();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState(''); // '' | 'start' | 'end'
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (machineFilter) params.set('machine_id', machineFilter);
      if (phaseFilter)   params.set('phase', phaseFilter);
      const qs = params.toString() ? `?${params}` : '';
      const data = await fetchApi(`/admin/shifts${qs}`);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [machineFilter, phaseFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Resolve a machine_id → human-friendly display name. Falls back to the
  // id with underscores stripped when the machine isn't in the list yet.
  const machineNameFor = useCallback((id) => {
    const m = machines.find(x => x.id === id);
    return m?.display_name || m?.name || id.replaceAll('_', ' ');
  }, [machines]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const needle = search.trim().toLowerCase();
    return logs.filter(log =>
      (log.worker_label || '').toLowerCase().includes(needle)
      || (log.notes || '').toLowerCase().includes(needle)
      || machineNameFor(log.machine_id).toLowerCase().includes(needle)
      || (log.anomalies || []).some(a => (a.title || '').toLowerCase().includes(needle))
    );
  }, [logs, search, machineNameFor]);

  const selectedLog = filteredLogs.find(l => l.id === selectedId)
    || filteredLogs[0]
    || null;

  // Live stats — computed from whatever the backend returned (subject to the
  // machine filter). "This week" = past 7 days.
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = logs.filter(l => new Date(l.created_at).getTime() >= weekAgo);
    const anomalies = logs.reduce((sum, l) => sum + (l.anomalies?.length || 0), 0);
    const highSev = logs.filter(l => l.severity >= 4).length;
    return {
      thisWeek: recent.length,
      anomalies,
      highSev,
    };
  }, [logs]);

  const handleAcknowledge = async (logId) => {
    try {
      await fetchApi(`/admin/shifts/${logId}/acknowledge`, { method: 'POST' });
      // Refresh from server so the acknowledged flag is authoritative.
      loadLogs();
    } catch (err) {
      setError(err.message);
    }
  };

  // Inline reason input — populated when the admin clicks "Void", cleared
  // after submit/cancel. Storing it as a separate piece of state keeps the
  // side panel render simple (no nested form component needed).
  const [voidingLogId, setVoidingLogId] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const handleVoid = async (logId) => {
    const reason = voidReason.trim();
    if (!reason) return;
    try {
      await fetchApi(`/admin/shifts/${logId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setVoidingLogId(null);
      setVoidReason('');
      loadLogs();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full relative">
      <div className="mb-6">
        <h2 className="text-[28px] font-bold text-tecdia-textDeep leading-tight mb-2">Shift logs</h2>
        <p className="text-[14px] text-tecdia-text/60">End-of-shift machine condition logs. Anomalies are flagged from each machine's admin-defined parameters.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#0f172a] leading-none mb-2">{stats.thisWeek}</p>
          <p className="text-[12px] font-medium text-gray-500">Logs this week</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#f97316] leading-none mb-2">{stats.anomalies}</p>
          <p className="text-[12px] font-medium text-gray-500">Anomalies detected</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#ef4444] leading-none mb-2">{stats.highSev}</p>
          <p className="text-[12px] font-medium text-gray-500">Severity ≥ 4</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#10b981] leading-none mb-2">{logs.length}</p>
          <p className="text-[12px] font-medium text-gray-500">Total logs stored</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-end gap-3 mb-6">
        <div className="w-56">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Machine</label>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none"
          >
            <option value="">All machines</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.display_name || m.name || m.id}</option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phase</label>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none"
          >
            <option value="">All phases</option>
            <option value="start">Pre-shift</option>
            <option value="end">End of shift</option>
          </select>
        </div>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workers, notes, anomalies…"
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[13px] font-semibold text-gray-700 outline-none placeholder:font-normal"
          />
        </div>
        <button
          onClick={loadLogs}
          className="bg-[#0f172a] text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#1e293b] transition-colors ml-4 whitespace-nowrap"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* Main Layout: Table and Details Panel */}
      <div className="flex items-start gap-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phase</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Machine</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Worker</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Anomalies</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <Loader2 size={18} className="inline-block animate-spin mr-2" /> Loading…
                </td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  No shift logs yet. Workers submit them at end of shift from the chat page.
                </td></tr>
              ) : filteredLogs.map(log => {
                const sev = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES[1];
                const anomalyText = log.anomalies?.length
                  ? log.anomalies.map(a => a.title).join(', ')
                  : '—';
                const isVoid = !!log.void_at;
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedId(log.id)}
                    // Voided rows are still listed (audit trail visible) but
                    // visually de-emphasized so they don't compete with live
                    // logs. Hovering still works to inspect them.
                    className={`cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                      isVoid ? 'opacity-50 line-through' : ''
                    } ${selectedLog?.id === log.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                    <td className="px-6 py-4">
                      {isVoid ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 border border-gray-300 text-gray-500"
                          title={log.void_reason || ''}
                        >
                          Void
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          log.phase === 'start'
                            ? 'bg-sky-50 border border-sky-200 text-sky-700'
                            : 'bg-slate-50 border border-slate-200 text-slate-700'
                        }`}>
                          {log.phase === 'start' ? 'Pre-shift' : 'End'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-tecdia-textDeep">{machineNameFor(log.machine_id)}</td>
                    <td className="px-6 py-4 text-[13px] font-semibold text-gray-600">{log.worker_label || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${sev.bg} ${sev.border} ${sev.color}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-[13px] font-bold ${log.anomalies?.length > 0 ? sev.color : 'text-gray-400 font-medium'}`}>
                      {anomalyText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-[12px] font-medium text-gray-400">
            Showing {filteredLogs.length} of {logs.length}
          </div>
        </div>

        {/* Selected Log Details Panel */}
        {selectedLog && (() => {
          const sev = SEVERITY_STYLES[selectedLog.severity] || SEVERITY_STYLES[1];
          const readingEntries = Object.entries(selectedLog.readings || {});
          return (
            <div className="w-[360px] bg-[#fdfaf5] border border-orange-100 rounded-2xl p-6 shadow-sm flex-shrink-0">
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-lg text-[11px] font-bold text-white uppercase tracking-widest mb-3 ${selectedLog.severity >= 3 ? 'bg-[#ea580c]' : 'bg-emerald-600'}`}>
                  SEV {selectedLog.severity}
                </span>
                <h3 className="text-xl font-bold text-[#7c2d12] leading-tight">{machineNameFor(selectedLog.machine_id)}</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Worker</p>
                  <p className="text-[13px] font-bold text-[#1e293b]">{selectedLog.worker_label || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift ended</p>
                  <p className="text-[13px] font-bold text-[#1e293b]">{formatTime(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Workstation</p>
                  <p className="text-[13px] font-bold text-[#0284c7]">{selectedLog.workstation_ip || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Acknowledged</p>
                  <p className="text-[13px] font-bold text-[#1e293b]">{selectedLog.acknowledged ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {readingEntries.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Readings</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1">
                    {readingEntries.map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[12px]">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-bold text-gray-800 font-mono tabular-nums">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.notes && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-[13px] text-gray-700 italic bg-white border border-gray-200 rounded-xl p-3">"{selectedLog.notes}"</p>
                </div>
              )}

              {selectedLog.anomalies?.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-[#ea580c] uppercase tracking-widest mb-2">Anomalies</p>
                  <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-4 space-y-3">
                    {selectedLog.anomalies.map((anom, idx) => (
                      <div key={idx}>
                        <p className="text-[12px] font-bold text-[#9a3412] mb-1">• {anom.title}</p>
                        {anom.detail && <p className="text-[12px] text-[#9a3412]/80 italic">{anom.detail}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.void_at && (
                <div className="mb-5 rounded-xl border border-gray-300 bg-gray-50 p-3 text-[12px]">
                  <p className="font-bold uppercase tracking-wider text-gray-500 mb-1">Voided</p>
                  <p className="text-gray-700">{selectedLog.void_reason || '(no reason given)'}</p>
                  {selectedLog.voided_by && (
                    <p className="mt-1 text-gray-500 text-[11px]">by {selectedLog.voided_by}</p>
                  )}
                </div>
              )}

              {voidingLogId === selectedLog.id ? (
                /* Inline reason capture — shown after the admin clicks Void.
                   Submit POSTs to /admin/shifts/{id}/void with the reason. */
                <div className="mt-8 space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Reason for voiding
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="e.g. submitted by mistake"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-gray-700"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVoidingLogId(null); setVoidReason(''); }}
                      className="flex-1 text-[12px] font-bold uppercase tracking-[0.14em] text-gray-500 hover:text-gray-800 py-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleVoid(selectedLog.id)}
                      disabled={!voidReason.trim()}
                      className="flex-1 rounded-xl bg-[#0a0d11] text-white font-bold text-[12px] py-2 uppercase tracking-[0.14em] transition-all hover:brightness-125 disabled:opacity-40"
                    >
                      Confirm void
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-8">
                  <button
                    onClick={() => handleAcknowledge(selectedLog.id)}
                    disabled={selectedLog.acknowledged || !!selectedLog.void_at}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold text-[13px] py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {selectedLog.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                  {!selectedLog.void_at && (
                    <button
                      onClick={() => { setVoidingLogId(selectedLog.id); setVoidReason(''); }}
                      className="bg-white border border-gray-300 text-gray-500 font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:text-gray-800 transition-colors"
                      title="Mark this log as a mistake — kept for audit, hidden from the handoff banner"
                    >
                      Void
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
};

export default ShiftLogsPanel;
