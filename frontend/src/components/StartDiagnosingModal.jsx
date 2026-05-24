import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ArrowLeft, Settings2, Search } from 'lucide-react';
import { EXPERTISE_DOMAINS } from '../context/AuthContext';

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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-tecdia-textDeep/40 backdrop-blur-sm"
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
            className="relative w-full max-w-xl bg-white rounded-2xl border border-tecdia-border shadow-2xl p-7 max-h-[85vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-tecdia-text/40 hover:text-tecdia-textDeep hover:bg-tecdia-background transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase tracking-widest">
              <span className={step === 'domain' ? 'text-tecdia-accent' : 'text-tecdia-text/40'}>1. Area</span>
              <ChevronRight size={12} className="text-tecdia-text/30" />
              <span className={step === 'machine' ? 'text-tecdia-accent' : 'text-tecdia-text/40'}>2. Machine</span>
            </div>

            {step === 'domain' && (
              <>
                <h2 id="start-modal-title" className="text-2xl font-bold text-tecdia-textDeep mb-2">
                  Which area do you work in?
                </h2>
                <p className="text-sm text-tecdia-text/60 leading-relaxed mb-6">
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
                        className={`text-sm py-3 px-4 rounded-xl border font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                          selected
                            ? 'bg-tecdia-accent text-white border-tecdia-accent shadow-sm'
                            : 'bg-white text-tecdia-text/80 border-tecdia-border hover:border-tecdia-accent/60 hover:bg-tecdia-background hover:shadow-sm'
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
                    <h2 id="start-modal-title" className="text-2xl font-bold text-tecdia-textDeep">
                      Pick a machine
                    </h2>
                    <p className="text-sm text-tecdia-text/60 leading-relaxed mt-1">
                      Showing machines in <span className="font-semibold text-tecdia-textDeep">{domain}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onBackToDomain}
                    className="flex items-center gap-1.5 text-xs font-semibold text-tecdia-accent hover:underline shrink-0 mt-1.5"
                  >
                    <ArrowLeft size={13} /> Change area
                  </button>
                </div>

                <div className="relative mb-4 mt-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecdia-text/40" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search machines…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-tecdia-border bg-white focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 outline-none transition"
                  />
                </div>

                <div className="overflow-y-auto -mx-1 px-1 flex-1 min-h-[100px]">
                  {filteredMachines.length === 0 ? (
                    <div className="py-10 text-center text-sm text-tecdia-text/50">
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
                          className="group flex items-center gap-3 p-3 rounded-xl border border-tecdia-border bg-white hover:border-tecdia-accent/60 hover:bg-tecdia-background hover:shadow-sm transition-all text-left cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center text-tecdia-accent shrink-0 overflow-hidden">
                            {m.customIconUrl ? (
                              <img src={m.customIconUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Settings2 size={18} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-tecdia-textDeep truncate">{m.name}</div>
                            {m.description && (
                              <div className="text-xs text-tecdia-text/60 truncate">{m.description}</div>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-tecdia-text/30 group-hover:text-tecdia-accent shrink-0" />
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
