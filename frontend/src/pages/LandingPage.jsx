import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CheckCircle,
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
  const { open: openStartDiagnosing } = useStartDiagnosing();
  const [machines, setMachines] = useState([]);
  const [activeHero, setActiveHero] = useState(0);
  // Scroll-hijack carousel: as the user scrolls past the machines section,
  // the section pins (sticky inside an oversized parent) and the card strip
  // slides horizontally based on scrollYProgress. See the JSX block below
  // for the actual mount.
  // Offset is locked to ["start start", "end end"] so progress starts at 0
  // only when the section's top reaches the viewport's top (the same moment
  // the sticky pin engages). Without this, the default offset starts
  // progress as soon as the section *enters* the viewport from the bottom
  // — meaning the cards would start translating while the user was still
  // mid-hero, which feels broken.
  const carouselRef = useRef(null);
  const { scrollYProgress: carouselProgress } = useScroll({
    target: carouselRef,
    offset: ['start start', 'end end'],
  });
  // Translate range tuned for ~4–6 cards at lg widths. The strip moves from
  // 1% (slight inset so the first card edge isn't flush) to roughly -65%
  // of its own width, which on a 1680px container scrolls past the last
  // card. Bump the second value if more machines are added and the last
  // card never reaches the left edge.
  const carouselX = useTransform(carouselProgress, [0, 1], ['1%', '-65%']);

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
                  <div className="min-w-max whitespace-nowrap text-white text-[clamp(3.8rem,13vw,5.7rem)] font-black leading-none">{slide.metric}</div>
                  <p className="min-w-0 text-base font-black uppercase leading-7 tracking-[0.22em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">{slide.label}</p>
                </div>
                <p className="mb-7 text-base font-semibold leading-8 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)]">
                  Built for precision manufacturers that need fast troubleshooting, traceable knowledge, and clean escalation during production shifts.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    onClick={openStartDiagnosing}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
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
                      activeHero === index ? 'w-12 bg-[#2b8cff]' : 'w-2.5 bg-white/35 hover:bg-white/60'
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



        {machines.length > 0 && (
          // Scroll-hijack carousel. The outer ref'd section is taller than
          // the viewport so scroll progress can advance from 0→1 while the
          // inner sticky child is pinned at top:0. The heading lives INSIDE
          // the pinned child so the user sees the title and the cards
          // together — no whitespace strip between them — and the cards
          // sit in the remaining vertical space (flex-1) rather than
          // floating in the middle of an empty h-screen.
          // Height ~250vh gives ~150vh of pinned scroll travel (250 − 100).
          // Bump it if you add many more machines.
          <section
            ref={carouselRef}
            // Match the next section's page bg (theme-page) so any
            // post-unstick scroll between the cards and the next heading
            // reads as ambient page color instead of a stark white block.
            className="theme-light-band relative h-[160vh] bg-[var(--theme-page)]"
          >
            {/* Sticky child sized to its content (heading + cards) with a
                little bottom breathing room — not h-screen — so there's no
                tall empty bottom dragging through the viewport when the
                sticky child unsticks and scrolls up. */}
            <div className="sticky top-0 flex flex-col overflow-hidden pt-10 pb-8">
              {/* ── Heading (stays pinned with the cards) ── */}
              <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-10">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-black/40">
                  Connected equipment
                </div>
                <h2 className="text-[clamp(2.4rem,5.5vw,5rem)] font-black uppercase leading-[0.9] tracking-normal text-black">
                  Machines
                </h2>
                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.22em] text-black/35">
                  Scroll to browse →
                </p>
              </div>

              {/* Cards sit directly below the heading (mt-8 gap, no flex-1
                  centering). On a tall viewport, the empty space ends up
                  below the cards instead of between them and the heading
                  — much less visually jarring. */}
              <div className="mt-8 overflow-hidden">
                <motion.div style={{ x: carouselX }} className="flex gap-6 pl-5 sm:pl-8 lg:pl-10">
                  {machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="w-[320px] shrink-0 sm:w-[380px] md:w-[440px] lg:w-[480px]"
                    >
                      <MachineCard machine={machine} />
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </section>
        )}

        <section className="theme-content px-5 pt-4 pb-20 sm:px-8 lg:px-10">
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

        <section className="theme-light-band bg-white px-5 py-20 text-black sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-[1680px] gap-10 lg:grid-cols-[1fr_0.55fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-black/45">
                <Microscope size={16} />
                Expert escalation
              </div>
              <h2 className="max-w-5xl text-[clamp(3.2rem,8vw,8.5rem)] font-black uppercase leading-[0.84] tracking-normal text-black">
                Keep the shift moving.
              </h2>
            </div>
            <div className="border-t border-black/20 pt-7">
              <p className="mb-7 text-base leading-8 text-black/62">
                When an issue needs human judgment, route it quickly with the machine context, symptom trail, and severity already organized.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
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
