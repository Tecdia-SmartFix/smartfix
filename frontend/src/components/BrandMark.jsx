import React from 'react';
import { Link } from 'react-router-dom';

// Inline SVG wordmark — currentColor on every fill/stroke lets the logo
// inherit the parent's text color so the same component reads correctly
// on dark navbars (text-white) and light pages (default dark text)
// without an asset swap. SVG must be inlined (not loaded via <img>) for
// currentColor to reach into it.
const TecdiaWordmark = ({ className }) => (
  <svg
    viewBox="0 0 168 76"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Tecdia"
    fill="none"
    className={className}
  >
    {/* Top row: TEC */}
    <path d="M2 8H58" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />
    <path d="M30 8V36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />

    <rect x="68" y="8"    width="10" height="31" fill="currentColor" />
    <rect x="68" y="8"    width="45" height="7"  fill="currentColor" />
    <rect x="68" y="20.5" width="37" height="7"  fill="currentColor" />
    <rect x="68" y="32"   width="46" height="7"  fill="currentColor" />

    <path
      d="M164 17C157.6 10.2 148.8 7.3 138 9.1C126.5 11 119 18.1 119 27.8C119 37.5 126.5 44.6 138 46.5C148.8 48.3 157.6 45.4 164 38.6"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="square"
    />

    {/* Bottom row: DIA */}
    <path
      d="M2 43H39C56 43 67 48.7 67 59.5C67 70.3 56 76 39 76H2V43ZM13.5 50.5V68.5H38.2C48.5 68.5 55 65.4 55 59.5C55 53.6 48.5 50.5 38.2 50.5H13.5Z"
      fill="currentColor"
    />
    <path
      d="M78 47.5L89 40.5V69.5L78 76.5V47.5Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinejoin="miter"
    />
    <path
      d="M122 43H134L166 76H151.8L146.7 70H110.6L105.6 76H92L122 43ZM117.2 62.8H140L128.5 50.2L117.2 62.8Z"
      fill="currentColor"
    />
  </svg>
);

const BrandMark = ({ to = '/', className = '', logoClassName = 'h-9 w-auto', showProduct = true }) => {
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <TecdiaWordmark className={logoClassName} />
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

// Exported in case other components need the wordmark on its own without
// the SmartFix divider/text (e.g. AdminLogin's brand panel).
export { TecdiaWordmark };
