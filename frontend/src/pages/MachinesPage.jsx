import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings2, Printer, Scissors, Bot, Wrench, Gauge, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, ChevronRight, Search, X
} from 'lucide-react';
import { useMachines } from '../context/MachineContext';
import { useAuth } from '../context/AuthContext';
import { useWorkstation } from '../hooks/useWorkstation';
import { ShieldAlert } from 'lucide-react';


const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const MachinesPage = () => {
  const { machines } = useMachines();
  const { user } = useAuth();
  const ws = useWorkstation();
  const [searchQuery, setSearchQuery] = useState('');

  // Bound workstations don't get a picker — they go straight to their machine's chat.
  if (ws.bound && ws.machine?.id) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(ws.machine.id)}`} replace />;
  }

  const filteredMachines = machines.filter((m) => {
    // 1. Search filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      m.name.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Domain filter (per API contract — AuthContext exposes user.domain)
    if (user.domain === 'All Access') return true;

    // Always show General machines
    if (m.category === 'General') return true;

    // Show machines matching the worker's domain
    return m.category === user.domain;
  });

  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center px-6 pb-20 relative overflow-hidden">

        {/* ── Hero strip with gradient ── */}
        <div
          className="w-full flex flex-col items-center pt-32 pb-16 relative overflow-hidden mb-4"
          style={{ background: 'linear-gradient(160deg, #89CFF3 0%, #CDF5FD 60%, #A0E9FF 100%)' }}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#00A9FF]/10 blur-[80px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 rounded-full bg-[#89CFF3]/40 blur-[60px]" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-center relative z-10"
          >
            <span className="inline-flex items-center gap-2 bg-white/70 border border-[#89CFF3] backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-bold text-[#00A9FF] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A9FF] animate-pulse" />
              {machines.length} machines available
            </span>
            <h1 className="text-6xl md:text-8xl font-bold mb-4">
              <span className="text-[#1a1a2e]">Your </span>
              <span className="text-[#00A9FF]">Machines</span>
            </h1>
            <p className="text-base md:text-lg max-w-md mx-auto text-[#1a1a2e]/70">
              Choose a machine to start AI-powered fault diagnostics
            </p>
          </motion.div>

          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
            <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-8" preserveAspectRatio="none">
              <path d="M0,20 C480,40 960,0 1440,20 L1440,40 L0,40 Z" fill="#CDF5FD" />
            </svg>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl mb-10 relative z-10"
        >
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00A9FF]/60 group-focus-within:text-[#00A9FF] transition-colors duration-300 pointer-events-none" />
            <input
              id="machine-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search machines by name, type, or category..."
              className="w-full pl-11 pr-10 py-4 rounded-2xl text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/40 bg-white border-2 border-[#89CFF3] focus:border-[#00A9FF] outline-none transition-all duration-300 font-medium shadow-sm"
              style={{ boxShadow: '0 2px 12px rgba(0,169,255,0.08)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#1a1a2e]/40 hover:text-[#1a1a2e] hover:bg-[#89CFF3]/20 transition-all duration-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-[#1a1a2e]/50 mt-2 ml-1 font-medium">
              {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} found
            </p>
          )}
        </motion.div>

        {/* ── Machine Grid ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10"
          style={{ gridAutoRows: '1fr' }}
        >
          {filteredMachines.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-white border-2 border-[#89CFF3] shadow-sm">
                <Search size={24} className="text-[#1a1a2e]/30" />
              </div>
              <p className="text-[#1a1a2e]/50 text-sm font-medium">No machines match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#00A9FF] hover:text-[#0077cc] transition-colors font-bold"
              >
                Clear search
              </button>
            </motion.div>
          )}

          {filteredMachines.map((machine, index) => {
            const Icon = ICON_MAP[machine.icon] || Settings2;
            return (
              <motion.div
                key={machine.id || index}
                className="h-full"
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
              >
                <Link
                  to={`/chat?machine=${encodeURIComponent(machine.name)}`}
                  className="group relative h-full flex flex-col rounded-2xl p-6 overflow-hidden cursor-pointer transition-all duration-300 bg-white border-2 border-[#89CFF3] hover:border-[#00A9FF]/60 hover:shadow-xl hover:shadow-[#00A9FF]/10 hover:-translate-y-1"
                >
                  {/* Bottom accent line on hover */}
                  <div className="absolute bottom-0 left-0 h-[3px] w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-[#00A9FF] rounded-b-2xl" />

                  {/* Icon row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md bg-[#00A9FF]/10 border border-[#00A9FF]/20 flex-shrink-0 overflow-hidden">
                      {machine.customIconUrl ? (
                        <img src={machine.customIconUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon size={22} className="text-[#00A9FF]" />
                      )}
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all duration-200 mt-1 text-[#00A9FF] group-hover:translate-x-0.5" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#1a1a2e] mb-2">{machine.name}</h3>

                  {/* Description — flex-1 makes this grow so badge is always at bottom */}
                  <p className="text-sm leading-relaxed text-[#1a1a2e]/60 flex-1 min-h-[40px]">
                    {machine.description || 'AI-powered diagnostics for this machine type.'}
                  </p>

                  {/* Category badge — pinned to bottom via mt-4 after flex-1 description */}
                  <div className="mt-4">
                    {machine.category ? (
                      <span className="inline-block self-start text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#00A9FF]/10 text-[#00A9FF] border border-[#00A9FF]/20">
                        {machine.category}
                      </span>
                    ) : (
                      /* invisible spacer so cards without category still match height */
                      <span className="inline-block h-[26px]" />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default MachinesPage;
