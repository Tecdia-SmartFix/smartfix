import React from 'react';
import { Settings2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const MachineCard = ({ 
  machine, 
  isDefault, 
  onDelete, 
  confirmingDelete,
  onClick
}) => {
  const Icon = machine.icon ? null : Settings2; // if we want an icon
  
  return (
    <motion.div 
      layout
      onClick={onClick}
      className="relative flex flex-col w-full h-[400px] rounded-3xl overflow-hidden bg-[#1E1E1E] group hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
    >
      {/* ── Top Image Area ── */}
      <div className="w-full h-[180px] bg-gradient-to-br from-slate-300 to-slate-400 relative overflow-hidden">
        {machine.customIconUrl ? (
          <img src={machine.customIconUrl} alt={machine.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 opacity-20">
            {Icon && <Icon size={80} />}
          </div>
        )}
        
        {/* Delete Button (only in admin) */}
        {onDelete && !isDefault && (
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(machine.id, machine.name); }}
              className={`p-2 rounded-full transition-colors ${
                confirmingDelete 
                  ? 'bg-red-500 text-white' 
                  : 'bg-black/20 text-white hover:bg-red-500'
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Text Area ── */}
      <div className="p-6 flex flex-col flex-grow relative">
        <div className="text-[11px] font-bold text-white mb-2">
          ID: {machine.id}
        </div>
        
        <h3 className="text-white font-bold text-[19px] leading-tight mb-4 line-clamp-3">
          {machine.name}
        </h3>
        
        <div className="mt-auto pt-4 flex flex-col">
          <span className="text-[11px] font-bold text-white mb-0.5">
            {machine.category || 'General Equipment'}
          </span>
          <span className="text-[10px] text-white/50 leading-snug line-clamp-2">
            {machine.description || 'No description provided.'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MachineCard;
