import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const CookiePolicy = () => (
  <div className="relative min-h-screen bg-tecdia-background flex flex-col">
    <div className="relative z-10 flex-grow">
      {/* Header */}
      <header className="px-6 pt-36 pb-16 text-center max-w-4xl mx-auto">
        <motion.h1 {...fadeUp(0)} className="text-4xl md:text-5xl font-bold text-black mb-4">
          Cookie Policy
        </motion.h1>
      </header>

      {/* Content */}
      <main className="px-6 pb-32 max-w-4xl mx-auto">
        <motion.div {...fadeUp(0.2)} className="text-black space-y-12">
          
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              This Cookie Policy explains how SmartFix uses cookies and similar technologies when users and visitors access our website and use our machine troubleshooting assistant.
            </p>
            <p className="leading-relaxed mt-4">
              This policy should be read together with our Privacy Policy and Terms of Service.
            </p>
            <p className="leading-relaxed mt-4">
              By continuing to use SmartFix, users consent to the use of cookies and related technologies as described in this policy. Users may withdraw consent at any time through browser settings or through the cookie preferences banner available on the website.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">2. What Are Cookies?</h2>
            <p className="leading-relaxed">
              Cookies are small text files stored on a user’s device when visiting a website. They help websites recognize devices, remember preferences, maintain secure sessions, and improve overall user experience.
            </p>
            <p className="leading-relaxed mt-4 mb-2 font-bold text-black text-lg">SmartFix may also use similar technologies including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Local Storage</li>
              <li>Session Storage</li>
              <li>IndexedDB</li>
            </ul>
            <p className="leading-relaxed mt-4">These technologies function similarly to cookies and help support platform functionality and performance.</p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">3. How We Use Cookies</h2>
            <p className="leading-relaxed mb-4">SmartFix uses cookies and related technologies to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep authorized users signed in securely</li>
              <li>Remember selected machines, language preferences, and user interface settings</li>
              <li>Maintain active troubleshooting chat sessions</li>
              <li>Protect the platform against security threats, abuse, and unauthorized access</li>
              <li>Analyze anonymized usage data to improve platform performance and troubleshooting quality</li>
            </ul>
            <p className="leading-relaxed mt-6 font-bold text-black text-lg">
              SmartFix does not use cookies for advertising, cross-site tracking, or selling user data to third parties.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">4. Types of Cookies We Use</h2>
            <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-tecdia-accent/10">
                  <tr>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Category</th>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Purpose</th>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tecdia-border">
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Strictly Necessary</td>
                    <td className="px-6 py-5">Required for website functionality, authentication, session management, and security protection.</td>
                    <td className="px-6 py-5 whitespace-nowrap">Session / up to 30 days</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Functional</td>
                    <td className="px-6 py-5">Stores user preferences such as selected machine, language, and UI settings.</td>
                    <td className="px-6 py-5 whitespace-nowrap">Up to 12 months</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Analytics</td>
                    <td className="px-6 py-5">Helps improve platform performance through anonymized usage analytics and performance monitoring.</td>
                    <td className="px-6 py-5 whitespace-nowrap">Up to 12 months</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm font-bold text-black/60">
              Note: Strictly Necessary cookies cannot be disabled because essential platform features such as login access and chatbot functionality depend on them.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">5. Third-Party Services</h2>
            <p className="leading-relaxed mb-4">
              Some SmartFix platform features rely on trusted third-party services that may process limited technical information on our behalf.
            </p>
            <p className="leading-relaxed mb-4 font-bold text-black text-lg">These services may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Groq</strong> — AI inference and troubleshooting response generation</li>
              <li><strong>Hosting/CDN Providers</strong> — Website delivery, system reliability, performance optimization, and security protection</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Information shared with third-party providers is limited to what is necessary for operating and maintaining the service securely and efficiently.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">6. Managing Your Cookies</h2>
            <p className="leading-relaxed mb-6 font-bold text-black text-lg">Users may manage or disable cookies through the following methods:</p>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Cookie Preferences</h3>
                <p className="leading-relaxed font-medium">Cookie settings can be adjusted through the cookie banner or the “Cookie Settings” option available on the website.</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-black mb-2">Browser Settings</h3>
                <p className="leading-relaxed mb-2 font-medium">Most browsers allow users to block, manage, or delete cookies through browser settings. Supported browsers may include:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Google Chrome</li>
                  <li>Mozilla Firefox</li>
                  <li>Safari</li>
                  <li>Microsoft Edge</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-black mb-2">Do Not Track (DNT)</h3>
                <p className="leading-relaxed font-medium">Where technically feasible, SmartFix respects browser-based “Do Not Track” signals.</p>
              </div>
            </div>

            <p className="leading-relaxed mt-8 p-4 bg-white/50 rounded-xl border border-tecdia-border italic text-sm font-medium">
              Please note that disabling cookies may affect website functionality, including login sessions, saved preferences, and chatbot accessibility.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">7. Changes to This Policy</h2>
            <p className="leading-relaxed">
              SmartFix may update this Cookie Policy periodically to reflect changes in technology, regulations, or platform functionality.
            </p>
            <p className="leading-relaxed mt-4">
              The “Last Updated” date at the top of this page will indicate the latest version of the policy. Significant updates may also be communicated through the website.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section className="bg-white/60 border border-tecdia-border p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold text-black mb-4">8. Contact Us</h2>
            <p className="leading-relaxed mb-6 font-medium">If users have any questions regarding this Cookie Policy or the use of cookies and related technologies, please contact us:</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-black">Email:</span>
                <a href="mailto:support@tecdia.com" className="text-black hover:text-black transition-colors font-bold underline decoration-black/30 underline-offset-4">support@tecdia.com</a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-black">Address:</span>
                <span className="text-black font-bold">Tecdia Inc., Morgan Hill, CA, USA</span>
              </div>
            </div>
          </section>

        </motion.div>
      </main>
    </div>

    <Footer />
  </div>
);

export default CookiePolicy;
