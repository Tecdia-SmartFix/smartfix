import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Mail, ArrowRight, MailCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { TecdiaWordmark } from '../components/BrandMark';

// Split-card sign-in page. Left half is the dark Tecdia/SmartFix brand
// panel; right half is the form. Same shell renders both flow steps —
// step 1 (email input) and step 2 ("check your email"). The split layout
// stacks vertically below md: brand-on-top, form-below.

const AdminLogin = () => {
  const { requestLoginLink, checkLoginError } = useAdminAuth();
  const [, ] = useSearchParams();

  const [step, setStep] = useState(1); // 1 = email input, 2 = check-email confirmation
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Surface a friendly error if the user landed here via a redirect from
  // /auth/verify?login_error=…. The URL is cleaned afterwards so a refresh
  // doesn't re-show the message.
  useEffect(() => {
    const linkError = checkLoginError();
    if (linkError) {
      setError(linkError);
      const url = new URL(window.location.href);
      url.searchParams.delete('login_error');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await requestLoginLink(email);
    setLoading(false);
    if (result.success) {
      setStep(2);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-[#eef1ef] overflow-hidden">
      {/* Subtle ambient blur so the white card doesn't sit on a flat page. */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-black/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-black/15 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl shadow-[#0f172a]/15 md:flex-row"
      >
        {/* ── Left: brand panel ──────────────────────────────────────── */}
        <div className="relative flex flex-col justify-between gap-10 bg-[#0a0d11] p-10 text-white md:w-1/2 md:p-12">
          {/* Faint diagonal sheen for depth — monochrome highlight on the
              already-near-black panel to keep the surface from looking flat. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.02]" />

          <div className="relative">
            <TecdiaWordmark className="h-12 w-auto text-white" />
            <div className="mt-3 text-[40px] font-black uppercase tracking-tight leading-none">
              SmartFix
            </div>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">
              Admin Console
            </div>
          </div>

          <div className="relative">
            <h2 className="text-2xl font-bold leading-tight mb-3">Welcome back.</h2>
            <p className="text-sm text-white/65 leading-relaxed max-w-sm">
              Sign in to manage machines, configure shift-log parameters, and
              review alerts across the fleet.
            </p>
          </div>

          <div className="relative text-[11px] text-white/40 leading-relaxed">
            Tecdia · Precision manufacturing intelligence
          </div>
        </div>

        {/* ── Right: form ────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center p-10 md:w-1/2 md:p-12">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                onSubmit={handleRequestLink}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold text-[#0a0d11]">Sign in</h3>
                  <p className="mt-1 text-sm text-[#0a0d11]/55">
                    Enter your admin email and we'll send a one-time sign-in link.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0a0d11]/55">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0a0d11]/30" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@tecdia.com"
                      autoComplete="email"
                      required
                      className="w-full rounded-xl border border-[#0a0d11]/12 bg-white pl-10 pr-3 py-2.5 text-sm text-[#0a0d11] placeholder:text-[#0a0d11]/30 outline-none transition-all focus:border-[#0a0d11] focus:ring-2 focus:ring-[#0a0d11]/15"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#0a0d11] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/25 transition-all hover:brightness-125 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending link…
                    </>
                  ) : (
                    <>Send sign-in link <ArrowRight size={15} /></>
                  )}
                </button>

                <p className="text-center text-[11px] text-[#0a0d11]/45">
                  Only emails on the admin allowlist can request a link.
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0a0d11]/8 text-[#0a0d11]">
                  <MailCheck size={22} />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-[#0a0d11]">Check your email</h3>
                  <p className="mt-2 text-sm text-[#0a0d11]/65 leading-relaxed">
                    We sent a secure sign-in link to{' '}
                    <span className="font-bold text-[#0a0d11]">{email}</span>.
                    Click the link in that email to finish signing in.
                  </p>
                </div>

                <div className="rounded-xl border border-[#0a0d11]/8 bg-[#f7faf9] px-4 py-3 text-[12px] text-[#0a0d11]/60 leading-relaxed">
                  The link expires in <strong className="text-[#0a0d11]">15 minutes</strong> and can only be used once.
                  If you don't see the email, check your spam folder.
                </div>

                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="block w-full text-center text-[12px] font-bold uppercase tracking-[0.14em] text-[#0a0d11]/50 hover:text-[#0a0d11] transition-colors"
                >
                  Didn't get it? Try a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
