import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';

const EndShiftModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    pressure: '78',
    temperature: '232',
    cycleCount: '146',
    oilLevel: 'OK',
    leaksObserved: false,
    unusualNoise: true,
    vibrationNormal: true,
    notes: 'Slight clicking near the clamp near end of shift, nothing on display.'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate submission
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="theme-modal-panel relative z-10 max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-[28px] border border-white/12 bg-[#080b0d]/95 p-7 text-white shadow-2xl shadow-black/60 sm:p-8"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 text-white/42 transition-colors hover:text-white"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            
            <div className="mb-6">
              <span className="mb-3 block text-[11px] font-black uppercase tracking-[0.24em] text-[#70dceb]">
                End of Shift
              </span>
              <h2 className="mb-3 text-[clamp(2rem,5vw,3.25rem)] font-black uppercase leading-[0.95] tracking-normal text-white">
                Log your machines before signing off
              </h2>
              <p className="text-sm font-medium text-white/58">
                Shift ended at 19:00 · Workstation 192.168.1.10 · Hi, A. Worker
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6 rounded-2xl border border-[#70dceb]/18 bg-white/[0.055] px-5 py-4">
                <p className="text-sm text-white/82">
                  <span className="font-semibold">Machine 1 of 1</span> — Injection Molding Machine
                </p>
              </div>

              <div className="mb-6">
                <h3 className="mb-1 text-sm font-black uppercase tracking-[0.18em] text-white">Readings</h3>
                <p className="mb-4 text-[13px] font-medium text-white/48">
                  Take a glance at the machine. Out-of-range values trigger an alert.
                </p>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-white/84">
                      Hydraulic pressure (bar)
                    </label>
                    <input 
                      type="text"
                      name="pressure"
                      value={formData.pressure}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.055] px-4 py-2.5 text-[15px] font-semibold text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                    />
                    <p className="mt-1.5 text-[12px] text-white/36">expected 75–80</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-white/84">
                      Barrel temperature (°C)
                    </label>
                    <input 
                      type="text"
                      name="temperature"
                      value={formData.temperature}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.055] px-4 py-2.5 text-[15px] font-semibold text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                    />
                    <p className="mt-1.5 text-[12px] text-white/36">expected 220–240</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-white/84">
                      Cycle count (last hour)
                    </label>
                    <input 
                      type="text"
                      name="cycleCount"
                      value={formData.cycleCount}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.055] px-4 py-2.5 text-[15px] font-semibold text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                    />
                    <p className="mt-1.5 text-[12px] text-white/36">typical 130–180</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-white/84">
                      Oil level
                    </label>
                    <input 
                      type="text"
                      name="oilLevel"
                      value={formData.oilLevel}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.055] px-4 py-2.5 text-[15px] font-semibold text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                    />
                    <p className="mt-1.5 text-[12px] text-white/36">expected OK / Low / Refilled</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-white">Visual checks</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.leaksObserved ? 'bg-[#2b8cff] border-[#2b8cff]' : 'border-white/24 group-hover:border-[#70dceb]'}`}>
                      {formData.leaksObserved && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[14px] text-white/82">Leaks observed</span>
                    <input type="checkbox" name="leaksObserved" checked={formData.leaksObserved} onChange={handleChange} className="hidden" />
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.unusualNoise ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.unusualNoise && <AlertCircle size={14} className="text-white" strokeWidth={2.5} />}
                    </div>
                    <span className="text-[14px] text-white/82">Unusual noise</span>
                    {formData.unusualNoise && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-bold text-[#ff6b00] border border-[#ff6b00] bg-orange-50">
                        Will flag
                      </span>
                    )}
                    <input type="checkbox" name="unusualNoise" checked={formData.unusualNoise} onChange={handleChange} className="hidden" />
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.vibrationNormal ? 'bg-[#10b981] border-[#10b981]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.vibrationNormal && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[14px] text-white/82">Vibration normal</span>
                    <input type="checkbox" name="vibrationNormal" checked={formData.vibrationNormal} onChange={handleChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-white">Anything else?</h3>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="custom-scrollbar h-20 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-[14px] text-white outline-none transition-all focus:border-[#70dceb] focus:ring-1 focus:ring-[#2b8cff]/40"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="text-[13px] font-bold text-white/46 transition-colors hover:text-white"
                >
                  Skip — nothing notable
                </button>
                <button 
                  type="submit" 
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] px-7 py-3 text-[14px] font-bold text-white shadow-lg shadow-[#2b8cff]/25 transition-all hover:brightness-110"
                >
                  Submit log <span className="text-lg leading-none">→</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EndShiftModal;
