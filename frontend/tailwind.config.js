import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tecdia: {
          background: '#CDF5FD', // Primary background
          surface:    '#A0E9FF', // Secondary background, card surfaces
          elevated:   '#ffffff', // Using white for some cards as per instruction
          border:     '#89CFF3', // Borders, hover states
          text:       '#1a1a2e', // Dark navy text
          textDeep:   '#1a1a2e', // Deep navy for headings
          muted:      '#1a1a2e',
          caption:    '#1a1a2e',
          accent:     '#00A9FF', // Primary accent
          hover:      '#89CFF3', 
          
          // Backward compatibility
          dark:       '#CDF5FD', 
          cyan:       '#00A9FF',
          sky:        '#89CFF3',
          steel:      '#00A9FF',
        }
      },
      fontFamily: {
        sora:  ['Sora', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'fade-in':    'fade-in 1s ease-out forwards',
        'slide-up':   'slide-up 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%':       { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
}
