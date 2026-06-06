import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const COPY = {
  start: { eyebrow: 'Pre-Shift Check', heading: 'Checklist submitted', sub: 'You\'re all set — have a good shift.' },
  end:   { eyebrow: 'End of Shift',    heading: 'Shift logged',         sub: 'See you on the next one.' },
};

const ShiftLogSuccess = () => {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const phase     = params.get('phase') === 'start' ? 'start' : 'end';
  const machine   = params.get('machine') || '';
  const flagged   = Number(params.get('flagged') || 0);
  const copy      = COPY[phase];

  useEffect(() => {
    const id = setTimeout(() => {
      navigate(machine ? `/chat?machine=${encodeURIComponent(machine)}` : '/chat', { replace: true });
    }, 2000);
    return () => clearTimeout(id);
  }, [navigate, machine]);

  return (
    <div className="min-h-screen bg-tecdia-background pt-[64px] text-tecdia-textDeep">
      <div className="mx-auto flex max-w-[640px] flex-col items-center px-5 pt-20 text-center sm:px-8">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <CheckCircle2 size={42} strokeWidth={2.4} />
        </div>
        <span className="mb-3 inline-block rounded-full bg-tecdia-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-tecdia-accent">
          {copy.eyebrow}
        </span>
        <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black leading-tight">
          {copy.heading}
        </h1>
        <p className="mt-3 text-[15px] text-tecdia-secondary">{copy.sub}</p>

        {flagged > 0 && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-[13px] font-bold text-orange-700">
            <AlertTriangle size={14} strokeWidth={2.6} />
            {flagged} {flagged === 1 ? 'issue was' : 'issues were'} flagged for your admin.
          </div>
        )}

        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-tecdia-muted">
          Returning to chat…
        </p>
        <Link
          to={machine ? `/chat?machine=${encodeURIComponent(machine)}` : '/chat'}
          replace
          className="mt-2 text-[12px] font-bold text-tecdia-accent hover:text-tecdia-hover"
        >
          Skip the wait →
        </Link>
      </div>
    </div>
  );
};

export default ShiftLogSuccess;
