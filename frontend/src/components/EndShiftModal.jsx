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
            className="absolute inset-0 bg-tecdia-textDeep/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-[640px] shadow-2xl p-8 z-10 bg-white rounded-3xl"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-tecdia-text/40 hover:text-tecdia-text transition-colors"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            
            <div className="mb-6">
              <span className="text-[11px] font-bold tracking-widest text-tecdia-accent uppercase mb-2 block">
                End of Shift
              </span>
              <h2 className="text-[28px] font-bold text-tecdia-textDeep leading-tight mb-2">
                Log your machines before signing off
              </h2>
              <p className="text-sm text-tecdia-text/60">
                Shift ended at 19:00 · Workstation 192.168.1.10 · Hi, A. Worker
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="bg-[#f0f7fb] rounded-xl px-5 py-4 mb-6">
                <p className="text-sm text-tecdia-textDeep">
                  <span className="font-semibold">Machine 1 of 1</span> — Injection Molding Machine
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-tecdia-textDeep mb-1">Readings</h3>
                <p className="text-[13px] text-tecdia-text/50 mb-4">
                  Take a glance at the machine. Out-of-range values trigger an alert.
                </p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Hydraulic pressure (bar)
                    </label>
                    <input 
                      type="text"
                      name="pressure"
                      value={formData.pressure}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">expected 75–80</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Barrel temperature (°C)
                    </label>
                    <input 
                      type="text"
                      name="temperature"
                      value={formData.temperature}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">expected 220–240</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Cycle count (last hour)
                    </label>
                    <input 
                      type="text"
                      name="cycleCount"
                      value={formData.cycleCount}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">typical 130–180</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Oil level
                    </label>
                    <input 
                      type="text"
                      name="oilLevel"
                      value={formData.oilLevel}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">expected OK / Low / Refilled</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-tecdia-textDeep mb-3">Visual checks</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.leaksObserved ? 'bg-tecdia-accent border-tecdia-accent' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.leaksObserved && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[14px] text-tecdia-textDeep">Leaks observed</span>
                    <input type="checkbox" name="leaksObserved" checked={formData.leaksObserved} onChange={handleChange} className="hidden" />
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.unusualNoise ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.unusualNoise && <AlertCircle size={14} className="text-white" strokeWidth={2.5} />}
                    </div>
                    <span className="text-[14px] text-tecdia-textDeep">Unusual noise</span>
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
                    <span className="text-[14px] text-tecdia-textDeep">Vibration normal</span>
                    <input type="checkbox" name="vibrationNormal" checked={formData.vibrationNormal} onChange={handleChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-tecdia-textDeep mb-2">Anything else?</h3>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-4 py-3 text-[14px] text-tecdia-textDeep h-20 resize-none focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all custom-scrollbar"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="text-[13px] font-medium text-tecdia-text/50 hover:text-tecdia-text transition-colors"
                >
                  Skip — nothing notable
                </button>
                <button 
                  type="submit" 
                  className="bg-tecdia-accent hover:bg-[#0099e6] text-white font-bold rounded-xl px-6 py-2.5 text-[14px] transition-all flex items-center gap-2 shadow-lg shadow-tecdia-accent/30"
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
