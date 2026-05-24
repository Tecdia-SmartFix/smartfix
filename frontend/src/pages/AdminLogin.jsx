import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const InputField = ({ icon: Icon, label, ...props }) => (
  <div className="space-y-2 group">
    <label className="block text-[11px] font-black uppercase tracking-widest text-[#111111]/50">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 text-[#111111]/30 group-focus-within:text-[#111111]" />
      )}
      <input
        {...props}
        className="w-full py-3.5 px-4 text-sm text-[#111111] placeholder:text-[#111111]/30 focus:placeholder:text-[#111111] outline-none transition-all duration-200 bg-transparent border-0 border-b-2 border-[#E5E7EB] focus:ring-0 focus:border-b-[#111111]"
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
      className="min-h-screen flex items-center justify-center px-4 pt-20 relative overflow-hidden bg-[#111]"
    >


      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Brand — only visible on step 1 */}
        {step === 1 && (
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black uppercase tracking-normal text-white mb-2">Admin Sign In</h1>
            <p className="text-sm text-white/50">Enter your email to receive a secure sign-in link</p>
          </div>
        )}

        {/* Form Card */}
        <div
          className="relative overflow-hidden rounded-3xl border border-white/70 p-8 shadow-2xl sm:p-12"
          style={{ background: '#ffffff', backdropFilter: 'blur(20px)' }}
        >
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* ── Step 1: Email input ── */
              <motion.form key="step1" onSubmit={handleRequestLink} className="space-y-5"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                <InputField
                  label="Admin Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                />

                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-500 border border-red-200">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </motion.div>
                )}

                <div className="text-center pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="font-medium text-sm text-[#5f6368] border-b-[1.5px] border-[#5f6368] pb-[1px] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 leading-none"
                  >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Request Login Link"
                  )}
                </button>
                </div>
              </motion.form>

            ) : (
              /* ── Step 2: Check your email confirmation ── */
              <motion.div key="step2" className="space-y-5"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                {/* Success text */}
                <div className="flex flex-col items-start text-left pt-2 pb-1">
                  <h2 className="text-xl font-black text-[#111111] mb-2">Check your email</h2>
                  <p className="text-sm text-[#111111] leading-relaxed max-w-xs">
                    We sent a secure login link to{' '}
                    <span className="font-normal">{email}</span>.
                    Click the link in the email to sign in.
                  </p>
                </div>

                <div className="h-[1px] w-full bg-[#111111]" />

                {/* Info note */}
                <div className="text-xs text-[#111111]/60">
                  <span>The link expires in <strong>15 minutes</strong> and is single-use. If you don't see the email, check your spam folder.</span>
                </div>

                <div className="h-[1px] w-full bg-[#111111]" />

                {/* Resend link */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="text-xs text-[#111111]/50 transition-colors underline underline-offset-2 select-none"
                  >
                    Didn't receive the email? Try again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </motion.div>
    </div>
  );
};

export default AdminLogin;
