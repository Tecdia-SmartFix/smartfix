import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Wrench, ChevronRight, Mail, Phone } from 'lucide-react';
import Footer from '../components/Footer';
import { useWorkstation } from '../hooks/useWorkstation';
import { useStartDiagnosing } from '../context/StartDiagnosingContext';

import ChromaKeyVideo from '../components/ChromaKeyVideo';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

const ChatPreview = () => (
  <div className="relative w-full max-w-lg mx-auto">
    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-tecdia-accent/30 to-tecdia-border/20 blur-sm" />
    <div className="relative bg-white rounded-2xl border border-tecdia-border overflow-hidden shadow-xl">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-tecdia-border bg-tecdia-background/60">
        <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
          <Wrench size={13} className="text-tecdia-accent" />
        </div>
        <div>
          <p className="text-xs font-bold text-tecdia-textDeep">Hydraulic Press</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-tecdia-text/50">AI ready</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[75%] bg-tecdia-accent text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            Hydraulic pressure drops mid-cycle. Seal 2 might be leaking.
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#CDF5FD] border border-tecdia-border flex items-center justify-center flex-shrink-0 mt-1">
            <Zap size={12} className="text-tecdia-accent" />
          </div>
          <div className="max-w-[80%] bg-[#CDF5FD] px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed">
            <p className="text-tecdia-textDeep font-semibold mb-1 text-xs">Diagnostic Result</p>
            <p className="text-tecdia-text/80 text-xs mb-2">Consistent with <strong className="text-tecdia-textDeep">cylinder-2 rod seal failure</strong>. Internal bypass is likely causing the pressure drop.</p>
            <div className="space-y-1">
              {['Isolate cylinder 2 and inspect rod seal', 'Check for contamination in hydraulic fluid', 'Replace seal kit — P/N HYD-224-RS'].map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-tecdia-text/70">
                  <span className="text-tecdia-accent font-bold flex-shrink-0">{i + 1}.</span>{s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-tecdia-background border border-tecdia-border rounded-xl px-3 py-2.5">
          <p className="text-xs text-tecdia-text/30 flex-1">Ask about your machine...</p>
          <div className="w-6 h-6 rounded-lg bg-tecdia-accent flex items-center justify-center">
            <ArrowRight size={11} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.35, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

const LandingPage = () => {
  const ws = useWorkstation();
  const { open: openModal } = useStartDiagnosing();

  // Workstation-bound IPs skip the landing+selector flow entirely and land
  // straight in the chat for the bound machine. Unbound IPs (dev/admin) see
  // the existing landing page below.
  if (ws.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-tecdia-text/60 text-sm">
        Checking workstation…
      </div>
    );
  }
  if (ws.bound && ws.machine?.id) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(ws.machine.id)}`} replace />;
  }

  return (
    <PageWrapper>
      <div className="relative overflow-hidden min-h-screen">
        <section className="relative px-6 pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-tecdia-accent/10 blur-3xl pointer-events-none" />
          <div className="absolute top-40 right-10 w-64 h-64 rounded-full bg-[#89CFF3]/30 blur-2xl pointer-events-none" />
          <div className="absolute top-20 left-10 w-48 h-48 rounded-full bg-white/40 blur-2xl pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative z-20">
                <motion.h1 {...fadeUp(0.05)} className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.06] mb-6">
                  <span className="text-tecdia-textDeep">Tecdia </span>
                  <span className="text-tecdia-accent">SmartFix</span>
                </motion.h1>

                <motion.p {...fadeUp(0.15)} className="text-tecdia-text/70 text-lg max-w-xl mb-10 leading-relaxed">
                  Select your machine, describe the issue, and get expert-level fault analysis
                  in seconds — powered by industrial AI trained on real engineering data.
                </motion.p>

                <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3 mb-8">
                  <button
                    type="button"
                    onClick={openModal}
                    className="btn-primary flex items-center justify-center gap-2.5 text-base px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Start Diagnosing <ArrowRight size={18} />
                  </button>
                  <Link to="/machines" className="btn-secondary flex items-center justify-center gap-2 text-base px-8 py-4">
                    View Machines <ChevronRight size={16} />
                  </Link>
                </motion.div>
              </div>

              <motion.div {...fadeUp(0.2)} className="hidden lg:flex items-center justify-end relative">
                {/* Robot Floating on Left */}
                <div className="relative w-[360px] h-[360px] -mr-16 z-20 pointer-events-none drop-shadow-2xl -translate-y-2">
                  <ChromaKeyVideo
                    src="/src/assets/robot.webm"
                    width={360}
                    height={360}
                    className="relative"
                  />
                </div>

                {/* Chat Preview on Right */}
                <div className="relative z-10 w-full max-w-[420px]">
                  <ChatPreview />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="relative px-6 py-20 bg-[#C6EFFF]">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 {...fadeUp(0)} className="text-3xl md:text-4xl font-bold text-tecdia-textDeep mb-4">
              Expert <span className="text-tecdia-accent">Technician Support</span>
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-tecdia-text/60 leading-relaxed max-w-2xl mx-auto mb-12">
              Facing a complex issue? Our expert engineers are here to help you get back to peak productivity. Reach out directly for specialized machine diagnostics and technical assistance.
            </motion.p>
            
            <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#A5E3FE] text-tecdia-accent flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-0.5">Email Support</p>
                  <a href="mailto:smartfix@tecdia.co.jp" className="text-sm font-bold text-tecdia-textDeep hover:text-tecdia-accent transition-colors">smartfix@tecdia.co.jp</a>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#A5E3FE] text-tecdia-accent flex items-center justify-center">
                  <Phone size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-0.5">Technician Hotline</p>
                  <a href="tel:+813XXXXXXXX" className="text-sm font-bold text-tecdia-textDeep hover:text-tecdia-accent transition-colors">+81-3-XXXX-XXXX</a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default LandingPage;