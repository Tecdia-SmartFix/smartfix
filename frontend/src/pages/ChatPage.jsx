import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import MessageContent from '../components/MessageContent';
import { useChatHistory } from '../hooks/useChatHistory';
import { useWorkstation } from '../hooks/useWorkstation';
import {
  Bot, Plus, User, Send, Mic, MicOff, Menu, Settings2,
  Printer, Scissors, Wrench, Gauge, X, FileText, Cpu, Factory,
  Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, ShieldAlert, ArrowLeft,
  BellRing, RefreshCw, BookOpen, AlertTriangle, Square,
} from 'lucide-react';
import { useMachines } from '../context/MachineContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';
import ChromaKeyVideo from '../components/ChromaKeyVideo';

// Icon map for dynamic lookup
const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

// Generic fallback suggestions, lightly tailored by machine category.
// Used only when the backend hasn't supplied suggested_questions for a machine
// (e.g. a freshly uploaded one without curated defaults yet).
const FALLBACK_SUGGESTIONS_BY_CATEGORY = {
  'Manufacturing':           ['What does the latest error code mean?', 'Production has stopped — where do I start?', 'Run a preventive maintenance check', 'What is the recommended service interval?'],
  'Fabrication':             ['What does the latest error code mean?', 'Output quality has dropped — what to check?', 'Run a preventive maintenance check', 'What is the recommended service interval?'],
  'Heavy Machinery':         ['What does the latest alarm code mean?', 'Pressure is not reaching the setpoint', 'Run a preventive maintenance check', 'What is the safety lockout procedure?'],
  'Additive Manufacturing':  ['What does the latest error code mean?', 'A print just failed — what to look at first?', 'Run a preventive maintenance check', 'What materials does this printer support?'],
  'Automation':              ['What does the latest error code mean?', 'A safety stop was triggered — what now?', 'Run a preventive maintenance check', 'How do I re-home the axes?'],
};
const DEFAULT_SUGGESTIONS = ['What does the latest error code mean?', 'Run a preventive maintenance check', 'Explain a critical safety procedure', 'Check operational status'];

