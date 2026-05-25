import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MessageContent from '../components/MessageContent';
import { useChatHistory } from '../hooks/useChatHistory';
import { useWorkstation } from '../hooks/useWorkstation';
import {
  Bot, Plus, User, Send, Mic, MicOff, Settings2,
  Printer, Scissors, Wrench, Gauge, Cpu, Factory,
  Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, ShieldAlert, ArrowLeft,
  BellRing, BookOpen, AlertTriangle, Square, Search, Trash2,
  MessageSquare, Menu, X, Copy, Check
} from 'lucide-react';
import { useMachines } from '../context/MachineContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';
import EndShiftModal from '../components/EndShiftModal';
import HandoffBanner from '../components/HandoffBanner';
import BrandMark from '../components/BrandMark';

const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

const SEVERITY_COLORS = {
  1: { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  label: 'Informational' },
  2: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Minor' },
  3: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Degraded' },
  4: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    label: 'Production Impact' },
  5: { bg: 'bg-red-100',   border: 'border-red-400',    text: 'text-red-700',    label: 'Safety Risk' },
};

/* ── White Sidebar Component with Draggable Scrollbar ── */
const InlineSidebar = ({
  chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, isOpen, onClose,
}) => {
  const [search, setSearch] = useState('');
  const scrollContainerRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollThumbRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const [thumbHeight, setThumbHeight] = useState(140);
  const [thumbTop, setThumbTop] = useState(0);

  const filtered = (chats || []).filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const updateThumbPosition = useCallback(() => {
    if (!scrollContainerRef.current || !scrollTrackRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const trackHeight = scrollTrackRef.current.clientHeight;

    if (scrollHeight <= clientHeight) {
      setThumbHeight(0);
      return;
    }

    const computedThumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 30);
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = trackHeight - computedThumbHeight;
    const computedThumbTop = (scrollTop / maxScrollTop) * maxThumbTop;

    setThumbHeight(computedThumbHeight);
    setThumbTop(computedThumbTop);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateThumbPosition);
      const observer = new ResizeObserver(updateThumbPosition);
      observer.observe(container);
      return () => {
        container.removeEventListener('scroll', updateThumbPosition);
        observer.disconnect();
      };
    }
  }, [updateThumbPosition, filtered]);

  const dragState = useRef({
    isDragging: false,
    startY: 0,
    startScrollTop: 0,
    thumbHeight: 0
  });

  const handleMouseDown = (e) => {
    e.preventDefault();
    dragState.current.isDragging = true;
    dragState.current.startY = e.clientY;
    dragState.current.startScrollTop = scrollContainerRef.current.scrollTop;
    dragState.current.thumbHeight = thumbHeight;
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.current.isDragging) return;
      if (!scrollContainerRef.current || !scrollTrackRef.current) return;
      
      const deltaY = e.clientY - dragState.current.startY;
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      const trackHeight = scrollTrackRef.current.clientHeight;

      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - dragState.current.thumbHeight;

      if (maxThumbTop <= 0) return;

      const thumbDeltaTop = (deltaY / maxThumbTop) * maxScrollTop;
      scrollContainerRef.current.scrollTop = dragState.current.startScrollTop + thumbDeltaTop;
    };

    const handleMouseUp = () => {
      if (dragState.current.isDragging) {
        dragState.current.isDragging = false;
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 z-30 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed md:relative top-0 left-0 z-40 md:z-auto
        h-full flex flex-col w-[300px] flex-shrink-0
        bg-white border-r border-gray-100
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        pt-[76px] md:pt-0
      `}>
        <div 
          ref={scrollTrackRef}
          className="absolute right-0 top-[140px] bottom-4 w-[18px] border-l border-gray-50 flex flex-col items-center select-none"
        >
          {thumbHeight > 0 && (
            <div
              ref={scrollThumbRef}
              onMouseDown={handleMouseDown}
              className="w-[8px] rounded-full bg-gray-200 hover:bg-gray-300 transition-colors cursor-grab active:cursor-grabbing absolute"
              style={{
                height: `${thumbHeight}px`,
                top: `${thumbTop}px`,
              }}
            />
          )}
        </div>

        <button
          onClick={onClose}
          className="md:hidden absolute top-20 right-6 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <X size={15} />
        </button>

        <div className="flex flex-col h-full overflow-hidden p-4 gap-3 pr-8">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl
            border border-gray-200 bg-gray-50
            hover:bg-gray-100
            text-[13px] font-semibold text-gray-700 transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            New chat
          </button>

          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-gray-50
              border border-gray-200
              rounded-xl pl-8 pr-3 py-2.5
              text-[13px] text-gray-800
              placeholder:text-gray-400
              focus:outline-none focus:border-gray-300 focus:bg-white"
            />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1 mt-1">
            Recents
          </span>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filtered.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center py-8">
                No chats yet
              </p>
            ) : (
              filtered.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`group flex items-center justify-between gap-2
                  px-3 py-3 rounded-xl cursor-pointer transition-all text-[13px]
                  ${
                    chat.id === currentChatId
                      ? 'bg-gray-100 border border-gray-200 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                  
                    <span className="truncate">{chat.title || 'Untitled chat'}</span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 text-gray-400 flex-shrink-0 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="h-screen bg-white pt-[76px]"
  >
    {children}
  </motion.div>
);

/* ── ChatPage Main ── */
const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const { machines } = useMachines();
  const { user } = useAuth();
  const { refreshAlerts } = useAlerts();
  const ws = useWorkstation();

  const machineParam = searchParams.get('machine');
  const machineKey = (machineParam || 'ALL').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();

  const {
    chats, currentChatId, currentChat,
    setCurrentChatId, createNewChat, addMessage, deleteChat,
  } = useChatHistory(machineKey);

  const queryHistory = (currentChat?.messages || [])
    .filter(m => !m.isErrorMessage && m.text)
    .slice(-8)
    .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

  const machineName = machineParam || 'All Machines';
  const dynamicMachine = machines.find(
    m => m.name === machineName || m.display_name === machineName || m.id === machineParam
  );
  const machineLabel = dynamicMachine?.display_name || machineName;

  const workstationRedirectTo = (() => {
    if (!(ws.bound && ws.machine?.id)) return null;
    const ok = machineParam === ws.machine.id || machineName === ws.machine.display_name;
    return ok ? null : ws.machine.id;
  })();

  const hasAccess = true;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    let chatId = currentChatId;
    if (!chatId) chatId = createNewChat();

    const questionText = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    addMessage(chatId, { text: questionText, sender: 'user' });
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const body = { question: questionText, history: queryHistory };
      if (dynamicMachine?.id) body.machine_filter = dynamicMachine.id;

      const data = await fetchApi('/query', {
        method: 'POST',
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      addMessage(chatId, {
        text: data.answer || 'No answer returned.',
        sender: 'ai',
        queryStatus: data.status,
        severityLevel: data.severity_level,
        alertScore: data.alert_score,
        machineSignificance: data.machine_significance,
        alertFired: data.alert_fired,
        sources: data.sources || [],
      });

      if (data.alert_fired) refreshAlerts();

    } catch (err) {
      if (err.name === 'AbortError') {
        addMessage(chatId, {
          text: '', sender: 'ai', queryStatus: 'stopped',
          isErrorMessage: true, errorText: 'Response generation stopped by user.',
        });
        return;
      }
      addMessage(chatId, {
        text: '', sender: 'ai', queryStatus: 'error', isErrorMessage: true,
        errorText: err.code === 'access_denied'
          ? `Access denied: ${err.detail}`
          : (err.detail || 'The AI service is currently unavailable. Please try again shortly.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => abortControllerRef.current?.abort();

  const handleInput = (e) => {
    const t = e.target;
    setInput(t.value);
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
  };

  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = 'en-US';
    recognitionRef.current = r;
    r.onstart  = () => setIsListening(true);
    r.onend    = () => setIsListening(false);
    r.onerror  = () => setIsListening(false);
    r.onresult = (ev) => {
      const t = Array.from(ev.results).map(x => x[0].transcript).join('');
      setInput(t);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    };
    r.start();
  }, [isListening]);

  if (workstationRedirectTo) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(workstationRedirectTo)}`} replace />;
  }

  if (!hasAccess) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-76px)] px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-400 max-w-md mb-8 leading-relaxed text-[15px]">
            Your domain (<span className="font-semibold text-gray-600">{user?.domain}</span>) does not grant
            access to <span className="font-semibold">{machineName}</span>.
          </p>
          {!ws.bound && (
            <Link
              to="/machines"
              className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 border border-gray-200 rounded-full px-5 py-2 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={15} /> Back to Machines
            </Link>
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex h-[calc(100vh-76px)] overflow-hidden bg-white text-gray-900">
        {/* Sidebar */}
        <InlineSidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={setCurrentChatId}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Feed Container */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
          
          {/* STATIC STANDARD HEADER ROW BAR */}
          <div className="w-full border-b border-gray-100 px-6 py-3.5 flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                <Menu size={18} />
              </button>
              <span className="text-[15px] font-bold text-gray-900 tracking-tight">{machineLabel}</span>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center w-full">

            {/* Handoff banner — only renders if the prior shift's log flagged
                anomalies and hasn't been acknowledged. Component self-hides
                otherwise so it doesn't take up vertical space. */}
            <div className="w-full flex justify-center pt-4">
              <HandoffBanner machineId={dynamicMachine?.id || machineKey} />
            </div>

            {/* Empty state OR messages view */}
            {(!currentChat || currentChat.messages.length === 0) ? (
              <div className="flex-1 w-full flex flex-col justify-center max-w-3xl mx-auto px-5 pb-32">
                <h1 className="text-[34px] font-semibold text-gray-900 leading-tight tracking-tight flex items-center flex-wrap">
                  <BrandMark showProduct={false} to="" className="mr-3" logoClassName="h-9 w-auto" />
                  Hi Technician! Describe the<br />machine problem here.
                </h1>
              </div>
            ) : (
              <div className="w-full max-w-3xl px-5 pt-6 pb-6 space-y-7">
                <AnimatePresence>
                  {currentChat.messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex group ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2.5 max-w-[88%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`relative px-5 py-3 text-[14px] leading-relaxed ${
                          message.sender === 'user'
                            ? 'bg-gray-200 text-black rounded-[24px]'
                            : 'bg-white border border-gray-200 text-black shadow-sm rounded-2xl'
                        }`}>
                          {message.isErrorMessage ? (
                            <div className="flex items-start gap-2 text-red-500 text-[13px]">
                              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                              {message.errorText}
                            </div>
                          ) : (
                            <>
                              <MessageContent content={message.text} isAI={message.sender !== 'user'} />

                              {message.sender === 'ai' && message.sources?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                                    <BookOpen size={9} /> Sources
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {message.sources.map((src, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-gray-700 font-medium">
                                        {src.document} · p.{src.page}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {message.sender === 'ai' && message.severityLevel > 0 && (() => {
                                const sev = SEVERITY_COLORS[message.severityLevel] || SEVERITY_COLORS[1];
                                return (
                                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sev.bg} ${sev.border} ${sev.text}`}>
                                        Severity {message.severityLevel} — {sev.label}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">
                                        Score {message.alertScore}/{message.machineSignificance * 5}
                                      </span>
                                    </div>
                                    {message.alertFired && (
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse">
                                        <BellRing size={11} /> ALERT FIRED — Managers notified
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                          
                          {/* Bottom Row: Copy Button & Timestamp */}
                          <div className="flex items-center mt-2 justify-between gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanText = (message.text || '').replace(/\[\d+\]/g, '');
                                navigator.clipboard.writeText(cleanText);
                                const btn = e.currentTarget;
                                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check text-green-600"><polyline points="20 6 9 17 4 12"/></svg>';
                                setTimeout(() => {
                                  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
                                }, 2000);
                              }}
                              className="text-gray-500 hover:text-gray-800 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1.5 font-medium"
                              title="Copy message"
                            >
                              <Copy size={13} />
                            </button>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {message.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <Bot size={14} className="text-gray-500" />
                      </div>
                      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Action Input Bar Row Container */}
          <div className="flex-shrink-0 w-full px-5 pt-2 pb-4 bg-white">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 pr-2 shadow-sm transition-all focus-within:border-gray-300 focus-within:shadow-md"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                  }}
                  placeholder={`Ask about your ${machineLabel}…`}
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none py-2.5 px-1 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none max-h-[200px] text-[15px] disabled:opacity-50 leading-relaxed"
                />
                <div className="flex items-center gap-1 mb-1">
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={isLoading}
                    className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                      isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={isListening ? 'Stop recording' : 'Voice input'}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  {isLoading ? (
                    <button
                      type="button" onClick={handleStop}
                      className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <Square size={18} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="submit" disabled={!input.trim()}
                      className={`p-2 rounded-xl transition-all ${
                        input.trim() ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Send size={18} />
                    </button>
                  )}
                </div>
              </form>
              <p className="text-[10px] text-center mt-1.5 text-gray-300 font-medium">
                SmartFix can make mistakes. Always verify critical decisions with a qualified engineer.
              </p>
            </div>
          </div>
        </main>
      </div>

      <EndShiftModal
        isOpen={isEndShiftModalOpen}
        onClose={() => setIsEndShiftModalOpen(false)}
        machineId={dynamicMachine?.id || machineKey}
        machineName={machineLabel}
      />
    </PageWrapper>
  );
};

export default ChatPage;