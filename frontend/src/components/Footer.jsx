import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="w-full py-14 px-6 bg-white border-t border-tecdia-border">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

      {/* Brand */}
      <div className="col-span-1 md:col-span-2">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-tecdia-border bg-tecdia-background">
            <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold text-tecdia-textDeep group-hover:text-tecdia-accent transition-colors">
            Tecdia <span className="text-tecdia-accent">SmartFix</span>
          </span>
        </Link>
        <p className="text-sm leading-relaxed max-w-xs mb-6 text-tecdia-text/60">
          AI-powered industrial diagnostics — select your machine, describe the issue, and get expert-level fault analysis instantly.
        </p>
        {/* Stat chips */}
      </div>

      {/* Product */}
      <div>
        <h4 className="text-sm font-bold text-tecdia-textDeep mb-5 uppercase tracking-widest">Product</h4>
        <ul className="space-y-3 text-sm text-tecdia-text/60">
          {['Features', 'Integrations', 'Enterprise', 'Pricing'].map(item => (
            <li key={item}>
              <a href="#" className="transition-colors duration-200 hover:text-tecdia-accent">{item}</a>
            </li>
          ))}
        </ul>
      </div>

      {/* Company */}
      <div>
        <h4 className="text-sm font-bold text-tecdia-textDeep mb-5 uppercase tracking-widest">Company</h4>
        <ul className="space-y-3 text-sm text-tecdia-text/60">
          {['About Us', 'Careers', 'Privacy Policy', 'Terms of Service'].map(item => (
            <li key={item}>
              <a href="#" className="transition-colors duration-200 hover:text-tecdia-accent">{item}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="max-w-7xl mx-auto mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs border-t border-tecdia-border text-tecdia-text/40">
      <p>© {new Date().getFullYear()} Tecdia SmartFix. All rights reserved.</p>
      <p>Built for the future of industrial AI.</p>
    </div>
  </footer>
);

export default Footer;
