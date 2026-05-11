import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const InputField = ({ icon: Icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="block text-[11px] font-black uppercase tracking-widest text-[#1a1a2e]/50">
      {label}
    </label>
    <div className="relative group">
      <Icon size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 text-[#1a1a2e]/30 group-focus-within:text-[#00A9FF]" />
      <input
        {...props}
        className="w-full py-3.5 pl-10 pr-4 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 rounded-xl outline-none transition-all duration-200 bg-white border-2 border-[#89CFF3] focus:border-[#00A9FF] focus:ring-2 focus:ring-[#00A9FF]/10"
      />
    </div>
  </div>
);

const AdminLogin = () => {
  const { requestLoginLink, checkLoginError } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1); // 1 = email input, 2 = check-email confirmation
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for ?login_error=expired from server redirect
  useEffect(() => {
    const linkError = checkLoginError();
    if (linkError) {
      setError(linkError);
      // Clean the URL so the error doesn't persist on reload
      const url = new URL(window.location.href);
      url.searchParams.delete('login_error');
      window.history.replaceState({}, '', url.toString());
    }
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
    <div
      className="min-h-screen flex items-center justify-center px-4 pt-20 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #89CFF3 0%, #CDF5FD 50%, #A0E9FF 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-[#00A9FF]/15 blur-[80px] -z-0" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-[280px] h-[280px] rounded-full bg-[#89CFF3]/40 blur-[60px] -z-0" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-7">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border-2 border-[#89CFF3] shadow-sm">
              <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-[#1a1a2e]">Tecdia <span className="text-[#00A9FF]">SmartFix</span></span>
          </Link>

          <h1 className="text-3xl font-black text-[#1a1a2e] mb-2">Welcome back</h1>
          <p className="text-sm text-[#1a1a2e]/50">Restricted area — authorized personnel only</p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-3xl p-8 border border-white/60 shadow-2xl overflow-hidden relative"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}
        >
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* ── Step 1: Email input ── */
              <motion.form key="step1" onSubmit={handleRequestLink} className="space-y-5"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                <InputField
                  icon={Mail}
                  label="Admin Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@tecdia.com.ph"
                  autoComplete="email"
                  required
                />

                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-500 border border-red-200">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${loading || !email
                    ? 'bg-[#A0E9FF] text-[#1a1a2e]/40 cursor-not-allowed border-2 border-[#89CFF3]'
                    : 'bg-[#00A9FF] text-white active:scale-[0.98]'
                    }`}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <><Mail size={14} /> Request Login Link</>
                  )}
                </button>
              </motion.form>

            ) : (
              /* ── Step 2: Check your email confirmation ── */
              <motion.div key="step2" className="space-y-5"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                {/* Success icon */}
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-black text-[#1a1a2e] mb-2">Check your email</h2>
                  <p className="text-sm text-[#1a1a2e]/60 leading-relaxed max-w-xs">
                    We sent a secure login link to{' '}
                    <span className="font-bold text-[#00A9FF]">{email}</span>.
                    Click the link in the email to sign in.
                  </p>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#89CFF3]/20 border border-[#89CFF3]/40 text-xs text-[#1a1a2e]/60">
                  <Lock size={13} className="flex-shrink-0 mt-0.5 text-[#00A9FF]" />
                  <span>The link expires in <strong>15 minutes</strong> and is single-use. If you don't see the email, check your spam folder.</span>
                </div>

                {/* Resend link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="text-xs text-[#1a1a2e]/50 hover:text-[#00A9FF] transition-colors underline underline-offset-2"
                  >
                    Didn't receive the email? Try again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs mt-6 text-[#1a1a2e]/40">
          <Link to="/" className="transition-colors duration-200 hover:text-[#00A9FF]">← Back to Tecdia SmartFix</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
