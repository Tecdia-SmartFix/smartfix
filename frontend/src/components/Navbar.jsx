import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X, User, LogOut, Moon, Sun } from 'lucide-react';
import EndShiftModal from './EndShiftModal';
import { useStartDiagnosing } from '../context/StartDiagnosingContext';
import BrandMark from './BrandMark';
import { useTheme } from '../context/ThemeContext';
import MegaMenu from './MegaMenu';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  // 'start' = pre-shift checklist, 'end' = end-of-shift log. Same modal,
  // different copy + different phase tag in the POST body.
  const [shiftModalPhase, setShiftModalPhase] = useState('end');
  const [hoveredPath, setHoveredPath] = useState(null);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  let megaMenuTimeout;

  const handleMouseEnterMegaMenu = () => {
    clearTimeout(megaMenuTimeout);
    setMegaMenuOpen(true);
  };

  const handleMouseLeaveMegaMenu = () => {
    megaMenuTimeout = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 150);
  };
  const { open: openStartDiagnosing } = useStartDiagnosing();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const showCta = !location.pathname.startsWith('/chat') && !location.pathname.startsWith('/admin');

  // Derive the active machine from the URL so the End-Shift modal opened
  // from the navbar gets the same machineId as the one inside ChatPage.
  // Falls through to undefined when no ?machine= is present (e.g. on /admin),
  // and the modal will show its "no parameters configured" empty state.
  const navMachineParam = new URLSearchParams(location.search).get('machine');
  const navMachineId = navMachineParam
    ? navMachineParam.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()
    : undefined;

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
        className={`theme-nav w-full flex items-center justify-between transition-all duration-500 ${
          scrolled || location.pathname !== '/'
            ? 'bg-black/[0.92] backdrop-blur-xl shadow-sm'
            : 'bg-black/10 backdrop-blur-[2px]'
        }`}
      >
        <div className="max-w-[1680px] mx-auto w-full px-5 sm:px-8 lg:px-10 h-[64px] flex items-center justify-between">
          {/* Logo */}
          {/* Left Side: Logo & Primary Links */}
          <div className="flex items-center gap-10 h-full">
            <BrandMark className="text-white" logoClassName="h-10 w-auto shrink-0" />
            
            <div className="hidden md:flex items-center gap-8 h-full">
              <div 
                onMouseEnter={() => { setHoveredPath('/products'); handleMouseEnterMegaMenu(); }}
                onMouseLeave={() => { setHoveredPath(null); handleMouseLeaveMegaMenu(); }}
                className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full cursor-pointer"
              >
                Products
                {hoveredPath === '/products' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </div>
              <div 
                onMouseEnter={() => { setHoveredPath('/support'); handleMouseEnterMegaMenu(); }}
                onMouseLeave={() => { setHoveredPath(null); handleMouseLeaveMegaMenu(); }}
                className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full cursor-pointer"
              >
                Support
                {hoveredPath === '/support' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </div>
              <div 
                onMouseEnter={() => { setHoveredPath('/technologies'); handleMouseEnterMegaMenu(); }}
                onMouseLeave={() => { setHoveredPath(null); handleMouseLeaveMegaMenu(); }}
                className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full cursor-pointer"
              >
                Technologies
                {hoveredPath === '/technologies' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </div>
              <Link to="/admin/login"
                onMouseEnter={() => setHoveredPath('/admin/login')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full"
              >
                <User size={14} /> Admin
                {hoveredPath === '/admin/login' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </Link>
            </div>
          </div>
  
          {/* Right Side: Secondary Links */}
          <div className="hidden md:flex items-center gap-7 h-full">
            <button
              onClick={() => { setShiftModalPhase('start'); setIsEndShiftOpen(true); }}
              onMouseEnter={() => setHoveredPath('start-shift')}
              onMouseLeave={() => setHoveredPath(null)}
              className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:text-white h-full"
            >
              <ArrowRight size={14} /> Start Shift
              {hoveredPath === 'start-shift' && (
                <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
              )}
            </button>

            <button
              onClick={() => { setShiftModalPhase('end'); setIsEndShiftOpen(true); }}
              onMouseEnter={() => setHoveredPath('end-shift')}
              onMouseLeave={() => setHoveredPath(null)}
              className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:text-white h-full"
            >
              <LogOut size={14} /> End Shift
              {hoveredPath === 'end-shift' && (
                <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
              )}
            </button>
  
            <div className="h-4 w-px bg-white/20" />

            <button
              type="button"
              onClick={toggleTheme}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 hover:text-white"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
  
            {showCta && (
              <button
                type="button"
                onClick={openStartDiagnosing}
                onMouseEnter={() => setHoveredPath('start-diagnosing')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full"
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
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all duration-200"
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
            className="md:hidden absolute top-[76px] left-4 right-4 rounded-3xl p-6 flex flex-col gap-4 bg-black/[0.92] border border-white/15 shadow-xl backdrop-blur-xl"
          >
            <Link to="/features" onClick={() => setIsMenuOpen(false)} className="text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors">Features</Link>

            <hr className="border-white/15" />
            <button
              type="button"
              onClick={() => { toggleTheme(); }}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#79ddeb] transition-colors text-left"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); setShiftModalPhase('start'); setIsEndShiftOpen(true); }}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors w-full text-left"
            >
              <ArrowRight size={14} /> Start Shift
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); setShiftModalPhase('end'); setIsEndShiftOpen(true); }}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors w-full text-left"
            >
              <LogOut size={14} /> End Shift
            </button>
            <Link to="/admin/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors">
              <User size={14} /> Admin Login
            </Link>
            {showCta && (
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); openStartDiagnosing(); }}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors text-left"
              >
                Start Diagnosing <ArrowRight size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <EndShiftModal
        isOpen={isEndShiftOpen}
        onClose={() => setIsEndShiftOpen(false)}
        machineId={navMachineId}
        machineName={navMachineParam || undefined}
        phase={shiftModalPhase}
      />
      
      <MegaMenu 
        isHovered={megaMenuOpen} 
        onMouseEnter={handleMouseEnterMegaMenu} 
        onMouseLeave={handleMouseLeaveMegaMenu} 
      />
    </nav>
  );
};

export default Navbar;
