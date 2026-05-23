import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Download, ChevronRight } from 'lucide-react';

const mockLogs = [
  {
    id: 1,
    time: 'Today - 19:00',
    machine: 'Injection Molding Machine',
    worker: 'A. Worker',
    severity: { level: 3, label: '3 - Degraded', color: 'text-[#ea580c]', bg: 'bg-[#ffedd5]', border: 'border-[#fdba74]' },
    anomalies: ['Unusual noise'],
    details: {
      shiftEnded: 'Today - 19:00 (12h shift)',
      workstation: '192.168.1.10',
      notified: 'Admin email - 19:00:14',
      anomalyDescriptions: [
        { title: 'Unusual noise flagged - expected: false', notes: '"Slight clicking near the clamp near end of shift."' }
      ]
    }
  },
  {
    id: 2,
    time: 'Today - 19:00',
    machine: 'Laser Cutting Machine',
    worker: 'S. Mehra',
    severity: { level: 1, label: '1 - Info', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    anomalies: [],
    details: {
      shiftEnded: 'Today - 19:00 (12h shift)',
      workstation: '192.168.1.11',
      notified: '-',
      anomalyDescriptions: []
    }
  },
  {
    id: 3,
    time: 'Today - 07:00',
    machine: 'Hydraulic Press HP-500',
    worker: 'R. Tan',
    severity: { level: 4, label: '4 - Impact', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    anomalies: ['Hyd. pressure +18%'],
    details: {
      shiftEnded: 'Today - 07:00 (12h shift)',
      workstation: '192.168.1.12',
      notified: 'Admin email - 07:00:10',
      anomalyDescriptions: [
        { title: 'Hydraulic pressure high - expected: 75-80 bar', notes: '"Pressure gauge showed 94 bar consistently at end of shift."' }
      ]
    }
  },
  {
    id: 4,
    time: 'Yest - 19:00',
    machine: 'FDM-X300 3D Printer',
    worker: 'K. Iwasaki',
    severity: { level: 1, label: '1 - Info', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    anomalies: [],
    details: {
      shiftEnded: 'Yesterday - 19:00 (12h shift)',
      workstation: '192.168.1.13',
      notified: '-',
      anomalyDescriptions: []
    }
  },
  {
    id: 5,
    time: 'Yest - 07:00',
    machine: 'RA-6200 Robot Arm',
    worker: 'M. Diaz',
    severity: { level: 2, label: '2 - Minor', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    anomalies: ['Slight vibration'],
    details: {
      shiftEnded: 'Yesterday - 07:00 (12h shift)',
      workstation: '192.168.1.14',
      notified: 'Admin email - 07:00:25',
      anomalyDescriptions: [
        { title: 'Vibration detected - expected: normal', notes: '"Base plate is vibrating slightly during fast moves."' }
      ]
    }
  },
  {
    id: 6,
    time: 'Mon - 19:00',
    machine: 'Injection Molding Machine',
    worker: 'A. Worker',
    severity: { level: 1, label: '1 - Info', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    anomalies: [],
    details: {
      shiftEnded: 'Mon - 19:00 (12h shift)',
      workstation: '192.168.1.10',
      notified: '-',
      anomalyDescriptions: []
    }
  },
  {
    id: 7,
    time: 'Mon - 07:00',
    machine: 'Laser Cutting Machine',
    worker: 'S. Mehra',
    severity: { level: 5, label: '5 - Safety', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
    anomalies: ['Safety lockout fired'],
    details: {
      shiftEnded: 'Mon - 07:00 (12h shift)',
      workstation: '192.168.1.11',
      notified: 'Admin email, SMS - 07:00:05',
      anomalyDescriptions: [
        { title: 'Safety lockout engaged', notes: '"Door interlock failed during shift, engaged safety stop."' }
      ]
    }
  }
];

const ShiftLogsPanel = () => {
  const [selectedLog, setSelectedLog] = useState(mockLogs[0]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full relative">
      <div className="mb-6">
        <h2 className="text-[28px] font-bold text-tecdia-textDeep leading-tight mb-2">Shift logs</h2>
        <p className="text-[14px] text-tecdia-text/60">End-of-shift machine condition logs. Anomalies are flagged and emailed in real time.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#0f172a] leading-none mb-2">47</p>
          <p className="text-[12px] font-medium text-gray-500">Logs this week</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#f97316] leading-none mb-2">12</p>
          <p className="text-[12px] font-medium text-gray-500">Anomalies detected</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#ef4444] leading-none mb-2">3</p>
          <p className="text-[12px] font-medium text-gray-500">Severity ≥ 4</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-[32px] font-bold text-[#10b981] leading-none mb-2">92%</p>
          <p className="text-[12px] font-medium text-gray-500">Shift completion rate</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-end gap-3 mb-6">
        <div className="w-48">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Machine</label>
          <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none">
            <option>All machines</option>
          </select>
        </div>
        <div className="w-32">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Severity</label>
          <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none">
            <option>≥ 3</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Range</label>
          <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none">
            <option>Last 7 days</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Worker</label>
          <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none">
            <option>All workers</option>
          </select>
        </div>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search workers, notes..." className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[13px] font-semibold text-gray-700 outline-none placeholder:font-normal" />
        </div>
        <button className="bg-[#0f172a] text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#1e293b] transition-colors ml-4 whitespace-nowrap">
          Export CSV
        </button>
      </div>

      {/* Main Layout: Table and Details Panel */}
      <div className="flex items-start gap-6">
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Machine</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Worker</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Anomalies</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map(log => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className={`cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${selectedLog?.id === log.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">{log.time}</td>
                  <td className="px-6 py-4 text-[13px] font-bold text-tecdia-textDeep">{log.machine}</td>
                  <td className="px-6 py-4 text-[13px] font-semibold text-gray-600">{log.worker}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${log.severity.bg} ${log.severity.border} ${log.severity.color}`}>
                      {log.severity.label}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-[13px] font-bold ${log.anomalies.length > 0 ? log.severity.color : 'text-gray-400 font-medium'}`}>
                    {log.anomalies.length > 0 ? log.anomalies.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-[12px] font-medium text-gray-400">
            Showing 7 of 47 - prev / next
          </div>
        </div>

        {/* Selected Log Details Panel */}
        {selectedLog && (
          <div className="w-[360px] bg-[#fdfaf5] border border-orange-100 rounded-2xl p-6 shadow-sm flex-shrink-0">
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-lg text-[11px] font-bold text-white uppercase tracking-widest mb-3 ${selectedLog.severity.level >= 3 ? 'bg-[#ea580c]' : 'bg-emerald-600'}`}>
                SEV {selectedLog.severity.level}
              </span>
              <h3 className="text-xl font-bold text-[#7c2d12] leading-tight">{selectedLog.machine}</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Worker</p>
                <p className="text-[13px] font-bold text-[#1e293b]">{selectedLog.worker}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift ended</p>
                <p className="text-[13px] font-bold text-[#1e293b]">{selectedLog.details.shiftEnded}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Workstation</p>
                <p className="text-[13px] font-bold text-[#0284c7]">{selectedLog.details.workstation}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Notified</p>
                <p className="text-[13px] font-bold text-[#1e293b]">{selectedLog.details.notified}</p>
              </div>
            </div>

            {selectedLog.details.anomalyDescriptions.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-bold text-[#ea580c] uppercase tracking-widest mb-2">Anomalies</p>
                <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-4 space-y-3">
                  {selectedLog.details.anomalyDescriptions.map((anom, idx) => (
                    <div key={idx}>
                      <p className="text-[12px] font-bold text-[#9a3412] mb-1">• {anom.title}</p>
                      <p className="text-[12px] text-[#9a3412]/80 italic">{anom.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-8">
              <button className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold text-[13px] py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                Acknowledge
              </button>
              <button className="flex-1 bg-[#0f172a] text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-[#1e293b] transition-colors">
                Notify next shift
              </button>
            </div>
            
            <button className="w-full text-center mt-4 text-[12px] font-bold text-[#0284c7] hover:underline">
              Open chat thread →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ShiftLogsPanel;
