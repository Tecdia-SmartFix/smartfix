import React, { useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.trim().toLowerCase();
  const filteredChats = q
    ? chats.filter(c => (c.title || '').toLowerCase().includes(q))
    : chats;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 w-[280px] h-full flex flex-col border-r border-white/[0.06] transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        {/* Gradient top accent bar */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #2b8cff, #1e293b)' }} />

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-[-44px] p-2 bg-slate-800/90 border border-white/10 rounded-r-lg md:hidden text-white/50 backdrop-blur-sm"
        >
          <X size={20} />
        </button>

        {/* ── New Chat — flex-shrink-0 keeps it always visible ── */}
        <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
          <button
            onClick={() => { onNewChat(); if (window.innerWidth < 768) onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-white/10 text-white/70 text-sm font-semibold hover:bg-white/[0.06] hover:text-white hover:border-[#2b8cff]/40 transition-all group/btn active:scale-95 bg-white/[0.03]"
          >
            <div className="w-5 h-5 rounded-lg bg-[#2b8cff] flex items-center justify-center group-hover/btn:scale-110 transition-transform flex-shrink-0">
              <Plus size={13} className="text-white" />
            </div>
            New chat
          </button>
        </div>

        {/* ── Search — flex-shrink-0 keeps it always visible ── */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="relative group/search">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 group-focus-within/search:text-[#2b8cff] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#2b8cff] focus:ring-1 focus:ring-[#2b8cff]/20 focus:bg-white/[0.08] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-white/25 hover:text-white/60 transition-colors"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Chat History — only this part scrolls ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 min-h-0">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 px-2 pt-2">Recents</div>
          {chats.length === 0 ? (
            <p className="text-xs text-white/25 px-2 py-6 text-center italic">No chats yet</p>
          ) : filteredChats.length === 0 ? (
            <p className="text-xs text-white/25 px-2 py-6 text-center italic">No chats match "{searchQuery}"</p>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 rounded-xl transition-all border-2 ${currentChatId === chat.id
                    ? 'bg-white/[0.08] border-[#2b8cff]/30 text-white shadow-md border-l-[3px] border-l-[#2b8cff]'
                    : 'border-transparent text-white/50 hover:bg-white/[0.05] hover:border-white/10 hover:text-white/80'
                  }`}
              >
                <button
                  onClick={() => { onSelectChat(chat.id); if (window.innerWidth < 768) onClose(); }}
                  className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm text-left truncate"
                >
                  <MessageSquare size={14} className={currentChatId === chat.id ? 'text-[#2b8cff]' : 'text-white/25'} />
                  <span className="truncate font-medium">{chat.title}</span>
                </button>

                <button
                  onClick={() => onDeleteChat(chat.id)}
                  className="px-2 py-2 text-transparent group-hover:text-white/20 hover:!text-red-400 transition-all"
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

