import React from 'react';

const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(33, 137, 255,0.05) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Faint radial highlight using accent color */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(33, 137, 255,0.08) 0%, transparent 100%)',
      }} />
      
      {/* Vignette edges */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(242, 242, 242,0.8) 100%)',
      }} />
    </div>
  );
};

export default BackgroundAnimation;
