import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="w-full py-14 px-6 bg-white">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">

      {/* Brand */}
      <div className="col-span-1 md:col-span-2">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">

          <span className="text-lg font-bold text-black transition-colors">
            Tecdia <span className="text-black">SmartFix</span>
          </span>
        </Link>
        <p className="text-sm leading-relaxed max-w-xs mb-6 text-black">
          AI-powered industrial diagnostics — select your machine, describe the issue, and get expert-level fault analysis instantly.
        </p>
        {/* Stat chips */}
      </div>

      {/* Product */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Product</h4>
        <ul className="space-y-3 text-sm text-black">
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
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Support</h4>
        <ul className="space-y-3 text-sm text-black">
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
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Company</h4>
        <ul className="space-y-3 text-sm text-black">
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
    <div className="max-w-7xl mx-auto mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-black">
      <p>© {new Date().getFullYear()} Tecdia SmartFix. All rights reserved.</p>
      <p>Built for the future of industrial AI.</p>
    </div>
  </footer>
);

export default Footer;
