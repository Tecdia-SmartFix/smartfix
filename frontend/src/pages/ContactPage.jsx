import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import Footer from '../components/Footer';
import { PageWrapper, PublicHero, ContentShell } from '../components/TecdiaPage';

const CONTACT_ITEMS = [
  {
    icon: Mail,
    label: 'Email Support',
    value: 'smartfix@tecdia.co.jp',
    href: 'mailto:smartfix@tecdia.co.jp',
    body: 'Use for diagnostic support, rollout questions, and production-floor SmartFix access.',
  },
  {
    icon: Phone,
    label: 'Technician Hotline',
    value: '+81-3-XXXX-XXXX',
    href: 'tel:+813XXXXXXXX',
    body: 'Escalate urgent maintenance issues that need human engineering review.',
  },
  {
    icon: MapPin,
    label: 'Office',
    value: 'Tokyo, Japan',
    body: 'Tecdia precision manufacturing and technical support coordination.',
  },
];

const ContactPage = () => (
  <PageWrapper>
    <div className="min-h-screen">
      <PublicHero
        eyebrow="Support"
        title="Contact"
        accent="Tecdia"
        description="Route machine issues, SmartFix questions, and technical escalation requests to the right team."
      />
      <ContentShell>
        <div className="grid gap-5 md:grid-cols-3">
          {CONTACT_ITEMS.map(({ icon: Icon, label, value, href, body }) => {
            const content = (
              <>
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2b8cff]/20 bg-gradient-to-br from-[#2b8cff]/16 to-[#10b9d2]/10 text-[#079fba]">
                  <Icon size={22} />
                </div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-black/42">{label}</div>
                <h2 className="mb-4 break-words text-2xl font-black tracking-normal text-black">{value}</h2>
                <p className="text-sm leading-7 text-black/58">{body}</p>
              </>
            );

            return href ? (
              <a
                key={label}
                href={href}
                className="rounded-2xl border border-black/10 bg-white p-7 shadow-[0_18px_60px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-[#2b8cff]/50"
              >
                {content}
              </a>
            ) : (
              <article key={label} className="rounded-2xl border border-black/10 bg-white p-7 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
                {content}
              </article>
            );
          })}
        </div>
      </ContentShell>
      <Footer />
    </div>
  </PageWrapper>
);

export default ContactPage;
