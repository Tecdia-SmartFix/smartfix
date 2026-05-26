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
        landing: {
          background: '#CDF5FD',
          surface:    '#A0E9FF',
          elevated:   '#ffffff',
          border:     '#89CFF3',
          text:       '#1a1a2e',
          textDeep:   '#1a1a2e',
          muted:      '#1a1a2e',
          caption:    '#1a1a2e',
          accent:     '#007bff',
          hover:      '#0056b3',
        },
        tecdia: {
          background: '#F2F2F2', // Secondary Background
          surface:    '#FFFFFF', // White Background
          elevated:   '#FFFFFF',
          border:     '#E5E7EB', // subtle gray for borders
          text:       '#111111', // Primary Text
          textDeep:   '#111111',
          secondary:  '#5f5f5f',
          muted:      '#7a7a7a', // Muted/helper text
          caption:    '#7a7a7a', // Muted/helper text
          accent:     '#007bff', // Accent Blue
          hover:      '#0056b3', 
          
          // Backward compatibility
          dark:       '#F2F2F2', 
          cyan:       '#007bff',
          sky:        '#007bff',
          steel:      '#007bff',
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
