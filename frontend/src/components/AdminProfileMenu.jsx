import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ClipboardList, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';

// Admin profile + quick-actions menu for the admin top bar.
// Monochrome to match the rest of the dark nav: white-on-black trigger
// pill with a thin border, single dark dropdown card with icon+label
// rows, restrained red accent for the destructive Log out.

const initialFromEmail = (email) => {
  if (!email) return 'A';
  const head = email.trim().split('@')[0] || 'A';
  return (head[0] || 'A').toUpperCase();
};

const AdminProfileMenu = () => {
  const { user } = useAuth();
  const { adminLogout } = useAdminAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside-click + Esc.
  useEffect(() => {
    if (!open) return;
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Navigable items become real <Link>s so right-click / middle-click /
  // browser status-bar previews all work the way users expect. Log out is
  // an action button (async side effect before navigation), so it stays
  // as a <button>.
  const linkItems = [
    { icon: Settings,       label: 'Settings',  to: '/admin?tab=settings' },
    { icon: ClipboardList,  label: 'Audit log', to: '/admin?tab=audit'    },
  ];
  const handleLogout = async () => {
    setOpen(false);
    await adminLogout();
    navigate('/');
  };

  const initial = initialFromEmail(user.email);

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger — uses the same dark-on-dark chip treatment as the
          stats badges in the same nav, so it blends rather than pops. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-1 pr-3 transition-colors hover:bg-white/[0.12] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        aria-haspopup="menu"
        aria-expanded={open}
        title={user.email || 'Admin account'}
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black"
        >
          {initial}
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
            Admin
          </span>
          <span className="mt-0.5 max-w-[180px] truncate text-[10px] font-medium text-white/55">
            {user.email || 'unknown@tecdia'}
          </span>
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2.4}
          className={`text-white/45 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Single dropdown card — dark surface, thin border, icon+label
          rows. No blobs, no separate info card, just the actions. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            role="menu"
            className="absolute right-0 top-full mt-2 w-[200px] overflow-hidden rounded-lg border border-white/12 bg-[#0b0f17] shadow-2xl shadow-black/60"
          >
            {linkItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon size={14} strokeWidth={2.2} />
                  {item.label}
                </Link>
              );
            })}

            {/* Thin divider so the destructive action reads as separate
                from the navigation links above. */}
            <div className="mx-2 my-1 h-px bg-white/8" />
            <button
              onClick={handleLogout}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 pb-3 text-left text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={14} strokeWidth={2.2} />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProfileMenu;
