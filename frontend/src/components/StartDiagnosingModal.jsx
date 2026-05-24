import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ArrowLeft, Settings2, Search } from 'lucide-react';
import { EXPERTISE_DOMAINS } from '../context/AuthContext';
import laserImg from '../assets/laser.png';
import injectionImg from '../assets/injection.jpeg';
import printerImg from '../assets/printer.png';

const MACHINE_IMAGES = {
  INJECTION_MOLDING_MACHINE: injectionImg,
  LASER_CUTTING_MACHINE: laserImg,
  FDM_X300_INDUSTRIAL_3D_PRINTER: printerImg,
};

const StartDiagnosingModal = ({
  open,
  onClose,
  step,
  onPickDomain,
  onPickMachine,
  onBackToDomain,
  picking,
  domain,
  machines,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) setSearch('');
  }, [open, step]);

  const filteredMachines = useMemo(() => {
    if (!domain) return [];
    const byDomain = domain === 'All Access'
      ? machines
      : machines.filter((m) => m.category === domain);
    const q = search.trim().toLowerCase();
    if (!q) return byDomain;
    return byDomain.filter((m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  }, [machines, domain, search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="theme-modal-panel relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[#080b0d]/95 p-7 text-white shadow-2xl shadow-black/60"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-5 top-5 rounded-full p-1.5 text-white/42 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em]">
              <span className={step === 'domain' ? 'text-[#70dceb]' : 'text-white/32'}>1. Area</span>
              <ChevronRight size={12} className="text-white/24" />
              <span className={step === 'machine' ? 'text-[#70dceb]' : 'text-white/32'}>2. Machine</span>
            </div>

            {step === 'domain' && (
              <>
                <h2 id="start-modal-title" className="mb-3 text-4xl font-black uppercase leading-[0.95] tracking-normal text-white">
                  Which area do you work in?
                </h2>
                <p className="mb-7 max-w-xl text-sm font-medium leading-7 text-white/62">
                  Pick the area closest to your role. We'll show machines for that area next. Your session lasts 12 hours.
                </p>

                <div className="grid grid-cols-2 gap-2.5 overflow-y-auto">
                  {EXPERTISE_DOMAINS.map((d) => {
                    const selected = domain === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={picking}
                        onClick={() => onPickDomain(d)}
                        className={`cursor-pointer rounded-full border px-4 py-3 text-sm font-bold transition-all disabled:cursor-wait disabled:opacity-50 ${
                          selected
                            ? 'border-transparent bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] text-white shadow-lg shadow-[#2b8cff]/20'
                            : 'border-white/12 bg-white/[0.045] text-white/76 hover:border-[#70dceb]/60 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 'machine' && (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h2 id="start-modal-title" className="text-4xl font-black uppercase leading-[0.95] tracking-normal text-white">
                      Pick a machine
                    </h2>
                    <p className="mt-3 text-sm font-medium leading-7 text-white/62">
                      Showing machines in <span className="font-bold text-white">{domain}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onBackToDomain}
                    className="mt-1.5 flex shrink-0 items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#70dceb] hover:text-white"
                  >
                    <ArrowLeft size={13} /> Change area
                  </button>
                </div>

                <div className="relative mb-4 mt-4">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/36" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search machines…"
                    className="w-full rounded-full border border-white/12 bg-white/[0.055] py-3 pl-11 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/34 focus:border-[#70dceb]/70 focus:ring-2 focus:ring-[#2b8cff]/20"
                  />
                </div>

                <div className="overflow-y-auto -mx-1 px-1 flex-1 min-h-[100px]">
                  {filteredMachines.length === 0 ? (
                    <div className="py-10 text-center text-sm text-white/45">
                      {machines.length === 0
                        ? 'Loading machines…'
                        : `No machines found in ${domain}${search ? ` matching "${search}"` : ''}.`}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredMachines.map((m, i) => (
                        <button
                          key={m.id || m.name || i}
                          type="button"
                          onClick={() => onPickMachine(m)}
                          className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-left transition-all hover:border-[#70dceb]/60 hover:bg-white/[0.08]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#70dceb]/20 bg-gradient-to-br from-[#2b8cff]/18 to-[#10b9d2]/10 text-[#70dceb]">
                            {m.customIconUrl || MACHINE_IMAGES[m.id] ? (
                              <img src={m.customIconUrl || MACHINE_IMAGES[m.id]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Settings2 size={18} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-bold text-white">{m.name}</div>
                            {m.description && (
                              <div className="truncate text-xs text-white/48">{m.description}</div>
                            )}
                          </div>
                          <ChevronRight size={16} className="shrink-0 text-white/28 group-hover:text-[#70dceb]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartDiagnosingModal;
