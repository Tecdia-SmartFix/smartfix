import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X, User, LogOut } from 'lucide-react';
import EndShiftModal from './EndShiftModal';
import { useStartDiagnosing } from '../context/StartDiagnosingContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const { open: openStartDiagnosing } = useStartDiagnosing();
  const location = useLocation();
  const showCta = !location.pathname.startsWith('/chat') && !location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${location.pathname.startsWith('/admin') ? 'relative' : 'fixed'} top-0 left-0 right-0 z-50 transition-all duration-500`}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full flex items-center justify-between transition-all duration-500 ${
          scrolled || location.pathname !== '/'
            ? 'bg-black/90 backdrop-blur-xl shadow-sm'
            : 'bg-black/40 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-6 h-[46px] flex items-center justify-between">
          {/* Logo */}
          {/* Left Side: Logo & Primary Links */}
          <div className="flex items-center gap-10 h-full">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="text-[17px] font-bold tracking-tight text-white transition-all duration-300">
                Tecdia <span className="text-white">SmartFix</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6 h-full">
              <Link to="/features"
                onMouseEnter={() => setHoveredPath('/features')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 text-white h-full"
              >
                Features
                {hoveredPath === '/features' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </Link>
              <Link to="/admin/login"
                onMouseEnter={() => setHoveredPath('/admin/login')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 text-white h-full"
              >
                <User size={14} /> Admin
                {hoveredPath === '/admin/login' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </Link>
            </div>
          </div>
  
          {/* Right Side: Secondary Links */}
          <div className="hidden md:flex items-center gap-6 h-full">
            <button
              onClick={() => setIsEndShiftOpen(true)}
              onMouseEnter={() => setHoveredPath('end-shift')}
              onMouseLeave={() => setHoveredPath(null)}
              className="relative flex items-center gap-1.5 text-xs font-medium text-white transition-colors duration-200 h-full"
            >
              <LogOut size={14} /> End Shift
              {hoveredPath === 'end-shift' && (
                <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
              )}
            </button>
  
            <div className="h-4 w-px bg-tecdia-border" />
  
            {showCta && (
              <button
                type="button"
                onClick={openStartDiagnosing}
                onMouseEnter={() => setHoveredPath('start-diagnosing')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 text-white h-full"
              >
                Start Diagnosing <ArrowRight size={14} />
                {hoveredPath === 'start-diagnosing' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </button>
            )}
          </div>
  
          {/* Mobile menu button */}
          <button
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-tecdia-surface border border-tecdia-border text-white/60 transition-all duration-200"
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
            className="md:hidden absolute top-[76px] left-4 right-4 rounded-2xl p-6 flex flex-col gap-4 bg-black/90 border border-tecdia-border shadow-xl backdrop-blur-xl"
          >
            <Link to="/features" onClick={() => setIsMenuOpen(false)} className="text-xs font-medium text-white transition-colors">Features</Link>

            <hr className="border-tecdia-border" />
            <button 
              onClick={() => { setIsMenuOpen(false); setIsEndShiftOpen(true); }} 
              className="flex items-center gap-2 text-xs font-medium text-white transition-colors w-full text-left"
            >
              <LogOut size={14} /> End Shift
            </button>
            <Link to="/admin/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-xs font-medium text-white transition-colors">
              <User size={14} /> Admin Login
            </Link>
            {showCta && (
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); openStartDiagnosing(); }}
                className="flex items-center gap-2 text-xs font-medium text-white transition-colors text-left"
              >
                Start Diagnosing <ArrowRight size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <EndShiftModal isOpen={isEndShiftOpen} onClose={() => setIsEndShiftOpen(false)} />
    </nav>
  );
};

export default Navbar;
