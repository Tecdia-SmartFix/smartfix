import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, ChevronLeft, CheckCircle, Mail, Phone, Shield, MessageSquare, BookOpen, BellRing, Award } from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth, EXPERTISE_DOMAINS } from '../context/AuthContext';
import { useWorkstation } from '../hooks/useWorkstation';
import { fetchApi } from '../api/apiClient';
import MachineCard from '../components/MachineCard';

import imageeImg from '../assets/imagee.png';
import pImg from '../assets/p.png';
import manualImg from '../assets/manual.png';
import alertImg from '../assets/alert.png';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

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

const FeatureCard = ({ icon: Icon, imageSrc, badgeText, title, description }) => (
  <div className="relative group rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 min-h-[320px] flex flex-col justify-center p-8 sm:p-10 border border-slate-200/50">
    {/* Background */}
    <div className="absolute inset-0 bg-slate-800 overflow-hidden">
      {imageSrc ? (
        <img src={imageSrc} alt={title} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 opacity-90 group-hover:scale-105 transition-transform duration-700" />
      )}
    </div>

    {/* Gradient Overlay for Readability */}
    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/60 to-transparent"></div>

    {/* Content */}
    <div className="relative z-10 max-w-[90%]">
      {badgeText && (
        <div className="mb-4 inline-flex items-center text-[#89CFF3] font-bold text-xs uppercase tracking-widest">
          {badgeText}
        </div>
      )}
      <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight tracking-tight">{title}</h3>
      <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
        {description}
      </p>
    </div>
  </div>
);

const LandingPage = () => {
  const { user, login } = useAuth();
  const ws = useWorkstation();
  const [machines, setMachines] = useState([]);
  const sliderRef = useRef(null);

  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchApi('/api/machines').then(res => {
      if (res.success && res.data) {
        setMachines(res.data);
      }
    }).catch(console.error);
  }, []);

  if (ws.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-tecdia-text/60 text-sm">
        Checking workstation…
      </div>
    );
  }
  if (false && ws.bound && ws.machine?.id) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(ws.machine.id)}`} replace />;
  }

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        
        {/* HERO SECTION (Dark theme with background image) */}
        <section 
          className="relative px-6 pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden bg-slate-950"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.95)), url(${imageeImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-3xl">
              <motion.h1 {...fadeUp(0.05)} className="text-5xl sm:text-6xl md:text-[80px] font-bold leading-[1.05] mb-4 text-white">
                TECDIA SmartFix
              </motion.h1>
              <motion.h2 {...fadeUp(0.1)} className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.1] mb-6 text-white">
                Industrial AI Diagnostics
              </motion.h2>

              <motion.p {...fadeUp(0.15)} className="text-slate-300 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-light">
                Select your machine, describe the issue, and get expert-level fault analysis in seconds — powered by industrial AI trained on real engineering data.
              </motion.p>

              <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-4">
                <Link to="/chat" className="bg-white text-slate-900 font-bold hover:bg-slate-100 flex items-center justify-center gap-2.5 text-base px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all">
                  Start Diagnosing <ArrowRight size={18} />
                </Link>
                <Link to="/machines" className="bg-slate-800/50 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-2 text-base px-8 py-4 rounded-full transition-all">
                  View Machines <ChevronRight size={16} />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* DOMAIN SELECTOR SECTION (White background) */}
        <section className="relative px-6 pt-20 md:pt-32 pb-10 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-landing-textDeep mb-6">
                Tailored for your <span className="text-landing-accent">Expertise</span>
              </h2>
              <p className="text-landing-text/60 mb-8 leading-relaxed text-lg max-w-2xl mx-auto">
                Access machine diagnostics specific to your operational domain. Our AI adapts to your specialized engineering field.
              </p>

              <div className="bg-landing-background/50 border border-landing-border rounded-2xl p-6 max-w-xl mx-auto text-left shadow-sm">
                <div className="flex items-center gap-2 mb-5 text-landing-textDeep font-bold text-sm">
                  <Shield size={18} className="text-landing-accent" />
                  Select Your Expertise Domain
                </div>
                <div className="flex flex-col gap-3">
                  {EXPERTISE_DOMAINS.map(domain => (
                    <button
                      key={domain}
                      type="button"
                      onClick={async () => {
                        const result = await login(domain);
                        if (!result.success) alert(result.error);
                      }}
                      className={`text-sm py-3 px-4 rounded-xl border text-left font-semibold transition-all cursor-pointer flex justify-between items-center ${
                        user.domain === domain
                          ? 'bg-landing-accent text-white border-landing-accent shadow-md'
                          : 'bg-white text-landing-text/70 border-landing-border hover:border-landing-accent/60 hover:bg-slate-50 hover:shadow-sm'
                      }`}
                    >
                      {domain}
                      {user.domain === domain && <CheckCircle size={18} />}
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-[11px] text-landing-text/40 leading-relaxed italic text-center">
                  Select your domain to access relevant machine diagnostics. Sessions last 12 hours.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* EQUIPMENT SLIDER SECTION (Dark Theme) */}
        {machines.length > 0 && (
          <section className="relative px-6 py-20 bg-black overflow-hidden">
            <div className="max-w-[1400px] mx-auto">
              <div className="flex items-end justify-between mb-10">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  Supported Equipment
                </h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => scrollSlider('left')}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => scrollSlider('right')}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div 
                ref={sliderRef}
                className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {machines.map(machine => (
                  <div key={machine.id} className="snap-start shrink-0 w-[280px] sm:w-[320px] md:w-[350px]">
                    <MachineCard machine={machine} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FEATURES GRID (Bento Style) */}
        <section className="relative px-6 py-10 md:pb-16 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-landing-textDeep mb-10 tracking-tight">
              Intelligent Diagnostics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <FeatureCard 
                  icon={MessageSquare}
                  imageSrc={pImg}
                  badgeText="Core Interface"
                  title="Natural Language Diagnostics"
                  description="Workers simply describe machine symptoms in plain English to receive immediate, actionable troubleshooting steps."
                />
              </div>

              <div className="md:col-span-1">
                <FeatureCard 
                  icon={BookOpen}
                  imageSrc={manualImg}
                  badgeText="AI Retrieval"
                  title="Instant Manual Retrieval"
                  description="Uses advanced AI to instantly retrieve the exact relevant pages from thousands of indexed engineering manuals."
                />
              </div>

              <div className="md:col-span-1">
                <FeatureCard 
                  icon={BellRing}
                  imageSrc={alertImg}
                  badgeText="Monitoring"
                  title="Severity-Weighted Alerts"
                  description="Automatically calculates issue severity and fires immediate alerts to managers when critical faults are detected."
                />
              </div>



            </div>
          </div>
        </section>

        {/* SUPPORT SECTION */}
        <section className="relative px-6 py-20 overflow-hidden">

          {/* Light overlay for readability */}
          <div className="absolute inset-0 bg-white/50"></div>

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <motion.h2 {...fadeUp(0)} className="text-3xl md:text-4xl font-bold text-black mb-4">
              Expert Technician Support
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-black font-medium leading-relaxed max-w-2xl mx-auto mb-12">
              Facing a complex issue? Our expert engineers are here to help you get back to peak productivity. Reach out directly for specialized machine diagnostics and technical assistance.
            </motion.p>
            
            <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
              <Link to="/contact" className="bg-white text-black font-bold hover:bg-gray-100 flex items-center justify-center gap-2 text-base px-10 py-4 rounded-full shadow-lg hover:shadow-xl transition-all">
                Contact Us
              </Link>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default LandingPage;