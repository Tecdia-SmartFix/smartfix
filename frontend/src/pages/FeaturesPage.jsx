import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { PageWrapper, PublicHero, ContentShell, revealUp } from '../components/TecdiaPage';

/* ── animation ── */
/* ── flow steps ── */
const STEPS = [
  {
    number: '1',
    title: 'Instant Machine Access (IP Binding)',
    desc: 'Every workstation on your factory floor is assigned a fixed, static IP address on your local network. When a worker opens the React app on Workstation A, the backend instantly recognizes the IP address. The React frontend sees that this workstation is "bound" to a particular machine. It completely skips the Landing Page and the Machine Selection Page, and drops the worker directly into the Chat Page for that exact machine.',
  },
  {
    number: '2',
    title: 'Pick Your Role (Unrestricted IPs)',
    desc: 'For unrestricted devices (like an admin laptop or phone), there is a Landing Page at the start. When you open SmartFix, simply choose what kind of work you do — for example, hydraulics, electrical, or robotics. This lets the app show you only what matters to you.',
  },
  {
    number: '3',
    title: 'Find Your Machine',
    desc: 'If using the Landing Page flow, you\'ll see a list of machines that match your role. Browse through them and tap the one you\'re currently working on.',
  },
  {
    number: '4',
    title: 'Describe the Problem',
    desc: 'Just type what\'s wrong in plain words — no technical jargon needed. For example: "the machine keeps stopping halfway" or "there\'s a strange noise from the left side."',
  },
  {
    number: '5',
    title: 'Get a Clear Fix',
    desc: 'SmartFix reads your message and gives you a simple, step-by-step guide on what to check and how to fix it — like having an expert right beside you.',
  },
  {
    number: '6',
    title: 'Serious Issues Are Flagged',
    desc: 'If the problem sounds serious or urgent, SmartFix automatically alerts your supervisor or admin — so nothing gets overlooked and help arrives faster.',
  },
  {
    number: '7',
    title: 'Full Admin Control',
    desc: 'Admins and managers have their own dashboard where they can manage the fleet by adding or deleting machines, monitor all reported issues, and track maintenance progress to keep the whole facility running smoothly.',
  },
];

/* ── Step card ── */
const StepCard = ({ step, index }) => {
  return (
    <motion.div
      {...revealUp(index * 0.04)}
      className="grid gap-5 border-t border-black/10 py-7 md:grid-cols-[90px_1fr]"
    >
      <div className="text-4xl font-black leading-none text-transparent bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] bg-clip-text">
        {step.number.padStart(2, '0')}
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] transition hover:border-[#2b8cff]/50 md:p-8">
        <h3 className="mb-3 text-2xl font-black leading-tight tracking-normal text-black">
          {step.title}
        </h3>
        <p className="max-w-4xl text-base font-medium leading-8 text-black/62">
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
      <PublicHero
        eyebrow="Workflow"
        title="How SmartFix"
        accent="Works"
        description="A precise, workstation-aware flow for moving from machine symptoms to verified fixes and escalation."
      />
      <ContentShell>
        <div className="mx-auto max-w-5xl">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </ContentShell>

      <Footer />
    </div>
  </PageWrapper>
);

export default FeaturesPage;
