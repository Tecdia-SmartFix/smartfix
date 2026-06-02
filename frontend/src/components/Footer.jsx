import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="w-full border-t border-black/10 bg-white px-5 py-14 text-black sm:px-8 lg:px-10">
    <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-12 md:grid-cols-5">

      {/* Brand */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="mb-6 text-lg font-black uppercase tracking-[0.24em] text-black">Tecdia SmartFix</h3>
        <p className="mb-6 max-w-sm text-sm leading-7 text-black/60">
          AI-powered industrial diagnostics for precision manufacturing lines, machine manuals, and severity-aware shift support.
        </p>
        {/* Stat chips */}
      </div>

      {/* Product */}
      <div>
        <h4 className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-black">Product</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li>
            <Link to="/features" className="transition-colors duration-200 hover:text-black">Features</Link>
          </li>
          <li>
            <Link to="/integrations" className="transition-colors duration-200 hover:text-black">Integrations</Link>
          </li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h4 className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-black">Support</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li>
            <a href="mailto:smartfix@tecdia.co.jp" className="transition-colors duration-200 hover:text-black">smartfix@tecdia.co.jp</a>
          </li>
          <li>
            <a href="tel:+813XXXXXXXX" className="transition-colors duration-200 hover:text-black">+81-3-XXXX-XXXX</a>
          </li>
        </ul>
      </div>

      {/* Company */}
      <div>
        <h4 className="mb-5 text-xs font-black uppercase tracking-[0.24em] text-black">Company</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li>
            <Link to="/cookie-policy" className="transition-colors duration-200 hover:text-black">Cookie Policy</Link>
          </li>
          <li>
              <Link to="/privacy-policy" className="transition-colors duration-200 hover:text-black">Privacy Policy</Link>
            </li>
            <li>
              <Link to="/company-policy" className="transition-colors duration-200 hover:text-black">Company Policy</Link>
            </li>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="mx-auto mt-12 flex max-w-[1680px] flex-col items-center justify-between gap-3 border-t border-black/10 pt-8 text-xs text-black/50 md:flex-row">
      <p>© {new Date().getFullYear()} Tecdia SmartFix. All rights reserved.</p>
      <p>Precision manufacturing intelligence.</p>
    </div>
  </footer>
);

export default Footer;
