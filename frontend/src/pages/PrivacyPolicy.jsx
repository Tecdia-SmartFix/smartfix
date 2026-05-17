import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const PrivacyPolicy = () => (
  <div className="relative min-h-screen bg-tecdia-background flex flex-col">
    <div className="relative z-10 flex-grow">
      {/* Header */}
      <header className="px-6 pt-36 pb-16 text-center max-w-4xl mx-auto">
        <motion.h1 {...fadeUp(0)} className="text-4xl md:text-5xl font-bold text-black mb-4">
          Privacy Policy — <span className="text-tecdia-accent">SmartFix</span>
        </motion.h1>
        <motion.p {...fadeUp(0.1)} className="text-sm text-black/50 font-medium">
          Last updated: 17 May 2026
        </motion.p>
      </header>

      {/* Content */}
      <main className="px-6 pb-32 max-w-4xl mx-auto">
        <motion.div {...fadeUp(0.2)} className="text-black space-y-12">

          {/* Operator Info */}
          <section className="bg-white/60 border border-tecdia-border p-8 rounded-3xl shadow-sm">
            <p className="leading-relaxed font-medium">
              <strong>Operator:</strong> Tecdia, Tokyo, Japan
            </p>
            <p className="leading-relaxed mt-2 font-medium">
              <strong>Contact:</strong>{' '}
              <a href="mailto:privacy@yourcompany.com" className="text-black hover:text-tecdia-accent transition-colors font-bold underline decoration-black/30 underline-offset-4">
                privacy@yourcompany.com
              </a>
            </p>
          </section>

          {/* Intro */}
          <section>
            <p className="leading-relaxed font-medium">
              This policy explains what information SmartFix collects when you use it, why, how long we keep it, and who else sees it.
              SmartFix is an internal troubleshooting assistant for Tecdia's shop-floor machinery. It is not a public consumer product.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 1. Who this applies to */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">1. Who this applies to</h2>
            <ul className="space-y-3">
              <li className="leading-relaxed">
                <strong>Workers</strong> — shop-floor technicians who sign in at a workstation and ask the assistant questions.
              </li>
              <li className="leading-relaxed">
                <strong>Admins</strong> — staff who sign in to the admin dashboard to manage manuals, view analytics, and receive alerts.
              </li>
            </ul>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 2. What we collect */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">2. What we collect</h2>

            <h3 className="text-xl font-bold text-black mb-3 mt-6">From workers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Worker name or ID that you enter at sign-in.</li>
              <li>Workstation network address (IP), used to identify which physical machine you are working on.</li>
              <li>Your chat messages and the assistant's replies, including timestamps.</li>
              <li>Severity tag the assistant assigns to each answer (info / minor / degraded / production impact / safety).</li>
              <li>A session cookie that keeps you signed in on that workstation.</li>
            </ul>

            <h3 className="text-xl font-bold text-black mb-3 mt-8">From admins</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address (used for magic-link sign-in via Resend).</li>
              <li>A session cookie that keeps you signed in to the admin dashboard.</li>
              <li>Audit data: manuals you upload, machines you create or edit, alerts you view.</li>
            </ul>

            <h3 className="text-xl font-bold text-black mb-3 mt-8">Automatic / technical</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Standard server logs (request paths, response codes, timestamps, IP). Used only for debugging and security monitoring.</li>
            </ul>

            <p className="leading-relaxed mt-6 p-4 bg-white/50 rounded-xl border border-tecdia-border italic text-sm font-medium">
              We do not collect government IDs, payroll data, biometrics, location beyond the workstation IP, or any data from your personal devices.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 3. Why we collect it */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">3. Why we collect it</h2>
            <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-tecdia-accent/10">
                  <tr>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Data</th>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tecdia-border">
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Worker name + IP</td>
                    <td className="px-6 py-5">Identify who is asking from which machine, so answers come from the right manual</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Chat messages</td>
                    <td className="px-6 py-5">Generate troubleshooting answers; show your chat history; improve the assistant</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Severity tags</td>
                    <td className="px-6 py-5">Trigger admin alerts for serious faults; populate the analytics dashboard</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Admin email</td>
                    <td className="px-6 py-5">Magic-link sign-in; send alert notifications</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Cookies</td>
                    <td className="px-6 py-5">Keep you signed in for the duration of your shift / admin session</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Server logs</td>
                    <td className="px-6 py-5">Detect abuse, debug outages</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="leading-relaxed mt-6 font-bold text-black text-lg">
              We do not use any of this data for advertising, profiling, or selling to third parties.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 4. Third parties */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">4. Third parties</h2>
            <p className="leading-relaxed mb-4">
              SmartFix relies on the following services. Your data is transmitted to them only as needed to deliver the feature:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Groq</strong> (groq.com) — receives the text of your question and the relevant manual excerpts, so the LLM can generate an answer.
                Groq's privacy policy applies.
              </li>
              <li>
                <strong>Resend</strong> (resend.com) — receives admin email addresses to deliver magic-link sign-in emails and alert notifications.
                Resend's privacy policy applies.
              </li>
              <li>
                <strong>Hosting provider</strong> — operates the servers where SmartFix runs.
              </li>
            </ul>
            <p className="leading-relaxed mt-4 font-medium">
              We do not share data with anyone else.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 5. How long we keep it */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">5. How long we keep it</h2>
            <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-tecdia-accent/10">
                  <tr>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Data</th>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tecdia-border">
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Chat history</td>
                    <td className="px-6 py-5">90 days, then deleted</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Worker session cookies</td>
                    <td className="px-6 py-5">Expire when the browser is closed, or after 8 hours</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Admin session cookies</td>
                    <td className="px-6 py-5">7 days</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Admin alert log</td>
                    <td className="px-6 py-5">12 months</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Server logs</td>
                    <td className="px-6 py-5">30 days</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Uploaded manuals + indexed chunks</td>
                    <td className="px-6 py-5">Kept until removed by an admin</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 6. Security */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">6. Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sign-in cookies are HTTP-only.</li>
              <li>Admin sign-in uses single-use magic links that expire in 15 minutes.</li>
              <li>The vector database and chat history are stored on Tecdia-controlled infrastructure.</li>
              <li>API keys (Groq, Resend) are stored as server-side secrets, not exposed to the browser.</li>
            </ul>
            <p className="leading-relaxed mt-6 p-4 bg-white/50 rounded-xl border border-tecdia-border italic text-sm font-medium">
              No system is perfect — if you suspect a security issue, report it to{' '}
              <a href="mailto:security@yourcompany.com" className="text-black hover:text-tecdia-accent transition-colors font-bold underline decoration-black/30 underline-offset-4">
                security@yourcompany.com
              </a>.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 7. Your rights */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">7. Your rights</h2>
            <p className="leading-relaxed mb-4">
              If you are a worker or admin whose data is in SmartFix, you can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ask what we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your chat history or admin account.</li>
              <li>Withdraw consent by signing out and asking an admin to delete your records.</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Email{' '}
              <a href="mailto:privacy@yourcompany.com" className="text-black hover:text-tecdia-accent transition-colors font-bold underline decoration-black/30 underline-offset-4">
                privacy@yourcompany.com
              </a>{' '}
              and we will respond within 30 days.
            </p>
            <p className="leading-relaxed mt-4 font-medium">
              Depending on where you work, you may also have rights under GDPR, UK GDPR, CCPA, India DPDP Act, or other local laws.
              Those rights apply on top of what is listed above.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 8. Children */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">8. Children</h2>
            <p className="leading-relaxed">
              SmartFix is an internal workplace tool. It is not intended for, and not knowingly used by, anyone under 18.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 9. Changes to this policy */}
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">9. Changes to this policy</h2>
            <p className="leading-relaxed">
              We may update this policy as the product evolves. Material changes will be announced internally at least 14 days before they take effect.
              The "Last updated" date at the top always reflects the current version.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          {/* 10. Contact */}
          <section className="bg-white/60 border border-tecdia-border p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold text-black mb-4">10. Contact</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-black">Privacy:</span>
                <a href="mailto:privacy@yourcompany.com" className="text-black hover:text-tecdia-accent transition-colors font-bold underline decoration-black/30 underline-offset-4">
                  privacy@yourcompany.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-black">Security:</span>
                <a href="mailto:security@yourcompany.com" className="text-black hover:text-tecdia-accent transition-colors font-bold underline decoration-black/30 underline-offset-4">
                  security@yourcompany.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-black">Operator:</span>
                <span className="text-black font-bold">Tecdia, Tokyo, Japan</span>
              </div>
            </div>
          </section>

        </motion.div>
      </main>
    </div>

    <Footer />
  </div>
);

export default PrivacyPolicy;
