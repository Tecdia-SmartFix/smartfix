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

/* ── policy items ── */
const THEME_COLOR = '#00A9FF';

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
          {policy.number}
        </div>
        {index < POLICIES.length - 1 && (
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
          {policy.title}
        </h3>
        <p className="text-tecdia-text/70 leading-relaxed text-base font-medium">
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

      {/* Background Blobs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-tecdia-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-64 h-64 rounded-full bg-[#89CFF3]/20 blur-2xl pointer-events-none" />

      {/* ── Hero ── */}
      <section className="relative px-6 pt-36 pb-12 md:pt-48 md:pb-16 text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-tecdia-textDeep mb-4"
        >
          Company <span className="text-tecdia-accent">Policy</span>
        </motion.h1>
        <motion.p
          {...fadeUp(0.08)}
          className="text-lg text-tecdia-text/60 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          Our guiding principles for ethical business conduct and corporate responsibility.
        </motion.p>
      </section>

      {/* ── Policy Cards ── */}
      <section className="relative px-6 pb-28">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {POLICIES.map((policy, i) => (
            <PolicyCard key={policy.number} policy={policy} index={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  </PageWrapper>
);

export default CompanyPolicy;
