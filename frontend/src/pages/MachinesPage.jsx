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
import { PageWrapper, PublicHero, ContentShell } from '../components/TecdiaPage';
import laserImg from '../assets/laser.png';
import injectionImg from '../assets/injection.jpeg';
import printerImg from '../assets/printer.png';

const MACHINE_IMAGES = {
  INJECTION_MOLDING_MACHINE: injectionImg,
  LASER_CUTTING_MACHINE: laserImg,
  FDM_X300_INDUSTRIAL_3D_PRINTER: printerImg,
};


const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

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
      <div className="min-h-screen relative overflow-hidden">
        <PublicHero
          eyebrow={`${machines.length} machines available`}
          title="Machine"
          accent="Selection"
          description="Choose a production asset and start a machine-specific diagnostic session with manual-backed context."
        />

        <ContentShell className="pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto mb-10 w-full max-w-2xl"
        >
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2b8cff]/60 group-focus-within:text-[#2b8cff] transition-colors duration-300 pointer-events-none" />
            <input
              id="machine-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search machines by name, type, or category..."
              className="w-full rounded-2xl border border-black/10 bg-white py-4 pl-11 pr-10 text-sm font-medium text-[#111111] shadow-[0_18px_60px_rgba(0,0,0,0.08)] outline-none transition-all duration-300 placeholder:text-[#111111]/40 focus:border-[#2b8cff]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#111111]/40 hover:text-[#111111] hover:bg-[#E5E7EB]/20 transition-all duration-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-[#111111]/50 mt-2 ml-1 font-medium">
              {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} found
            </p>
          )}
        </motion.div>

        {/* ── Machine Grid ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="relative z-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          style={{ gridAutoRows: '1fr' }}
        >
          {filteredMachines.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-white border-2 border-[#E5E7EB] shadow-sm">
                <Search size={24} className="text-[#111111]/30" />
              </div>
              <p className="text-[#111111]/50 text-sm font-medium">No machines match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#2b8cff] hover:text-[#0077cc] transition-colors font-bold"
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
                  className="group relative flex h-full min-h-[260px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#2b8cff]/60 hover:shadow-xl hover:shadow-[#2b8cff]/10"
                >
                  {/* Bottom accent line on hover */}
                  <div className="absolute bottom-0 left-0 h-[3px] w-full origin-left scale-x-0 rounded-b-2xl bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] transition-transform duration-300 group-hover:scale-x-100" />

                  {/* Icon row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2b8cff]/20 bg-gradient-to-br from-[#2b8cff]/16 to-[#10b9d2]/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                      {machine.customIconUrl || MACHINE_IMAGES[machine.id] ? (
                        <img src={machine.customIconUrl || MACHINE_IMAGES[machine.id]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon size={22} className="text-[#2b8cff]" />
                      )}
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all duration-200 mt-1 text-[#2b8cff] group-hover:translate-x-0.5" />
                  </div>

                  {/* Title */}
                  <h3 className="mb-2 text-xl font-black leading-tight tracking-normal text-[#111111]">{machine.name}</h3>

                  {/* Description — flex-1 makes this grow so badge is always at bottom */}
                  <p className="min-h-[40px] flex-1 text-sm leading-7 text-[#111111]/60">
                    {machine.description || 'AI-powered diagnostics for this machine type.'}
                  </p>

                  {/* Category badge — pinned to bottom via mt-4 after flex-1 description */}
                  <div className="mt-4">
                    {machine.category ? (
                      <span className="inline-block self-start text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#2b8cff]/10 text-[#2b8cff] border border-[#2b8cff]/20">
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
        </ContentShell>
      </div>
    </PageWrapper>
  );
};

export default MachinesPage;
