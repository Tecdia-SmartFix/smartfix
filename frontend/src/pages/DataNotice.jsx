import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { PublicHero, ContentShell } from '../components/TecdiaPage';

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

const THEME_COLOR = '#2b8cff';

/* ── section data ── */
const SECTIONS = [
  {
    number: '01',
    title: 'Who this applies to',
    content: (
      <ul className="space-y-3">
        <li className="leading-relaxed">
          <strong>Workers</strong> — shop-floor technicians who sign in at a workstation and ask the assistant questions.
        </li>
        <li className="leading-relaxed">
          <strong>Admins</strong> — staff who sign in to the admin dashboard to manage manuals, view analytics, and receive alerts.
        </li>
      </ul>
    ),
  },
  {
    number: '02',
    title: 'What we collect',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-bold text-tecdia-textDeep mb-2">From workers</h4>
          <ul className="list-disc pl-6 space-y-1.5 text-tecdia-text/70">
            <li>Worker name or ID that you enter at sign-in.</li>
            <li>Workstation network address (IP), used to identify which physical machine you are working on.</li>
            <li>Your chat messages and the assistant's replies, including timestamps.</li>
            <li>Severity tag the assistant assigns to each answer (info / minor / degraded / production impact / safety).</li>
            <li>A session cookie that keeps you signed in on that workstation.</li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold text-tecdia-textDeep mb-2">From admins</h4>
          <ul className="list-disc pl-6 space-y-1.5 text-tecdia-text/70">
            <li>Email address (used for magic-link sign-in via Resend).</li>
            <li>A session cookie that keeps you signed in to the admin dashboard.</li>
            <li>Audit data: manuals you upload, machines you create or edit, alerts you view.</li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold text-tecdia-textDeep mb-2">Automatic / technical</h4>
          <ul className="list-disc pl-6 space-y-1.5 text-tecdia-text/70">
            <li>Standard server logs (request paths, response codes, timestamps, IP). Used only for debugging and security monitoring.</li>
          </ul>
        </div>
        <p className="text-sm italic text-tecdia-text/50 bg-white/60 border border-tecdia-border rounded-xl p-4">
          We do not collect government IDs, payroll data, biometrics, location beyond the workstation IP, or any data from your personal devices.
        </p>
      </div>
    ),
  },
  {
    number: '03',
    title: 'Why we collect it',
    content: (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead style={{ background: `${THEME_COLOR}10` }}>
              <tr>
                <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Data</th>
                <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tecdia-border text-tecdia-text/70">
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Worker name + IP</td><td className="px-5 py-4">Identify who is asking from which machine, so answers come from the right manual</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Chat messages</td><td className="px-5 py-4">Generate troubleshooting answers; show your chat history; improve the assistant</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Severity tags</td><td className="px-5 py-4">Trigger admin alerts for serious faults; populate the analytics dashboard</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Admin email</td><td className="px-5 py-4">Magic-link sign-in; send alert notifications</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Cookies</td><td className="px-5 py-4">Keep you signed in for the duration of your shift / admin session</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Server logs</td><td className="px-5 py-4">Detect abuse, debug outages</td></tr>
            </tbody>
          </table>
        </div>
        <p className="font-bold text-tecdia-textDeep">
          We do not use any of this data for advertising, profiling, or selling to third parties.
        </p>
      </div>
    ),
  },
  {
    number: '04',
    title: 'Third parties',
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-tecdia-text/70">
          SmartFix relies on the following services. Your data is transmitted to them only as needed to deliver the feature:
        </p>
        <ul className="space-y-3">
          <li className="bg-white/60 border border-tecdia-border rounded-xl p-4">
            <strong className="text-tecdia-textDeep">Groq</strong> <span className="text-tecdia-text/50">(groq.com)</span> — receives the text of your question and the relevant manual excerpts, so the LLM can generate an answer. Groq's privacy policy applies.
          </li>
          <li className="bg-white/60 border border-tecdia-border rounded-xl p-4">
            <strong className="text-tecdia-textDeep">Resend</strong> <span className="text-tecdia-text/50">(resend.com)</span> — receives admin email addresses to deliver magic-link sign-in emails and alert notifications. Resend's privacy policy applies.
          </li>
          <li className="bg-white/60 border border-tecdia-border rounded-xl p-4">
            <strong className="text-tecdia-textDeep">Hosting provider</strong> — operates the servers where SmartFix runs.
          </li>
        </ul>
        <p className="font-medium text-tecdia-text/70">We do not share data with anyone else.</p>
      </div>
    ),
  },
  {
    number: '05',
    title: 'How long we keep it',
    content: (
      <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead style={{ background: `${THEME_COLOR}10` }}>
            <tr>
              <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Data</th>
              <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Retention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tecdia-border text-tecdia-text/70">
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Chat history</td><td className="px-5 py-4">90 days, then deleted</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Worker session cookies</td><td className="px-5 py-4">Expire when the browser is closed, or after 8 hours</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Admin session cookies</td><td className="px-5 py-4">7 days</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Admin alert log</td><td className="px-5 py-4">12 months</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Server logs</td><td className="px-5 py-4">30 days</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Uploaded manuals + indexed chunks</td><td className="px-5 py-4">Kept until removed by an admin</td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    number: '06',
    title: 'Security',
    content: (
      <div className="space-y-4">
        <ul className="list-disc pl-6 space-y-2 text-tecdia-text/70">
          <li>Sign-in cookies are HTTP-only.</li>
          <li>Admin sign-in uses single-use magic links that expire in 15 minutes.</li>
          <li>The vector database and chat history are stored on Tecdia-controlled infrastructure.</li>
          <li>API keys (Groq, Resend) are stored as server-side secrets, not exposed to the browser.</li>
        </ul>
        <p className="text-sm italic text-tecdia-text/50 bg-white/60 border border-tecdia-border rounded-xl p-4">
          No system is perfect — if you suspect a security issue, report it to{' '}
          <a href="mailto:security@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold not-italic">
            security@yourcompany.com
          </a>.
        </p>
      </div>
    ),
  },
  {
    number: '07',
    title: 'Your rights',
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-tecdia-text/70">If you are a worker or admin whose data is in SmartFix, you can:</p>
        <ul className="list-disc pl-6 space-y-2 text-tecdia-text/70">
          <li>Ask what we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your chat history or admin account.</li>
          <li>Withdraw consent by signing out and asking an admin to delete your records.</li>
        </ul>
        <p className="leading-relaxed text-tecdia-text/70">
          Email{' '}
          <a href="mailto:privacy@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">
            privacy@yourcompany.com
          </a>{' '}
          and we will respond within 30 days.
        </p>
        <p className="leading-relaxed font-medium text-tecdia-text/70">
          Depending on where you work, you may also have rights under GDPR, UK GDPR, CCPA, India DPDP Act, or other local laws. Those rights apply on top of what is listed above.
        </p>
      </div>
    ),
  },
  {
    number: '08',
    title: 'Children',
    content: (
      <p className="leading-relaxed text-tecdia-text/70">
        SmartFix is an internal workplace tool. It is not intended for, and not knowingly used by, anyone under 18.
      </p>
    ),
  },
  {
    number: '09',
    title: 'Changes to this policy',
    content: (
      <p className="leading-relaxed text-tecdia-text/70">
        We may update this policy as the product evolves. Material changes will be announced internally at least 14 days before they take effect. The "Last updated" date at the top always reflects the current version.
      </p>
    ),
  },
  {
    number: '10',
    title: 'Contact',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-tecdia-textDeep">Privacy:</span>
          <a href="mailto:privacy@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">privacy@yourcompany.com</a>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-tecdia-textDeep">Security:</span>
          <a href="mailto:security@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">security@yourcompany.com</a>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-bold text-tecdia-textDeep">Operator:</span>
          <span className="font-semibold text-tecdia-text/70">Tecdia, Tokyo, Japan</span>
        </div>
      </div>
    ),
  },
];