const SEVERITY_COLORS = {
  1: { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  label: 'Informational' },
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
  const ws = useWorkstation();

  // Canonical per-machine key used to namespace chat history + session storage.
  // Matches the wrapper key in App.jsx ChatRoute so storage layout stays in sync
  // with the React remount boundary.
  const machineParam = searchParams.get('machine');
  const machineKey = (machineParam || 'ALL').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();

  // useChatHistory manages the sidebar chat list (multi-session, localStorage), per machine
  const { chats, currentChatId, currentChat, setCurrentChatId, createNewChat, addMessage, deleteChat } = useChatHistory(machineKey);

  // /query history is DERIVED from the current chat's messages, not stored
  // separately. This makes context strictly per-chat: clicking "+ New chat"
  // resets currentChat.messages to [] → queryHistory becomes [] → the LLM
  // gets a clean slate, no bleed from previous chats on the same machine.
  // Cap at last 8 messages (≈4 turns) to fit Groq's TPM budget. Recomputed
  // every render — cheap, and the React Compiler will memoize if needed.
  const queryHistory = (currentChat?.messages || [])
    .filter(m => !m.isErrorMessage && m.text)
    .slice(-8)
    .map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const machineName = machineParam || 'All Machines';
  const dynamicMachine = machines.find(
    m => m.name === machineName || m.display_name === machineName || m.id === machineParam
  );
  // Pretty label for UI chips + the textarea placeholder. Falls back to the
  // raw machineName (URL param) until /machines has loaded.
  const machineLabel = dynamicMachine?.display_name || machineName;

  // ── Workstation binding guard ──
  // If this client's IP is bound to a machine, force the URL to point at that
  // machine. Computed here (no early return — Rules of Hooks) and acted on
  // after all hooks have been declared, just below.
  const workstationRedirectTo = (() => {
    if (!(ws.bound && ws.machine?.id)) return null;
    const onCorrectMachine =
      machineParam === ws.machine.id || machineName === ws.machine.display_name;
    return onCorrectMachine ? null : ws.machine.id;
  })();

  // ── Access control (uses user.domain per contract) ──────────────────────
  const hasAccess =
    user.domain === 'All Access' ||
    machineName === 'All Machines' ||
    (dynamicMachine && (dynamicMachine.category === 'General' || dynamicMachine.category === user.domain));

  // ── Suggestion resolution ────────────────────────────────────────────────
  // Priority: backend-curated per machine → category fallback → generic default.
  // Newly uploaded machines without curated suggestions land in the category bucket.
  const suggestions =
    (dynamicMachine?.suggested_questions?.length ? dynamicMachine.suggested_questions : null) ||
    FALLBACK_SUGGESTIONS_BY_CATEGORY[dynamicMachine?.category] ||
    DEFAULT_SUGGESTIONS;

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
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [currentChat?.messages, isLoading]);

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

    // Add user message to sidebar chat immediately
    addMessage(chatId, { text: questionText, sender: 'user' });
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      // Per API contract: machine_filter is Optional[str]. Omit it entirely for
      // "All Machines" — sending a sentinel like 'ALL' would mismatch every chunk.
      const body = {
        question: questionText,
        history: queryHistory, // [{role, content}] — last N turns, server caps at 8
      };
      if (dynamicMachine?.id) {
        body.machine_filter = dynamicMachine.id;
      }

      const data = await fetchApi('/query', {
        method: 'POST',
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
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

      // (No separate appendTurn call — queryHistory derives from currentChat.messages,
      // and addMessage above already updated them.)

      // If an alert was fired server-side, refresh the alert list
      if (data.alert_fired) {
        refreshAlerts();
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        addMessage(chatId, {
          text: '',
          sender: 'ai',
          queryStatus: 'stopped',
          isErrorMessage: true,
          errorText: 'Response generation stopped by user.',
        });
        return;
      }
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

  // ── "Start over" — same effect as "+ New chat" now that queryHistory
  // derives from currentChat.messages: a new chat = empty messages = empty
  // history. Kept as a separate button for UX clarity (the worker reads it
  // as "wipe the slate").
  const handleStartOver = () => {
    createNewChat();
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

  // ── Workstation redirect (after all hooks, per Rules of Hooks) ───────────
  if (workstationRedirectTo) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(workstationRedirectTo)}`} replace />;
  }

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
          {ws.bound ? (
            // Bound workstation — nowhere to go back to; surface a contact hint instead.
            <p className="text-tecdia-text/50 text-sm">
              Contact your shift manager if you believe this workstation is mis-configured.
            </p>
          ) : (
            <Link to="/machines" className="btn-primary flex items-center gap-2">
              <ArrowLeft size={18} /> Back to Machines
            </Link>
          )}
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
          {/* ── Header ──
              shrink-0 is essential: when the textarea auto-grows as the user
              types a multi-line follow-up, the input bar (shrink-0, growing)
              competes with this header for space inside <main>. Without
              shrink-0 the header gets collapsed to 0px by flex distribution. */}
          <header className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-tecdia-border bg-white/40 backdrop-blur-md relative z-20">
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
                <span className="leading-none">{machineLabel}</span>
              </div>
            </div>

            {/* Chat actions — always visible so the user can branch / reset
                regardless of conversation state or sidebar visibility. */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={createNewChat}
                title="Start a new chat thread for this machine"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-tecdia-text/60 hover:text-tecdia-accent hover:bg-tecdia-accent/5 border border-transparent hover:border-tecdia-accent/20 transition-all"
              >
                <Plus size={13} /> New chat
              </button>
              <button
                onClick={handleStartOver}
                title="Clear session history and start a new conversation"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-tecdia-text/50 hover:text-tecdia-accent hover:bg-tecdia-accent/5 border border-transparent hover:border-tecdia-accent/20 transition-all"
              >
                <RefreshCw size={13} /> Start over
              </button>
            </div>
          </header>

          {/* ── Messages ──
              min-h-0 is essential: without it the flex child won't shrink below
              its content size, so the scroll viewport overflows the parent and
              bleeds behind the input bar. */}
          <div className="flex-1 min-h-0 overflow-y-auto pt-4 flex flex-col items-center">
            {!currentChat || currentChat.messages.length === 0 ? (
              /* Empty state with suggestions */
              <div className="flex-1 flex flex-col items-center justify-center -mt-16 px-4 w-full">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="relative w-44 h-44 mb-5 pointer-events-none drop-shadow-xl">
                  <ChromaKeyVideo
                    src="/src/assets/robot.webm"
                    width={176}
                    height={176}
                    className="relative"
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 text-sm font-bold text-tecdia-accent overflow-hidden">
                  <MachineIcon size={16} />
                  {machineLabel}
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
              <div className="w-full max-w-3xl px-4 space-y-8 pb-6">
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

          {/* ── Input Bar ──
              Normal flex child (no absolute positioning) so the scroll area
              above it has a real bottom boundary. Transparent background —
              the form pill (bg-white) is the only thing that visually sits
              on top of the page gradient. */}
          <div className="shrink-0 w-full px-4 md:px-6 pt-2 pb-0 bg-transparent">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSend}
                className="input-glow glass p-2 pl-4 pr-2 rounded-2xl border flex items-end gap-2 bg-white transition-all duration-300 shadow-lg">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  placeholder={`Ask about your ${machineLabel}…`}
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
                  {isLoading ? (
                    <button type="button" onClick={handleStop}
                      className="p-2.5 rounded-xl transition-all bg-red-500 text-white hover:bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                      title="Stop generation">
                      <Square size={20} fill="currentColor" />
                    </button>
                  ) : (
                    <button type="submit" disabled={!input.trim()}
                      className={`p-2.5 rounded-xl transition-all ${
                        input.trim()
                          ? 'bg-tecdia-accent text-white hover:bg-tecdia-accent/90'
                          : 'bg-tecdia-background text-tecdia-text/20 cursor-not-allowed border border-tecdia-border'
                      }`}>
                      <Send size={20} />
                    </button>
                  )}
                </div>
              </form>
              <p className="text-[10px] text-center mt-1 text-tecdia-text/40 font-medium">
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
