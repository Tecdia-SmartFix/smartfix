# Semiconductor Design Update

This document contains **all the source files** that were changed to apply the new design, font, and font‑size rules.  
Replace the existing files in your project with the code shown here (or merge the relevant sections) and keep the rest of the application logic unchanged.

---

## 1️⃣ `tailwind.config.js`

```js
import typography from '@tailwindcss/typography';

 /** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Corporate palette
        corporate: {
          primary: '#1428A0',      // Brand Blue
          background: '#000000', // Pure black
          surface: '#ffffff',    // White surface
          text: '#000000',        // Black text
          muted: '#666666',       // Secondary text
        },
      },
      // keep existing keyframes / animations
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px #00A9FF' },
          '50%': { boxShadow: '0 0 20px #00A9FF' },
          '100%': { boxShadow: '0 0 5px #00A9FF' },
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      // Use Inter as the default sans‑serif font
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
    // keep existing utilities
    animation: {
      'gradient-x': 'gradient-x 15s ease infinite',
      'fade-in':    'fade-in 1s ease-out forwards',
      'slide-up':   'slide-up 0.5s ease-out forwards',
      'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
    },
    keyframes: {
      'gradient-x': {
        '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
        '50%':       { 'background-size': '200% 200%', 'background-position': 'right center' },
      },
      'fade-in': {
        '0%':   { opacity: '0' },
        '100%': { opacity: '1' },
      },
      'slide-up': {
        '0%':   { transform: 'translateY(20px)', opacity: '0' },
        '100%': { transform: 'translateY(0)',    opacity: '1' },
      },
    },
  },
  plugins: [typography],
}


@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
@import url('https://fonts.cdnfonts.com/css/Inter');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---------- Base ---------- */
html {
  scroll-behavior: smooth;
}

body {
  @apply antialiased transition-colors duration-500;
  font-family: 'Inter', 'Inter', sans-serif;
  margin: 0;
  min-height: 100vh;
  background-color: #ffffff;      /* white background */
  color: #000000;               /* black text */
}

/* Headings – Inter, tight tracking */
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: 'Inter', 'Inter', sans-serif;
  letter-spacing: -0.02em;
  color: #000000;
}

/* ---------- Utilities ---------- */
.font-angkor {
  font-family: "Angkor", serif;
  font-weight: 400;
  font-style: normal;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f7f7f7;
}
::-webkit-scrollbar-thumb {
  background: #cccccc;
}
::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

/* ---------- Components ---------- */

/* Flat surfaces – no glass */
.glass,
.glass-card,
.stat-pill {
  @apply p-6 border transition-all duration-300;
  background: #ffffff;
  border-color: #e0e0e0;
}
.glass-card:hover {
  background: #f7f7f7;
  border-color: #1428A0;          /* Brand Blue on hover */
  box-shadow: none;
}

/* Accent text */
.text-primary { color: #1428A0; }

/* Buttons – flat, rectangular */
.btn-primary {
  @apply font-bold transition-all duration-300 flex items-center justify-center;
  padding: 0.85rem 1.75rem;
  background: #1428A0;
  color: #ffffff;
  border: 1px solid transparent;
}
.btn-primary:hover {
  background: #0d1a73;
  box-shadow: none;
  transform: none;
}

.btn-secondary {
  @apply font-bold border transition-all duration-300 flex items-center justify-center;
  padding: 0.85rem 1.75rem;
  background: transparent;
  color: #000000;
  border-color: #000000;
}
.btn-secondary:hover {
  background: #f7f7f7;
  color: #1428A0;
  border-color: #1428A0;
  transform: none;
  box-shadow: none;
}

/* Input focus – Brand Blue outline */
.input-glow:focus-within {
  border-color: #1428A0 !important;
  box-shadow: 0 0 0 1px #1428A0 !important;
}

/* Feature card – flat white */
.feature-card {
  @apply p-7 transition-all duration-300 relative overflow-hidden;
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
}
.feature-card:hover {
  background: #ffffff;
  border-color: #1428A0;
  box-shadow: none;
  transform: none;
}

/* Custom scrollbar class */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333333;
  border-radius: 99px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #525252;
}

/* ---------- Animations ---------- */
.ingestion-stripes {
  animation: ingestion-stripes-move 1.2s linear infinite;
}
@keyframes ingestion-stripes-move {
  from { background-position: 0 0; }
  to   { background-position: 34px 0; }
}
@keyframes shimmer {
  0%   { left: -100%; }
  50%  { left: 100%; }
  100% { left: 100%; }
}
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRing {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.08); opacity: 0; }
}
@keyframes gradient-x {
  0%,100% { background-size: 200% 200%; background-position: left center; }
  50%    { background-size: 200% 200%; background-position: right center; }
}
@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes slide-up {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes float-y {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}


import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShieldCheck, LogOut } from 'lucide-react';
import EndShiftModal from './EndShiftModal';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full flex items-center justify-between transition-all duration-500 border-b ${
          scrolled
            ? 'bg-[#000000] border-[#d9d9d9] text-white'
            : 'bg-transparent border-transparent text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className={`w-9 h-9 border flex items-center justify-center transition-all duration-300 ${scrolled ? 'border-[#d9d9d9] bg-[#f7f7f7]' : 'border-white/30 bg-white/10'}`}>
              <img src="/src/assets/logo.png" alt="Tecdia" className={`w-6 h-6 object-contain ${!scrolled ? 'brightness-0 invert' : ''}`} />
            </div>
            <span className={`text-[17px] font-bold tracking-tight transition-all duration-300 hover:text-[#1428A0] ${scrolled ? 'text-white' : 'text-white'}`}>
              Tecdia <span className="text-[#1428A0]">SmartFix</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            <Link to="/features"
              className={`text-sm font-medium transition-colors duration-200 hover:text-[#1428A0] ${scrolled ? 'text-[#333333]' : 'text-white/80'}`}
            >Features</Link>

            <div className={`h-4 w-px ${scrolled ? 'bg-[#d9d9d9]' : 'bg-white/30'}`} />

            <button
              onClick={() => setIsEndShiftOpen(true)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:text-[#1428A0] ${scrolled ? 'text-[#333333]' : 'text-white/80'}`}
            >
              <LogOut size={14} /> End Shift
            </button>

            <Link
              to="/admin/login"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:text-[#1428A0] ${scrolled ? 'text-[#333333]' : 'text-white/80'}`}
            >
              <ShieldCheck size={14} /> Admin
            </Link>

            <Link to="/chat" className="btn-primary text-sm flex items-center gap-2 px-5 py-2.5">
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden w-9 h-9 flex items-center justify-center border transition-all duration-200 ${scrolled ? 'bg-[#f7f7f7] border-[#d9d9d9] text-[#333333]' : 'bg-white/10 border-white/30 text-white'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-[76px] left-4 right-4 rounded-2xl p-6 flex flex-col gap-4 bg-[#ffffff] border border-[#d9d9d9] shadow-xl"
          >
            <Link to="/features" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-[#333333]/60 hover:text-[#1428A0] transition-colors">
              Features
            </Link>

            <hr className="border-[#d9d9d9]" />

            <button
              onClick={() => { setIsMenuOpen(false); setIsEndShiftOpen(true); }}
              className="flex items-center gap-2 text-sm font-medium text-red-500/70 hover:text-red-500 transition-colors w-full text-left"
            >
              <LogOut size={14} /> End Shift
            </button>

            <Link to="/admin/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-[#1428A0]/70 hover:text-[#1428A0] transition-colors">
              <ShieldCheck size={14} /> Admin Login
            </Link>

            <Link to="/chat" onClick={() => setIsMenuOpen(false)} className="btn-primary text-center text-sm">
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <EndShiftModal isOpen={isEndShiftOpen} onClose={() => setIsEndShiftOpen(false)} />
    </nav>
  );
};

export default Navbar;


import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="w-full py-14 px-6 bg-[#ffffff] border-t border-[#d9d9d9]">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">

      {/* Brand */}
      <div className="col-span-1 md:col-span-2">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#d9d9d9] bg-[#f5f5f5]">
            <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight transition-colors hover:text-[#1428A0] text-black group-hover:text-[#1428A0]">
            Tecdia <span className="text-[#1428A0]">SmartFix</span>
          </span>
        </Link>
        <p className="text-sm leading-relaxed max-w-xs mb-6 text-black/60">
          AI-powered industrial diagnostics — select your machine, describe the issue, and get expert-level fault analysis instantly.
        </p>
        {/* Stat chips could go here */}
      </div>

      {/* Product */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Product</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li><Link to="/features" className="transition-colors duration-200 hover:text-[#1428A0]">Features</Link></li>
          <li><Link to="/integrations" className="transition-colors duration-200 hover:text-[#1428A0]">Integrations</Link></li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Support</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li><a href="mailto:smartfix@tecdia.co.jp" className="transition-colors duration-200 hover:text-[#1428A0]">smartfix@tecdia.co.jp</a></li>
          <li><a href="tel:+813XXXXXXXX" className="transition-colors duration-200 hover:text-[#1428A0]">+81-3-XXXX-XXXX</a></li>
        </ul>
      </div>

      {/* Company */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Company</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li><Link to="/cookie-policy" className="transition-colors duration-200 hover:text-[#1428A0]">Cookie Policy</Link></li>
          <li><Link to="/privacy-policy" className="transition-colors duration-200 hover:text-[#1428A0]">Privacy Policy</Link></li>
          <li><Link to="/company-policy" className="transition-colors duration-200 hover:text-[#1428A0]">Company Policy</Link></li>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="max-w-7xl mx-auto mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs border-t border-[#d9d9d9] text-black/40">
      <p>© {new Date().getFullYear()} Tecdia SmartFix. All rights reserved.</p>
      <p>Built for the future of industrial AI.</p>
    </div>
  </footer>
);

export default Footer;



/* ...imports stay the same... */

const LandingPage = () => {
  /* ...hooks remain the same... */

  return (
    <PageWrapper>
      <div className="relative overflow-hidden min-h-screen">

        {/* Hero – black background, white text */}
        <section className="relative px-6 pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden bg-black">
          {/* No glowing orbs – removed for clean corporate look */}

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Text column */}
              <div className="relative z-20">
                <motion.h1 {...fadeUp(0.05)} className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.06] mb-6">
                  <span className="text-[#000000]">Tecdia </span>
                  <span className="text-[#1428A0]">SmartFix</span>
                </motion.h1>

                <motion.p {...fadeUp(0.15)} className="text-[#333333] text-lg max-w-xl mb-10 leading-relaxed">
                  Select your machine, describe the issue, and get expert‑level fault analysis
                  in seconds — powered by industrial AI trained on real engineering data.
                </motion.p>

                <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Link to="/chat" className="btn-primary flex items-center justify-center gap-2.5 text-base px-8 py-4 shadow-lg hover:shadow-xl transition-shadow">
                    Start Diagnosing <ArrowRight size={18} />
                  </Link>
                  <Link to="/machines" className="btn-secondary flex items-center justify-center gap-2 text-base px-8 py-4">
                    View Machines <ChevronRight size={16} />
                  </Link>
                </motion.div>

                {/* Domain selector – now uses palette */}
                <motion.div {...fadeUp(0.3)} className="relative z-30 bg-[#111111] border border-[#333333] p-8 max-w-xl shadow-lg">
                  <div className="flex items-center gap-2 mb-4 text-white font-bold text-sm">
                    <Shield size={16} className="text-[#1428A0]" />
                    Select Your Expertise Domain
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXPERTISE_DOMAINS.map(domain => (
                      <button
                        key={domain}
                        type="button"
                        onClick={async () => {
                          const result = await login(domain);
                          if (!result.success) alert(result.error);
                        }}
                        className={`text-xs py-3 px-4 border transition-all cursor-pointer font-semibold tracking-wide ${
                          user.domain === domain
                            ? 'bg-[#1428A0] text-white border-[#1428A0]'
                            : 'bg-[#000000] text-[#a3a3a3] border-[#333333] hover:border-[#1428A0] hover:text-white'
                        }`}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[10px] text-[#666666]/40 leading-relaxed italic">
                    Select your domain to access relevant machine diagnostics. Sessions last 12 hours.
                  </p>
                </motion.div>
              </div>

              {/* Right column – keep robot video and chat preview but with new background colors */}
              <motion.div {...fadeUp(0.2)} className="hidden lg:flex items-center justify-end relative">
                <div className="relative w-[260px] h-[260px] -mr-12 z-20 pointer-events-none drop-shadow-2xl translate-y-4">
                  <ChromaKeyVideo src="/src/assets/robot.webm" width={260} height={260} className="relative" />
                </div>

                <div className="relative z-10 w-full max-w-[420px]">
                  <ChatPreview />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Support Section – white background, black text, blue accents */}
        <section className="relative px-6 py-20 bg-[#f7f7f7] border-t border-[#e0e0e0]">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 {...fadeUp(0)} className="text-3xl md:text-4xl font-bold text-[#000000] mb-4">
              Expert <span className="text-[#1428A0]">Technician Support</span>
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-[#333333] leading-relaxed max-w-2xl mx-auto mb-12">
              Facing a complex issue? Our expert engineers are here to help you get back to peak productivity. Reach out directly for specialized machine diagnostics and technical assistance.
            </motion.p>

            <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ffffff] border border-[#e0e0e0] text-[#1428A0] flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#757575] uppercase tracking-widest mb-0.5">Email Support</p>
                  <a href="mailto:smartfix@tecdia.co.jp" className="text-sm font-bold text-[#000000] hover:text-[#1428A0] transition-colors">
                    smartfix@tecdia.co.jp
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ffffff] border border-[#e0e0e0] text-[#1428A0] flex items-center justify-center">
                  <Phone size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#757755] uppercase tracking-widest mb-0.5">Technician Hotline</p>
                  <a href="tel:+813XXXXXXXX" className="text-sm font-bold text-[#000000] hover:text-[#1428A0] transition-colors">
                    +81-3-XXXX-XXXX
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default LandingPage;
