import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import MessageContent from '../components/MessageContent';
import { useChatHistory } from '../hooks/useChatHistory';
import { useChatSession } from '../hooks/useChatSession';
import {
  Bot, Plus, User, Send, Mic, MicOff, Menu, Settings2,
  Printer, Scissors, Wrench, Gauge, X, FileText, Cpu, Factory,
  Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, ShieldAlert, ArrowLeft,
  BellRing, RefreshCw, BookOpen, AlertTriangle,
} from 'lucide-react';
import { useMachines } from '../context/MachineContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';

// Icon map for dynamic lookup
const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

// Static suggestion map for known machines (keyed by display_name)
const MACHINE_SUGGESTIONS = {
  'Injection Molding Machine':  ['Barrel pressure is fluctuating abnormally', 'Cycle time increased by 15% — why?', 'Short shots on every 3rd cycle', 'Material burn marks in the mold cavity'],
  'Industrial 3D Printer':      ['Layer delamination on large prints', 'Filament keeps snapping mid-print', 'Bed adhesion failing after 3 hours', 'Extruder temperature inconsistency'],
  'Laser Cutting Machine':      ['Cut edges are burning and discolored', 'Beam focus is off — how to recalibrate?', 'Lens showing signs of wear', 'Power output dropping over time'],
  '6-Axis Industrial Robot Arm':['Joint 3 showing torque drift', 'Collision detection triggered unexpectedly', 'End-effector position is off by 2mm', 'Robot arm vibrating at high speed'],
  'Hydraulic Press':            ['Hydraulic pressure drops during press cycle', 'Seal leak detected on cylinder 2', 'Press force inconsistent between strokes', 'Oil temperature running too high'],
};
const DEFAULT_SUGGESTIONS = ['Diagnose a critical system fault', 'Run a preventive maintenance check', 'Explain the latest error code', 'Check operational status'];

