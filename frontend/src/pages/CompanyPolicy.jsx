import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { PageWrapper, PublicHero, ContentShell, revealUp } from '../components/TecdiaPage';

/* ── animation ── */
/* ── policy items ── */
const POLICIES = [
  {
    number: '01',
    title: 'Legal Compliance',
    desc: 'We take pride and awareness as employees of Tecdia and not only comply with laws and regulations and work rules, but also act as business people based on corporate ethics and strive to earn the trust of society.',
  },
  {
    number: '02',
    title: 'Social Contribution',
    desc: 'Through our business activities, we will solve social problems and customer problems, work to realize a better society, and contribute to the innovation and revitalization of society as a whole.',
  },
  {
    number: '03',
    title: 'Environmental Protection',
    desc: 'Our company is dedicated to creating a prosperous society and protecting the environment through our sustainable business practices. We develop products with excellent performance that are environmentally friendly, and work to eliminate wastefulness and inequality in the daily work of each of our employees. We also strive to conserve resources and energy, and aim to create a workplace that is environmentally friendly.',
  },
  {
    number: '04',
    title: 'Trust in Customers',
    desc: 'We are dedicated to providing safe products, with quality services, and information that meets and exceeds our customers expectations and earns their trust.',
  },
  {
    number: '05',
    title: 'Relationship of Trust with Business Partners',
    desc: 'We will promote transactions that consider mutual prosperity with our business partners, build transparent, fair and sound relationships of trust, and strive not to build relationships that are biased toward specific business partners.',
  },
  {
    number: '06',
    title: 'Maintaining a Healthy Working Environment',
    desc: 'In order to create a comfortable workplace, we will create a safe and comfortable working environment where all employees can work with peace of mind and work efficiently.',
  },
  {
    number: '07',
    title: 'Restrictions on Entertainment and Gifts',
    desc: 'We will not engage in any acts that deviate from general business customs regarding entertainment and the giving and receiving of gifts, including bribery.',
  },
  {
    number: '08',
    title: 'Dealing with Antisocial Forces',
    desc: 'We have nothing to do with antisocial forces that threaten social order and security, and we take a resolute attitude to deal with unreasonable demands.',
  },
  {
    number: '09',
    title: 'Conservation of Company Assets',
    desc: 'We will record the necessary assets of the company (whether tangible or intangible assets such as inventory, equipment, equipment, information, etc.) and manage them appropriately.',
  },
  {
    number: '10',
    title: 'Management of Confidential Information',
    desc: 'We manage all information, both internally and externally, as confidential information according to its importance, and strictly adhere to all privacy and security protocols.',
  },
  {
    number: '11',
    title: 'Prohibition of Individual Actions that Conflict with the Interests of the Company',
    desc: 'We do not accept any personal act that may adversely affect the business activities of Tecdia.',
  },
];

/* ── Policy card ── */
const PolicyCard = ({ policy, index }) => {
  return (
    <motion.div
      {...revealUp(index * 0.035)}
      className="grid gap-5 border-t border-black/10 py-7 md:grid-cols-[96px_1fr]"
    >
      <div className="text-4xl font-black leading-none text-transparent bg-gradient-to-r from-[#2b8cff] to-[#10b9d2] bg-clip-text">
        {policy.number}
      </div>
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] transition hover:border-[#2b8cff]/50 md:p-8">
        <h3 className="mb-3 text-2xl font-black leading-tight tracking-normal text-black">
          {policy.title}
        </h3>
        <p className="max-w-4xl text-base font-medium leading-8 text-black/62">
          {policy.desc}
        </p>
      </div>
    </motion.div>
  );
};

/* ── Page ── */
const CompanyPolicy = () => (
  <PageWrapper>
    <div className="relative min-h-screen overflow-hidden">
      <PublicHero
        eyebrow="Governance"
        title="Company"
        accent="Policy"
        description="Tecdia operating principles for ethical conduct, responsible production, and trusted customer relationships."
      />
      <ContentShell>
        <div className="mx-auto max-w-5xl">
          {POLICIES.map((policy, i) => (
            <PolicyCard key={policy.number} policy={policy} index={i} />
          ))}
        </div>
      </ContentShell>

      <Footer />
    </div>
  </PageWrapper>
);

export default CompanyPolicy;
