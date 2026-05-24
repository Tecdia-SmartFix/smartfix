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
      className="theme-machine-card group relative flex h-[400px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition-transform duration-300 hover:-translate-y-1"
    >
      {/* ── Top Image Area ── */}
      <div className="relative h-[180px] w-full overflow-hidden bg-gradient-to-br from-[#2b8cff]/20 to-[#10b9d2]/10">
        {machine.customIconUrl ? (
          <img src={machine.customIconUrl} alt={machine.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white opacity-35">
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
      <div className="relative flex flex-grow flex-col p-6">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#66d8e9]">
          ID: {machine.id}
        </div>
        
        <h3 className="mb-4 line-clamp-3 text-[21px] font-black leading-tight tracking-normal text-white">
          {machine.name}
        </h3>
        
        <div className="mt-auto pt-4 flex flex-col">
          <span className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
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
