import React from 'react';
import { Plus, Search, MessageSquare, X, Trash2 } from 'lucide-react';

const Sidebar = ({
  currentChatId,
  chats = [],
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose
}) => {

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 w-[280px] h-screen flex flex-col border-r border-[#89CFF3] transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: '#A0E9FF' }}
      >
        {/* Gradient top accent bar */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #00A9FF, #89CFF3)' }} />

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-[-44px] p-2 bg-[#A0E9FF] border border-[#89CFF3] rounded-r-lg md:hidden text-[#1a1a2e]/50"
        >
          <X size={20} />
        </button>

        {/* ── New Chat — flex-shrink-0 keeps it always visible ── */}
        <div className="flex-shrink-0 p-4 border-b border-[#89CFF3]/60">
          <button
            onClick={() => { onNewChat(); if (window.innerWidth < 768) onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-[#89CFF3] text-[#1a1a2e]/70 text-sm font-semibold hover:bg-white/60 hover:text-[#1a1a2e] hover:border-[#00A9FF]/40 transition-all group/btn active:scale-95 bg-white/30"
          >
            <div className="w-5 h-5 rounded-lg bg-[#00A9FF] flex items-center justify-center group-hover/btn:scale-110 transition-transform flex-shrink-0">
              <Plus size={13} className="text-white" />
            </div>
            New chat
          </button>
        </div>

        {/* ── Search — flex-shrink-0 keeps it always visible ── */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="relative group/search">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a2e]/30 group-focus-within/search:text-[#00A9FF] transition-colors" />
            <input
              type="text"
              placeholder="Search chats"
              className="w-full bg-white/50 border border-[#89CFF3] rounded-xl py-2 pl-9 pr-4 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#00A9FF] focus:ring-1 focus:ring-[#00A9FF]/20 focus:bg-white/80 transition-all"
            />
          </div>
        </div>

        {/* ── Chat History — only this part scrolls ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar min-h-0">
          <div className="text-[10px] font-black text-[#1a1a2e]/40 uppercase tracking-[0.2em] mb-3 px-2 pt-2">Recents</div>
          {chats.length === 0 ? (
            <p className="text-xs text-[#1a1a2e]/30 px-2 py-6 text-center italic">No chats yet</p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 rounded-xl transition-all border-2 ${currentChatId === chat.id
                    ? 'bg-white border-[#00A9FF]/30 text-[#1a1a2e] shadow-md border-l-[3px] border-l-[#00A9FF]'
                    : 'border-transparent text-[#1a1a2e]/60 hover:bg-white/50 hover:border-[#89CFF3] hover:text-[#1a1a2e]'
                  }`}
              >
                <button
                  onClick={() => { onSelectChat(chat.id); if (window.innerWidth < 768) onClose(); }}
                  className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm text-left truncate"
                >
                  <MessageSquare size={14} className={currentChatId === chat.id ? 'text-[#00A9FF]' : 'text-[#1a1a2e]/30'} />
                  <span className="truncate font-medium">{chat.title}</span>
                </button>

                <button
                  onClick={() => onDeleteChat(chat.id)}
                  className="px-2 py-2 text-transparent group-hover:text-[#1a1a2e]/20 hover:!text-red-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
