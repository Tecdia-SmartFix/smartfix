import React from 'react';
import { Link } from 'react-router-dom';
import tecdiaLogo from '../assets/tecdia-logo-clean.svg';

const BrandMark = ({ to = '/', className = '', logoClassName = 'h-9 w-auto', showProduct = true }) => {
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img src={tecdiaLogo} alt="Tecdia" className={logoClassName} />
      {showProduct && (
        <span className="hidden border-l border-current/20 pl-3 text-[11px] font-black uppercase leading-none tracking-[0.2em] sm:inline">
          SmartFix
        </span>
      )}
    </span>
  );

  if (!to) return content;

  return (
    <Link to={to} className="inline-flex items-center">
      {content}
    </Link>
  );
};

export default BrandMark;
