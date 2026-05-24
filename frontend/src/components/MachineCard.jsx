import React, { useEffect, useState } from 'react';
import { Settings2, Trash2, ChevronDown, FileCog, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../api/apiClient';
import laserImg from '../assets/laser.png';
import injectionImg from '../assets/injection.jpeg';
import printerImg from '../assets/printer.png';

const MACHINE_IMAGES = {
  INJECTION_MOLDING_MACHINE: injectionImg,
  LASER_CUTTING_MACHINE: laserImg,
  FDM_X300_INDUSTRIAL_3D_PRINTER: printerImg,
};

// Two layouts in one component:
//   • collapsed — the 400px tile shown in the grid
//   • expanded  — same tile grown in place to reveal all machine info plus
//                 a parameter-summary panel and the button that opens the
//                 shift-log parameter editor modal.
//
// Framer Motion's `layout` prop animates the size transition. The grid uses
// auto-rows-min so the expanded card pushes only its own row taller.

const MachineCard = ({
  machine,
  isDefault,
  onDelete,
  confirmingDelete,
  isExpanded,
  onToggleExpand,
  onEditParameters,
}) => {
  const Icon = machine.icon ? null : Settings2;

  // Fetch a one-line preview of the configured parameters whenever the card
  // expands. Lets the admin see "3 readings · 2 visual checks" without
  // opening the editor.
  const [paramPreview, setParamPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded || !machine?.id) return;
    let cancelled = false;
    setPreviewLoading(true);
    fetchApi(`/machines/${machine.id}/parameters`)
      .then(data => {
        if (cancelled) return;
        setParamPreview({
          numericCount: (data.numeric_readings || []).length,
          visualCount:  (data.visual_checks || []).length,
          updatedAt:    data.updated_at,
        });
      })
      .catch(() => !cancelled && setParamPreview(null))
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => { cancelled = true; };
  }, [isExpanded, machine?.id]);

  return (
    <motion.div
      layout
      onClick={onToggleExpand}
      transition={{ layout: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } }}
      className={`theme-machine-card group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[#111] transition-colors duration-200 ${
        isExpanded
          ? 'border-[#70dceb]/40 shadow-2xl shadow-[#2b8cff]/20'
          : 'border-white/10 hover:-translate-y-1'
      }`}
      style={{ minHeight: isExpanded ? 'auto' : 400 }}
    >
      {/* ── Top image area (shared between layouts) ── */}
      <motion.div
        layout
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#2b8cff]/20 to-[#10b9d2]/10 ${
          isExpanded ? 'h-[140px]' : 'h-[180px]'
        }`}
      >
        {machine.customIconUrl || MACHINE_IMAGES[machine.id] ? (
          <img src={machine.customIconUrl || MACHINE_IMAGES[machine.id]} alt={machine.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white opacity-35">
            {Icon && <Icon size={isExpanded ? 60 : 80} />}
          </div>
        )}

        {/* Delete (admin only, non-default machines) */}
        {onDelete && !isDefault && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(machine.id, machine.name); }}
              className={`p-2 rounded-full transition-colors ${
                confirmingDelete ? 'bg-red-500 text-white' : 'bg-black/20 text-white hover:bg-red-500'
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Expand/collapse chevron — visual affordance the card is clickable */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/35 p-1.5 backdrop-blur-sm">
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown size={14} className="text-white/70" />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Body ── */}
      <motion.div layout className="relative flex flex-grow flex-col p-6">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#66d8e9]">
          ID: {machine.id}
        </div>

        <h3 className={`mb-4 text-[21px] font-black leading-tight tracking-normal text-white ${
          isExpanded ? '' : 'line-clamp-3'
        }`}>
          {machine.name}
        </h3>

        {!isExpanded && (
          <div className="mt-auto pt-4 flex flex-col">
            <span className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              {machine.category || 'General Equipment'}
            </span>
            <span className="text-[10px] text-white/50 leading-snug line-clamp-2">
              {machine.description || 'No description provided.'}
            </span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="expanded-body"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22, delay: 0.08 }}
              // Stop click from bubbling to the card (which would collapse it)
              // so admins can interact with text + button freely.
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col"
            >
              {/* ── Metadata block ── */}
              <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Category</p>
                  <p className="text-[13px] font-bold text-white">{machine.category || 'General Equipment'}</p>
                </div>
                {typeof machine.significance === 'number' && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Significance</p>
                    <p className="text-[13px] font-bold text-white">{machine.significance} / 5</p>
                  </div>
                )}
                {machine.uploaded_at && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Uploaded</p>
                    <p className="text-[13px] font-bold text-white">{new Date(machine.uploaded_at).toLocaleDateString()}</p>
                  </div>
                )}
                {machine.uploaded_by && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1">Uploaded by</p>
                    <p className="text-[13px] font-bold text-white truncate">{machine.uploaded_by}</p>
                  </div>
                )}
              </div>

              {machine.description && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1.5">Description</p>
                  <p className="text-[13px] text-white/75 leading-relaxed">{machine.description}</p>
                </div>
              )}

              {/* ── Parameter preview ── */}
              <div className="mt-5 rounded-xl border border-[#70dceb]/20 bg-[#70dceb]/[0.05] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#70dceb] mb-2">Shift log parameters</p>
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-[13px] text-white/50">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                ) : paramPreview ? (
                  paramPreview.numericCount === 0 && paramPreview.visualCount === 0 ? (
                    <p className="text-[13px] text-white/55">No parameters set yet — workers will see an empty form.</p>
                  ) : (
                    <p className="text-[13px] text-white/80">
                      <span className="font-bold text-white">{paramPreview.numericCount}</span> numeric reading{paramPreview.numericCount === 1 ? '' : 's'}
                      <span className="mx-2 text-white/30">·</span>
                      <span className="font-bold text-white">{paramPreview.visualCount}</span> visual check{paramPreview.visualCount === 1 ? '' : 's'}
                    </p>
                  )
                ) : (
                  <p className="text-[13px] text-white/40">Couldn't load parameters.</p>
                )}
              </div>

              {/* ── Action button ── */}
              <button
                onClick={onEditParameters}
                className="mt-5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] px-6 py-3 text-[13px] font-bold text-white shadow-lg shadow-[#2b8cff]/25 transition-all hover:brightness-110"
              >
                <FileCog size={15} />
                {paramPreview && (paramPreview.numericCount || paramPreview.visualCount)
                  ? 'Edit shift log parameters'
                  : 'Add shift log parameters'}
              </button>

              <button
                onClick={onToggleExpand}
                className="mt-3 text-[12px] font-bold text-white/40 transition-colors hover:text-white/80"
              >
                Collapse
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default MachineCard;
