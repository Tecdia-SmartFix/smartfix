import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  MessageSquare,
  Microscope,
  Shield,
  Sparkles,
} from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth, EXPERTISE_DOMAINS } from '../context/AuthContext';
import { useWorkstation } from '../hooks/useWorkstation';
import { useStartDiagnosing } from '../context/StartDiagnosingContext';
import { fetchApi } from '../api/apiClient';
import MachineCard from '../components/MachineCard';

import heroMetrology from '../assets/tecdia-hero-metrology.png';
import heroCeramics from '../assets/tecdia-hero-ceramics.png';
import heroRf from '../assets/tecdia-hero-rf.png';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

const heroSlides = [
  {
    image: heroMetrology,
    kicker: 'Precision diagnostics',
    title: 'AI support for high-tolerance production.',
    metric: '24/7',
    label: 'shop-floor guidance',
  },
  {
    image: heroCeramics,
    kicker: 'Ceramic components',
    title: 'Find faults before yield, uptime, and quality drift.',
    metric: '<60s',
    label: 'first-pass triage',
  },
  {
    image: heroRf,
    kicker: 'RF and microelectronics',
    title: 'Technical answers grounded in machine manuals.',
    metric: '12h',
    label: 'secure shift sessions',
  },
];

const capabilityCards = [
  {
    icon: MessageSquare,
    image: heroRf,
    eyebrow: 'Operator interface',
    title: 'Plain-language fault intake',
    description:
      'Technicians describe symptoms naturally while SmartFix turns the report into structured fault paths and next actions.',
  },
  {
    icon: BookOpen,
    image: heroMetrology,
    eyebrow: 'Knowledge retrieval',
    title: 'Manual-backed recommendations',
    description:
      'Relevant procedures, diagrams, and maintenance notes are surfaced from indexed engineering documents instead of generic guesses.',
  },
  {
    icon: BellRing,
    image: heroCeramics,
    eyebrow: 'Escalation',
    title: 'Severity-weighted alerts',
    description:
      'Critical issues are classified quickly so managers and engineers can respond before stoppages spread across the line.',
  },
];

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

const CapabilityCard = ({ icon: Icon, image, eyebrow, title, description, large }) => (
  <article
    className={`theme-capability-card group relative overflow-hidden rounded-[28px] bg-zinc-950 text-white ${
      large ? 'min-h-[430px] md:col-span-2' : 'min-h-[360px]'
    }`}
  >
    <img
      src={image}
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.74)_42%,rgba(0,0,0,0.18)_100%)]" />
    <div className="relative z-10 flex h-full max-w-xl flex-col justify-between p-7 sm:p-10">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
        <Icon size={18} />
        {eyebrow}
      </div>
      <div>
        <h3 className="mb-4 text-3xl font-semibold leading-tight tracking-normal text-white sm:text-4xl">
          {title}
        </h3>
        <p className="max-w-md text-sm leading-7 text-white/70">{description}</p>
      </div>
    </div>
  </article>
);

