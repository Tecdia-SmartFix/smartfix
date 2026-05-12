import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShieldCheck } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
            ? 'bg-white/90 backdrop-blur-xl border-tecdia-border shadow-sm'
            : 'bg-white/40 backdrop-blur-md border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-tecdia-border bg-tecdia-surface transition-all duration-300 group-hover:scale-105">
              <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-tecdia-textDeep transition-all duration-300 group-hover:text-tecdia-accent">
              Tecdia <span className="text-tecdia-accent">SmartFix</span>
            </span>
          </Link>
  
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            <Link to="/features"
              className="text-sm font-medium text-tecdia-text/60 hover:text-tecdia-accent transition-colors duration-200"
            >Features</Link>
  
            <div className="h-4 w-px bg-tecdia-border" />
  
            <Link to="/admin/login"
              className="flex items-center gap-1.5 text-sm font-medium text-tecdia-text/40 hover:text-tecdia-accent transition-colors duration-200"
            >
              <ShieldCheck size={14} /> Admin
            </Link>
  
            <Link to="/chat" className="btn-primary text-sm flex items-center gap-2 px-5 py-2.5">
              <div className="w-4 h-4 overflow-hidden rounded-sm">
                <img src="/src/assets/logo.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
              </div>
              Get Started
            </Link>
          </div>
  
          {/* Mobile menu button */}
          <button
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-tecdia-surface border border-tecdia-border text-tecdia-text/60 transition-all duration-200"
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
            className="md:hidden absolute top-[76px] left-4 right-4 rounded-2xl p-6 flex flex-col gap-4 bg-tecdia-surface border border-tecdia-border shadow-xl backdrop-blur-xl"
          >
            <Link to="/features" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-tecdia-text/60 hover:text-tecdia-accent transition-colors">Features</Link>

            <hr className="border-tecdia-border" />
            <Link to="/admin/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-tecdia-accent/70 hover:text-tecdia-accent transition-colors">
              <ShieldCheck size={14} /> Admin Login
            </Link>
            <Link to="/chat" onClick={() => setIsMenuOpen(false)} className="btn-primary text-center text-sm">
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