const SEVERITY_COLORS = {
  1: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Informational' },
  2: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Minor' },
  3: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Degraded' },
  4: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    label: 'Production Impact' },
  5: { bg: 'bg-red-100',   border: 'border-red-400',    text: 'text-red-700',    label: 'Safety Risk' },
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="h-screen pt-[76px]"
  >
    {children}
  </motion.div>
);

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const { machines } = useMachines();
  const { user } = useAuth();
  const { refreshAlerts } = useAlerts();

  // useChatHistory manages the sidebar chat list (multi-session, localStorage)
  const { chats, currentChatId, currentChat, setCurrentChatId, createNewChat, addMessage, deleteChat } = useChatHistory();

  // useChatSession manages the /query history array (15-min idle, smartfix.history)
  const { history: queryHistory, appendTurn, clearHistory: clearQueryHistory, updateLastActivity } = useChatSession();

  const machineName = searchParams.get('machine') || 'All Machines';
  const dynamicMachine = machines.find(m => m.name === machineName || m.display_name === machineName);

  // ── Access control (uses user.domain per contract) ──────────────────────
  const hasAccess =
    user.domain === 'All Access' ||
    machineName === 'All Machines' ||
    (dynamicMachine && (dynamicMachine.category === 'General' || dynamicMachine.category === user.domain));

  // ── Suggestion resolution ────────────────────────────────────────────────
  const suggestions = MACHINE_SUGGESTIONS[machineName] ||
    (dynamicMachine?.description
      ? [`Analyze fault: ${dynamicMachine.description}`, `Check status of ${machineName}`, 'Run full diagnostic scan', 'What does the latest error code mean?']
      : DEFAULT_SUGGESTIONS);

  const MachineIcon = ICON_MAP[dynamicMachine?.icon] || Settings2;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [currentChat?.messages, isLoading]);

  useEffect(() => {
    if (!currentChatId && chats.length > 0) setCurrentChatId(chats[0].id);
  }, [chats, currentChatId, setCurrentChatId]);

  // ── Send handler — calls real POST /query ─────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    let chatId = currentChatId;
    if (!chatId) chatId = createNewChat();

    const questionText = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setQueryError(null);
    updateLastActivity();

    // Add user message to sidebar chat immediately
    addMessage(chatId, { text: questionText, sender: 'user' });
    setIsLoading(true);

    try {
      const body = {
        question: questionText,
        machine_filter: dynamicMachine?.id || 'ALL',
        history: queryHistory, // [{role, content}] — last N turns, server caps at 8
      };

      const data = await fetchApi('/query', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // data: { status, answer, sources, severity_level, alert_score, machine_significance, alert_fired }
      const aiText = data.answer || 'No answer returned.';

      addMessage(chatId, {
        text: aiText,
        sender: 'ai',
        // Contract fields, stored on the message for display
        queryStatus: data.status,           // "success" | "not_found" | "error"
        severityLevel: data.severity_level,  // 1–5
        alertScore: data.alert_score,        // severity × significance
        machineSignificance: data.machine_significance,
        alertFired: data.alert_fired,        // bool
        sources: data.sources || [],         // [{document, page}]
      });

      // Append to query history for next request
      appendTurn(questionText, aiText);

      // If an alert was fired server-side, refresh the alert list
      if (data.alert_fired) {
        refreshAlerts();
      }

    } catch (err) {
      setQueryError(err.detail || err.message || 'Failed to get a response. Please try again.');
      // Remove the user message's "pending" state by adding an error AI message
      addMessage(chatId, {
        text: '',
        sender: 'ai',
        queryStatus: 'error',
        isErrorMessage: true,
        errorText: err.code === 'access_denied'
          ? `Access denied: ${err.detail}`
          : (err.detail || 'The AI service is currently unavailable. Please try again shortly.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInput = (e) => {
    const target = e.target;
    setInput(target.value);
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  const applySuggestion = (text) => {
    setInput(text);
    textareaRef.current?.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  // ── "Start over" — clears smartfix.history (15-min session) ──────────────
  const handleStartOver = () => {
    clearQueryHistory();
    if (currentChatId) createNewChat();
  };

  // ── Voice input ──────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setInput(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    };
    recognition.start();
  }, [isListening]);

  // ── Access denied screen ─────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-76px)] px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-tecdia-textDeep mb-2">Access Restricted</h2>
          <p className="text-tecdia-text/60 max-w-md mb-8 leading-relaxed">
            Your current domain (<span className="font-bold text-tecdia-accent">{user.domain}</span>)
            does not grant access to the <span className="font-bold">{machineName}</span> diagnostics.
          </p>
          <Link to="/machines" className="btn-primary flex items-center gap-2">
            <ArrowLeft size={18} /> Back to Machines
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex h-[calc(100vh-76px)] text-tecdia-text overflow-hidden relative">
        <Sidebar
          currentChatId={currentChatId}
          chats={chats}
          onSelectChat={setCurrentChatId}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden">
          {/* ── Header ── */}
          <header className="h-16 flex items-center justify-between px-4 border-b border-tecdia-border bg-white/40 backdrop-blur-md relative z-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-tecdia-text/60 hover:text-tecdia-text">
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pr-4 border-r border-tecdia-border">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-tecdia-border bg-tecdia-surface">
                    <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
                  </div>
                  <span className="hidden sm:inline text-sm font-bold text-tecdia-textDeep">Tecdia SmartFix</span>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-tecdia-surface border border-tecdia-border overflow-hidden">
                  {dynamicMachine?.icon && dynamicMachine.icon !== 'Settings2'
                    ? <MachineIcon size={16} className="text-tecdia-text/60" />
                    : <MachineIcon size={16} className="text-tecdia-text/60" />
                  }
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tecdia-accent border border-tecdia-accent/20 text-xs font-bold text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="leading-none">{machineName}</span>
              </div>
            </div>

            {/* Start Over button */}
            {currentChat && currentChat.messages.length > 0 && (
              <button
                onClick={handleStartOver}
                title="Clear session history and start a new conversation"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-tecdia-text/50 hover:text-tecdia-accent hover:bg-tecdia-accent/5 border border-transparent hover:border-tecdia-accent/20 transition-all"
              >
                <RefreshCw size={13} /> Start over
              </button>
            )}
          </header>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto pt-4 flex flex-col items-center">
            {!currentChat || currentChat.messages.length === 0 ? (
              /* Empty state with suggestions */
              <div className="flex-1 flex flex-col items-center justify-center -mt-16 px-4 w-full">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-16 h-16 rounded-2xl bg-white border border-tecdia-border flex items-center justify-center mb-5 overflow-hidden shadow-sm">
                  <img src="/src/assets/logo.png" alt="AI" className="w-10 h-10 object-contain" />
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 text-sm font-bold text-tecdia-accent overflow-hidden">
                  <MachineIcon size={16} />
                  {machineName}
                </motion.div>

                <h2 className="text-xl md:text-2xl font-bold mb-8 text-center text-tecdia-textDeep">What fault are you diagnosing?</h2>

                <motion.div
                  initial="hidden" animate="show"
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full"
                >
                  {suggestions.map((s, i) => (
                    <motion.button key={i}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      onClick={() => applySuggestion(s)}
                      className="p-4 bg-white rounded-xl text-left text-sm text-tecdia-text/70 hover:bg-tecdia-surface hover:text-tecdia-text border border-tecdia-border hover:border-tecdia-accent transition-all font-medium group/sugg shadow-sm"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span>{s}</span>
                        <Plus size={14} className="opacity-0 group-hover/sugg:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            ) : (
              /* Message list */
              <div className="w-full max-w-3xl px-4 space-y-8 pb-36">
                <AnimatePresence>
                  {currentChat.messages.map((message) => (
                    <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                          message.sender === 'user' ? 'bg-tecdia-accent text-white' : 'bg-white border border-tecdia-border'
                        }`}>
                          {message.sender === 'user' ? <User size={16} /> : <img src="/src/assets/logo.png" alt="AI" className="w-5 h-5 object-contain" />}
                        </div>
                        <div className={`rounded-2xl px-5 py-3 border transition-all ${
                          message.sender === 'user'
                            ? 'bg-tecdia-surface border-tecdia-border text-tecdia-textDeep'
                            : 'bg-white border-tecdia-border text-tecdia-text shadow-sm'
                        }`}>
                          {/* Error AI message */}
                          {message.isErrorMessage ? (
                            <div className="flex items-start gap-2.5 text-sm text-red-600">
                              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                              <span>{message.errorText}</span>
                            </div>
                          ) : (
                            <>
                              <MessageContent content={message.text} isAI={message.sender !== 'user'} />

                              {/* Sources (AI only) */}
                              {message.sender === 'ai' && message.sources && message.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-tecdia-border">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-2">
                                    <BookOpen size={10} /> Sources
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {message.sources.map((src, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-tecdia-background border border-tecdia-border text-tecdia-text/50 font-medium">
                                        {src.document} · p.{src.page}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Severity + alert (AI only) */}
                              {message.sender === 'ai' && message.severityLevel > 0 && (() => {
                                const sev = SEVERITY_COLORS[message.severityLevel] || SEVERITY_COLORS[1];
                                return (
                                  <div className={`mt-3 pt-3 border-t border-tecdia-border space-y-1.5`}>
                                    {/* Severity badge */}
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sev.bg} ${sev.border} ${sev.text}`}>
                                        Severity {message.severityLevel} — {sev.label}
                                      </span>
                                      <span className="text-[9px] font-medium text-tecdia-text/30 uppercase tracking-tight">
                                        Score {message.alertScore}/{message.machineSignificance * 5}
                                      </span>
                                    </div>

                                    {/* Alert fired indicator */}
                                    {message.alertFired && (
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse">
                                        <BellRing size={12} /> ALERT FIRED — Managers notified
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}

                          <span className="text-[10px] text-tecdia-text/40 mt-2 block text-right font-medium tracking-tight">
                            {message.timestamp}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-tecdia-border flex items-center justify-center flex-shrink-0">
                        <img src="/src/assets/logo.png" alt="AI" className="w-5 h-5 object-contain" />
                      </div>
                      <div className="bg-white rounded-2xl px-5 py-4 flex gap-1.5 items-center border border-tecdia-border shadow-sm">
                        <span className="w-1.5 h-1.5 bg-tecdia-accent/60 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-tecdia-accent/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-tecdia-accent/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── Input Bar ── */}
          <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 bg-gradient-to-t from-tecdia-surface/20 via-transparent to-transparent z-10">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSend}
                className="input-glow glass p-2 pl-4 pr-2 rounded-2xl border flex items-end gap-2 bg-white transition-all duration-300 shadow-lg">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  placeholder={`Ask about your ${machineName}…`}
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none py-3 px-2 text-tecdia-text placeholder:text-tecdia-text/40 focus:outline-none focus:ring-0 resize-none max-h-[200px] text-[15px] disabled:opacity-50"
                />
                <div className="flex items-center gap-1 mb-1">
                  {/* Mic */}
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={isLoading}
                    className={`p-2.5 rounded-xl transition-all hidden sm:flex items-center justify-center ${
                      isListening
                        ? 'bg-red-500/10 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse'
                        : 'hover:bg-tecdia-background text-tecdia-text/40 hover:text-tecdia-text'
                    }`}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button type="submit" disabled={!input.trim() || isLoading}
                    className={`p-2.5 rounded-xl transition-all ${
                      input.trim() && !isLoading
                        ? 'bg-tecdia-accent text-white hover:bg-tecdia-accent/90'
                        : 'bg-tecdia-background text-tecdia-text/20 cursor-not-allowed border border-tecdia-border'
                    }`}>
                    <Send size={20} />
                  </button>
                </div>
              </form>
              <p className="text-[11px] text-center mt-2.5 text-tecdia-text/40 font-medium">
                Tecdia SmartFix can make mistakes. Always verify critical decisions with a qualified engineer.
              </p>
            </div>
          </div>
        </main>
      </div>
    </PageWrapper>
  );
};

export default ChatPage;
