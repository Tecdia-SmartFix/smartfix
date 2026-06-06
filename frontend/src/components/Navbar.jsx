import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X, User, LogOut } from 'lucide-react';
import { useStartDiagnosing } from '../context/StartDiagnosingContext';
import tecdiaLogo from '../assets/cebu_F-Photoroom.png';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const { open: openStartDiagnosing } = useStartDiagnosing();
  const location = useLocation();
  const navigate = useNavigate();
  const showCta = !location.pathname.startsWith('/chat') && !location.pathname.startsWith('/admin');
  const showShiftButtons = location.pathname.startsWith('/chat');

  const navMachineParam = new URLSearchParams(location.search).get('machine');

  // Navigate to the new full-page shift form, preserving the current machine
  // context via query string so the page can fetch its parameters.
  const goToShift = (phase) => {
    const qs = navMachineParam ? `?machine=${encodeURIComponent(navMachineParam)}` : '';
    navigate(`/shift/${phase}${qs}`);
  };

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
        className={`theme-nav w-full flex items-center justify-between transition-all duration-500 bg-black shadow-sm`}
      >
        <div className="max-w-[1680px] mx-auto w-full px-5 sm:px-8 lg:px-10 h-[64px] flex items-center justify-between">

          {/* Left Side: Logo & Primary Links */}
          <div className="flex items-center gap-8 h-full">

            {/* TECDIA Logo */}
            <Link
              to="/"
              className="navbar-brand"
              style={{ padding: '5px 0', display: 'inline-flex', alignItems: 'center' }}
            >
              <img
                src={tecdiaLogo}
                alt="Tecdia"
                style={{ width: '74px', height: 'auto' }}
              />
            </Link>

            <div className="hidden md:flex items-center gap-8 h-full">
              <Link to="/features"
                onMouseEnter={() => setHoveredPath('/features')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full"
              >
                Features
                {hoveredPath === '/features' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
                )}
              </Link>
              <Link to="/machines"
                onMouseEnter={() => setHoveredPath('/machines')}
                onMouseLeave={() => setHoveredPath(null)}
                className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full"
              >
                Machines
                {hoveredPath === '/machines' && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
                )}
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-8 h-full">
            {showShiftButtons && (
              <>
                <button
                  onClick={() => goToShift('start')}
                  onMouseEnter={() => setHoveredPath('start-shift')}
                  onMouseLeave={() => setHoveredPath(null)}
                  className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:text-white h-full"
                >
                  <ArrowRight size={14} /> Start Shift
                  {hoveredPath === 'start-shift' && (
                    <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
                  )}
                </button>
                <button
                  onClick={() => goToShift('end')}
                  onMouseEnter={() => setHoveredPath('end-shift')}
                  onMouseLeave={() => setHoveredPath(null)}
                  className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:text-white h-full"
                >
                  <LogOut size={14} /> End Shift
                  {hoveredPath === 'end-shift' && (
                    <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
                  )}
                </button>
                <div className="h-4 w-px bg-white/20" />
              </>
            )}

            <Link to="/integrations"
              onMouseEnter={() => setHoveredPath('/integrations')}
              onMouseLeave={() => setHoveredPath(null)}
              className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors duration-200 text-white hover:text-white h-full"
            >
              Integrations
              {hoveredPath === '/integrations' && (
                <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
              )}
            </Link>

            <Link 
              to="/admin/login" 
              onMouseEnter={() => setHoveredPath('/admin/login')}
              onMouseLeave={() => setHoveredPath(null)}
              className="relative flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:text-white h-full mr-2"
            >
              <User size={14} /> Admin
              {hoveredPath === '/admin/login' && (
                <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
              )}
            </Link>
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
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2b8cff] to-[#10b9d2]" />
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
            {showShiftButtons && (
              <>
                <button
                  onClick={() => { setIsMenuOpen(false); goToShift('start'); }}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors w-full text-left"
                >
                  <ArrowRight size={14} /> Start Shift
                </button>
                <button
                  onClick={() => { setIsMenuOpen(false); goToShift('end'); }}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors w-full text-left"
                >
                  <LogOut size={14} /> End Shift
                </button>
              </>
            )}
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

    </nav>
  );
};

export default Navbar;