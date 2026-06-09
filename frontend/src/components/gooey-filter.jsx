// SVG goo filter used by AdminProfileMenu (and anywhere else we want
// circular elements to visually merge as they move past each other).
//
// Render <GooeyFilter id="some-id" /> once on the page, then apply
// `style={{ filter: "url(#some-id)" }}` to any container whose children
// should "blob" together. The filter is invisible (`hidden absolute`)
// and only takes effect via the URL reference.
//
// Original tsx upstream; converted to jsx because this project doesn't
// use TypeScript.

const GooeyFilter = ({ id = 'goo-filter', strength = 10 }) => {
  return (
    <svg className="hidden absolute">
      <defs>
        <filter id={id}>
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={strength}
            result="blur"
          />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
};

export { GooeyFilter };
