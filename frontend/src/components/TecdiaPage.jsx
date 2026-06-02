import React from 'react';
import { motion } from 'framer-motion';

export const pageFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: 'easeInOut' },
};

export const revealUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

export const PageWrapper = ({ children, className = '' }) => (
  <motion.div {...pageFade} className={`theme-page min-h-screen bg-[#eef1ef] text-black ${className}`}>
    {children}
  </motion.div>
);

export const PublicHero = ({ eyebrow, title, accent, description, align = 'left', children }) => (
  <section className="theme-public-hero relative overflow-hidden bg-black px-5 pb-14 pt-32 text-white sm:px-8 lg:px-10 lg:pb-18 lg:pt-36">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(7,159,186,0.42),transparent_30%),linear-gradient(135deg,#050505_0%,#111_48%,#041f27_100%)]" />
    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#10b9d2]/70 to-transparent" />
    <div className={`relative z-10 mx-auto flex max-w-[1680px] flex-col gap-10 ${align === 'center' ? 'items-center text-center' : ''}`}>
      <div className={`grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end ${align === 'center' ? 'lg:grid-cols-1' : ''}`}>
        <div>
          {eyebrow && (
            <div className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-[#6dd6e6]">
              {eyebrow}
            </div>
          )}
          <h1 className="max-w-5xl text-[clamp(3.4rem,8vw,8.75rem)] font-black uppercase leading-[0.88] tracking-normal text-white">
            {title}
            {accent && <span className="block"><span className="inline-block pr-2 bg-gradient-to-r from-[#30c7df] to-[#2b8cff] bg-clip-text text-transparent">{accent}</span></span>}
          </h1>
        </div>
        {description && (
          <p className="max-w-xl border-t border-white/16 pt-6 text-base leading-8 text-white/66 lg:justify-self-end">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  </section>
);

export const ContentShell = ({ children, className = '' }) => (
  <section className={`theme-content px-5 py-16 sm:px-8 lg:px-10 ${className}`}>
    <div className="mx-auto max-w-[1680px]">{children}</div>
  </section>
);

export const BlueRule = ({ className = '' }) => (
  <div className={`h-px w-full bg-gradient-to-r from-transparent via-[#10b9d2]/60 to-transparent ${className}`} />
);