const LandingPage = () => {
  const { user, login } = useAuth();
  const ws = useWorkstation();
  const { open: openStartDiagnosing } = useStartDiagnosing();
  const [machines, setMachines] = useState([]);
  const [activeHero, setActiveHero] = useState(0);
  const sliderRef = useRef(null);

  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHero((current) => (current + 1) % heroSlides.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchApi('/machines')
      .then((res) => setMachines(res?.machines || []))
      .catch(console.error);
  }, []);

  if (ws.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/60">
        Checking workstation...
      </div>
    );
  }

  const slide = heroSlides[activeHero];

  return (
    <PageWrapper>
      <main className="theme-page relative min-h-screen bg-[#eef1ef] text-black">
        <section className="theme-landing-hero relative flex min-h-screen overflow-hidden bg-black px-5 pt-20 text-white sm:px-8 sm:pt-24 lg:px-10">
          {heroSlides.map((item, index) => (
            <motion.img
              key={item.image}
              src={item.image}
              alt=""
              initial={false}
              animate={{ opacity: index === activeHero ? 1 : 0, scale: index === activeHero ? 1 : 1.04 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ))}
          <div className="theme-hero-overlay absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.82)_42%,rgba(0,0,0,0.44)_72%,rgba(0,0,0,0.62)_100%)]" />
          <div className="theme-hero-wash absolute inset-0 bg-black/20 sm:bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1680px] flex-col justify-between pb-7 sm:min-h-[calc(100vh-6rem)]">
            <div className="grid flex-1 items-center gap-8 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,520px)]">
              <div className="max-w-5xl">
                <motion.div {...fadeUp(0.02)} className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.34em] text-white/60">
                  <Sparkles size={16} />
                  {slide.kicker}
                </motion.div>
                <motion.h1
                  key={slide.title}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-5xl text-[clamp(4rem,9.5vw,9rem)] font-black uppercase leading-[0.88] tracking-normal text-white"
                >
                  Tecdia
                  <span className="block text-white/55">SmartFix</span>
                </motion.h1>
                <motion.p {...fadeUp(0.18)} className="mt-8 max-w-2xl text-xl leading-8 text-white/76 sm:text-2xl">
                  {slide.title}
                </motion.p>
              </div>

              <motion.aside
                {...fadeUp(0.25)}
                className="bg-transparent py-4 lg:self-end"
              >
                <div className="mb-6 flex flex-wrap items-center gap-x-7 gap-y-3">
                  <div className="min-w-max whitespace-nowrap bg-gradient-to-r from-[#46d8ed] to-[#2b8cff] bg-clip-text text-[clamp(3.8rem,13vw,5.7rem)] font-black leading-none text-transparent drop-shadow-[0_8px_24px_rgba(43,140,255,0.35)]">{slide.metric}</div>
                  <p className="min-w-0 text-base font-black uppercase leading-7 tracking-[0.22em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">{slide.label}</p>
                </div>
                <p className="mb-7 text-base font-semibold leading-8 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)]">
                  Built for precision manufacturers that need fast troubleshooting, traceable knowledge, and clean escalation during production shifts.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    onClick={openStartDiagnosing}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2b8cff]/20 transition hover:brightness-110"
                  >
                    Start Diagnosing <ArrowRight size={17} />
                  </button>
                  <Link
                    to="/machines"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    View Equipment <ChevronRight size={17} />
                  </Link>
                </div>
              </motion.aside>
            </div>

            <div className="mt-auto flex flex-col gap-5 border-t border-white/15 pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div className="max-w-3xl text-lg font-black uppercase leading-tight tracking-[0.22em] text-white/76 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-2xl sm:leading-none sm:tracking-[0.28em] md:text-3xl">
                Precision manufacturing intelligence
              </div>
              <div className="flex shrink-0 items-center gap-3 self-end pb-0.5">
                {heroSlides.map((item, index) => (
                  <button
                    key={item.kicker}
                    type="button"
                    onClick={() => setActiveHero(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      activeHero === index ? 'w-12 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/60'
                    }`}
                    aria-label={`Show ${item.kicker} slide`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="theme-dark-band bg-black px-5 py-16 text-white sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-[1680px] gap-5 md:grid-cols-3">
            {[
              ['01', 'Diagnose', 'Translate symptoms into likely causes and guided checks.'],
              ['02', 'Verify', 'Retrieve manual-backed procedures for the selected machine.'],
              ['03', 'Escalate', 'Alert the right expert when severity crosses the line.'],
            ].map(([number, title, body]) => (
              <div key={title} className="border-t border-white/18 pt-6">
                <div className="mb-8 text-sm font-semibold text-white/40">{number}</div>
                <h2 className="mb-3 text-3xl font-semibold tracking-normal text-white">{title}</h2>
                <p className="max-w-sm text-sm leading-7 text-white/58">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="theme-content px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-[1680px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="sticky top-24">
              <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-black/45">
                <Shield size={16} />
                Controlled access
              </div>
              <h2 className="max-w-2xl text-[clamp(3rem,7vw,7.5rem)] font-black uppercase leading-[0.86] tracking-normal text-black">
                Expertise matched to the line.
              </h2>
              <p className="mt-7 max-w-xl text-base leading-8 text-black/58">
                SmartFix adapts the diagnostic experience to the operating domain, keeping the knowledge base focused on the work your technicians actually perform.
              </p>
            </div>

            <div className="theme-card rounded-[28px] bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.10)] sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-black/10 pb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-black/40">Select domain</div>
                  <div className="mt-1 text-lg font-bold text-black">12-hour secure session</div>
                </div>
                <Gauge className="text-black/35" size={28} />
              </div>
              <div className="grid gap-3">
                {EXPERTISE_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={async () => {
                      const result = await login(domain);
                      if (!result.success) alert(result.error);
                    }}
                    className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm font-bold transition ${
                      user.domain === domain
                        ? 'border-black bg-black text-white'
                        : 'border-black/10 bg-[#eef1ef] text-black hover:border-black/35'
                    }`}
                  >
                    {domain}
                    {user.domain === domain ? <CheckCircle size={18} /> : <ArrowRight size={17} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {machines.length > 0 && (
          <section className="theme-dark-band overflow-hidden bg-[#111] px-5 py-20 text-white sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1680px]">
              <div className="mb-10 flex items-end justify-between gap-6">
                <div>
                  <div className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-white/40">
                    Connected equipment
                  </div>
                  <h2 className="text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[0.86] tracking-normal text-white">
                    Machines
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollSlider('left')}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
                    aria-label="Scroll machines left"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollSlider('right')}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
                    aria-label="Scroll machines right"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div
                ref={sliderRef}
                className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {machines.map((machine) => (
                  <div key={machine.id} className="w-[285px] shrink-0 snap-start sm:w-[340px] md:w-[380px]">
                    <MachineCard machine={machine} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="theme-content px-5 py-20 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1680px]">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h2 className="max-w-4xl text-[clamp(3rem,7vw,7.5rem)] font-black uppercase leading-[0.86] tracking-normal text-black">
                Precision support system
              </h2>
              <p className="max-w-md text-sm leading-7 text-black/58">
                A focused diagnostic layer for technicians, supervisors, and engineers working with complex production assets.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {capabilityCards.map((card, index) => (
                <CapabilityCard key={card.title} {...card} large={index === 0} />
              ))}
            </div>
          </div>
        </section>

        <section className="theme-dark-band bg-black px-5 py-20 text-white sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-[1680px] gap-10 lg:grid-cols-[1fr_0.55fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-white/45">
                <Microscope size={16} />
                Expert escalation
              </div>
              <h2 className="max-w-5xl text-[clamp(3.2rem,8vw,8.5rem)] font-black uppercase leading-[0.84] tracking-normal text-white">
                Keep the shift moving.
              </h2>
            </div>
            <div className="border-t border-white/20 pt-7">
              <p className="mb-7 text-base leading-8 text-white/62">
                When an issue needs human judgment, route it quickly with the machine context, symptom trail, and severity already organized.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                Contact Support <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </PageWrapper>
  );
};

export default LandingPage;
