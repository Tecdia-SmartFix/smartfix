import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

/* ── animation ── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
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

/* ── flow steps ── */
const THEME_COLOR = '#00A9FF';

const STEPS = [
  {
    number: '1',
    title: 'Pick Your Role',
    desc: 'When you open SmartFix, simply choose what kind of work you do — for example, hydraulics, electrical, or robotics. This lets the app show you only what matters to you.',
  },
  {
    number: '2',
    title: 'Find Your Machine',
    desc: 'You\'ll see a list of machines that match your role. Browse through them and tap the one you\'re currently working on.',
  },
  {
    number: '3',
    title: 'Describe the Problem',
    desc: 'Just type what\'s wrong in plain words — no technical jargon needed. For example: "the machine keeps stopping halfway" or "there\'s a strange noise from the left side."',
  },
  {
    number: '4',
    title: 'Get a Clear Fix',
    desc: 'SmartFix reads your message and gives you a simple, step-by-step guide on what to check and how to fix it — like having an expert right beside you.',
  },
  {
    number: '5',
    title: 'Serious Issues Are Flagged',
    desc: 'If the problem sounds serious or urgent, SmartFix automatically alerts your supervisor or admin — so nothing gets overlooked and help arrives faster.',
  },
  {
    number: '6',
    title: 'Full Admin Control',
    desc: 'Admins and managers have their own dashboard where they can manage the fleet by adding or deleting machines, monitor all reported issues, and track maintenance progress to keep the whole facility running smoothly.',
  },
];

/* ── Step card ── */
const StepCard = ({ step, index }) => {
  return (
    <motion.div
      {...fadeUp(index * 0.05)}
      className="relative flex flex-col md:flex-row items-start gap-6 md:gap-10"
    >
      {/* Number Column */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-2"
          style={{ 
            color: THEME_COLOR, 
            borderColor: `${THEME_COLOR}40`,
            background: 'white'
          }}
        >
          {step.number}
        </div>
        {index < STEPS.length - 1 && (
          <div 
            className="w-0.5 flex-1 my-2"
            style={{ background: `${THEME_COLOR}20`, minHeight: '40px' }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-2xl p-6 md:p-8 border border-tecdia-border transition-all duration-300 hover:border-tecdia-accent/30"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h3 className="text-xl md:text-2xl font-bold text-tecdia-textDeep mb-2 leading-tight">
          {step.title}
        </h3>
        <p className="text-tecdia-text/70 leading-relaxed text-base font-medium">
          {step.desc}
        </p>
      </div>
    </motion.div>
  );
};

/* ── Page ── */
const FeaturesPage = () => (
  <PageWrapper>
    <div className="relative min-h-screen overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-tecdia-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-64 h-64 rounded-full bg-[#89CFF3]/20 blur-2xl pointer-events-none" />

      {/* ── Hero ── */}
      <section className="relative px-6 pt-36 pb-12 md:pt-48 md:pb-16 text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-tecdia-textDeep mb-4"
        >
          How <span className="text-tecdia-accent">SmartFix</span> Works
        </motion.h1>
        <motion.p
          {...fadeUp(0.08)}
          className="text-lg text-tecdia-text/60 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          A simple, step-by-step guide to reporting issues and getting fixes.
        </motion.p>
      </section>

      {/* ── Flow Steps ── */}
      <section className="relative px-6 pb-28">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  </PageWrapper>
);

export default FeaturesPage;