/* ── Section card ── */
const SectionCard = ({ section, index }) => (
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
          background: 'white',
        }}
      >
        {section.number}
      </div>
      {index < SECTIONS.length - 1 && (
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
      <h3 className="text-xl md:text-2xl font-bold text-tecdia-textDeep mb-3 leading-tight">
        {section.title}
      </h3>
      <div className="text-base font-medium">{section.content}</div>
    </div>
  </motion.div>
);

/* ── Page ── */
const PrivacyPolicy = () => (
  <PageWrapper>
    <div className="relative min-h-screen overflow-hidden">

      <PublicHero
        eyebrow="Data notice"
        title="Privacy"
        accent="Policy"
        description="How SmartFix handles production support data: transparent, minimal, and focused on secure troubleshooting."
      />

      {/* ── Operator Badge ── */}
      <section className="relative px-5 pt-12 pb-8 sm:px-8 lg:px-10">
        <motion.div
          {...fadeUp(0.12)}
          className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-tecdia-text/60 font-medium bg-white/50 border border-tecdia-border rounded-2xl px-8 py-5"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <span><strong className="text-tecdia-textDeep">Operator:</strong> Tecdia, Tokyo, Japan</span>
          <span className="hidden sm:inline text-tecdia-border">|</span>
          <span><strong className="text-tecdia-textDeep">Contact:</strong>{' '}
            <a href="mailto:privacy@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">privacy@yourcompany.com</a>
          </span>
          <span className="hidden sm:inline text-tecdia-border">|</span>
          <span><strong className="text-tecdia-textDeep">Last updated:</strong> 17 May 2026</span>
        </motion.div>
      </section>

      {/* ── Intro ── */}
      <section className="relative px-5 pb-8 sm:px-8 lg:px-10">
        <motion.p
          {...fadeUp(0.15)}
          className="max-w-3xl mx-auto text-center text-tecdia-text/60 leading-relaxed font-medium"
        >
          This policy explains what information SmartFix collects when you use it, why, how long we keep it, and who else sees it.
          SmartFix is an internal troubleshooting assistant for Tecdia's shop-floor machinery. It is not a public consumer product.
        </motion.p>
      </section>

      {/* ── Section Cards ── */}
      <ContentShell className="pt-0">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {SECTIONS.map((section, i) => (
            <SectionCard key={section.number} section={section} index={i} />
          ))}
        </div>
      </ContentShell>

      <Footer />
    </div>
  </PageWrapper>
);

export default PrivacyPolicy;
