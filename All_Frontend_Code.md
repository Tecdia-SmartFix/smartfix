# All Frontend Files

## eslint.config.js

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])

```


## index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/src/assets/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Angkor&family=Chokokutai&family=Knewave&family=Michroma&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap" rel="stylesheet">
    <title>Tecdia SmartFix</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```


## postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```


## tailwind.config.js

```javascript
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
        samsung: {
          primary: '#1428A0', // Samsung blue
          background: '#000000', // pure black
          surface: '#ffffff', // white surface
          text: '#000000', // black text
          muted: '#666666', // secondary text
        }
      },
      extend: {
        keyframes: {
          'float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
          },
          'glow': {
            '0%': { boxShadow: '0 0 5px #00A9FF' },
            '50%': { boxShadow: '0 0 20px #00A9FF' },
            '100%': { boxShadow: '0 0 5px #00A9FF' },
          },
        },
        animation: {
          'float': 'float 6s ease-in-out infinite',
          'glow': 'glow 2s ease-in-out infinite',
        },
      },
      fontFamily: {
        sans: ['SamsungOne', 'sans-serif'],
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

```


## vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // â”€â”€ Backend-only paths (no React route at the same URL) â”€â”€
      '/auth':                  'http://localhost:8000',
      '/admin/machines':        'http://localhost:8000',
      '/admin/jobs':            'http://localhost:8000',
      '/admin/alerts':          'http://localhost:8000',
      '/admin/analytics':       'http://localhost:8000',
      '/admin/audit':           'http://localhost:8000',
      '/admin/_seed-analytics': 'http://localhost:8000',
      '/query':                 'http://localhost:8000',
      '/health':                'http://localhost:8000',
      '/workstation':           'http://localhost:8000',

      // â”€â”€ SPA-vs-API collision: /machines is both a React route and a backend GET.
      // Serve the SPA when the browser asks for HTML; proxy to the API otherwise.
      '/machines': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    }
  }
})

```


## package.json

```json
{
  "name": "chat",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tailwindcss/typography": "^0.5.19",
    "autoprefixer": "^10.5.0",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.8.0",
    "postcss": "^8.5.10",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.14.1",
    "remark-gfm": "^4.0.1",
    "tailwindcss": "^3.4.19"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.5.0",
    "vite": "^8.0.9"
  }
}

```


## src\App.css

```css
.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}

```


## src\App.jsx

```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { MachineProvider } from './context/MachineContext';
import { AlertProvider } from './context/AlertContext';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Navbar from './components/Navbar';
import BackgroundAnimation from './components/BackgroundAnimation';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import MachinesPage from './pages/MachinesPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import FeaturesPage from './pages/FeaturesPage';
import IntegrationsPage from './pages/IntegrationsPage';
// Filename intentionally has no "cookie"/"cookies" substring: ad blockers
// (EasyList etc.) match any path containing those words and block the module
// fetch, which would crash the whole React tree on mount.
import CookiePolicy from './pages/LegalNotice';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CompanyPolicy from './pages/CompanyPolicy';

/**
 * Wraps <ChatPage /> with a React `key` derived from the ?machine= URL param.
 * Changing machines forces a full remount so the chat-history and chat-session
 * hooks read from the new machine's localStorage namespace cleanly â€” no stale
 * sidebar entries or follow-up context bleeding across machines.
 *
 * Normalizes display names ("Injection Molding Machine") and slugs
 * ("INJECTION_MOLDING_MACHINE") to the same canonical key.
 */
const machineKeyFromParam = (param) =>
  (param || 'ALL').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();

const ChatRoute = () => {
  const [params] = useSearchParams();
  const machineKey = machineKeyFromParam(params.get('machine'));
  return <ChatPage key={machineKey} />;
};
// (machineKeyFromParam is intentionally not exported â€” keeping App.jsx
// component-only so Vite fast-refresh stays happy.)

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"             element={<LandingPage />} />
          <Route path="/features"     element={<FeaturesPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/company-policy" element={<CompanyPolicy />} />
          <Route path="/integration"  element={<IntegrationsPage />} />
          <Route path="/machines"     element={<MachinesPage />} />
          <Route path="/chat"         element={<ChatRoute />} />
          <Route path="/admin/login"  element={<AdminLogin />} />
          <Route path="/admin"        element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />
        </Routes>
      </AnimatePresence>
    </>
  );
};


function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <MachineProvider>
          <AlertProvider>
            <Router>
              <div className="min-h-screen relative transition-colors duration-500 text-tecdia-text bg-tecdia-background">
                <BackgroundAnimation />
                <div className="relative z-10">
                  <AnimatedRoutes />
                </div>
              </div>
            </Router>
          </AlertProvider>
        </MachineProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;

```


## src\index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
@import url('https://fonts.cdnfonts.com/css/samsungone');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    @apply antialiased transition-colors duration-500;
    font-family: 'SamsungOne', 'Inter', sans-serif;
    margin: 0;
    min-height: 100vh;
    background-color: #ffffff;
    color: #333333;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: 'SamsungOne', 'Inter', sans-serif;
    letter-spacing: -0.02em;
    color: #000000;
  }

  .font-angkor {
    font-family: "Angkor", serif;
    font-weight: 400;
    font-style: normal;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f7f7f7;
  }

  ::-webkit-scrollbar-thumb {
    background: #cccccc;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #999999;
  }
}

@layer components {

  /* â”€â”€ Solid surfaces (Flattened for Samsung UI) â”€â”€ */
  .glass,
  .glass-card,
  .stat-pill {
    @apply p-6 border transition-all duration-300;
    background: #ffffff;
    border-color: #e0e0e0;
  }

  .glass-card:hover {
    background: #f7f7f7;
    border-color: #1428A0;
    box-shadow: none;
  }

  .glass-deep {
    background: #f7f7f7;
    border: 1px solid #e0e0e0;
  }

  /* â”€â”€ Accent text â”€â”€ */
  .text-gradient,
  .text-gradient-bright {
    color: #1428A0;
  }

  /* â”€â”€ Buttons (Flat, Sharp edges) â”€â”€ */
  .btn-primary {
    @apply font-bold transition-all duration-300 active:scale-95 flex items-center justify-center;
    padding: 0.85rem 1.75rem;
    background: #1428A0;
    color: #ffffff;
    border: 1px solid transparent;
  }

  .btn-primary:hover {
    background: #0d1a73;
    box-shadow: none;
    transform: none;
  }

  .btn-secondary {
    @apply font-bold border transition-all duration-300 active:scale-95 flex items-center justify-center;
    padding: 0.85rem 1.75rem;
    background: transparent;
    color: #000000;
    border-color: #000000;
  }

  .btn-secondary:hover {
    background: #f7f7f7;
    color: #1428A0;
    border-color: #1428A0;
    transform: none;
    box-shadow: none;
  }

  /* â”€â”€ Input glow â”€â”€ */
  .input-glow:focus-within {
    border-color: #1428A0 !important;
    box-shadow: 0 0 0 1px #1428A0 !important;
  }

  /* â”€â”€ Feature card â”€â”€ */
  .feature-card {
    @apply p-7 transition-all duration-300 relative overflow-hidden;
    background: #f7f7f7;
    border: 1px solid #e0e0e0;
  }

  .feature-card:hover {
    background: #ffffff;
    border-color: #1428A0;
    box-shadow: none;
    transform: none;
  }

  /* â”€â”€ Custom scrollbar class â”€â”€ */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #333333;
    border-radius: 99px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #525252;
  }
}


/* Animated diagonal stripes for the ingestion progress bar
   (matches the Elisa Design System in-progress treatment). */
.ingestion-stripes {
  animation: ingestion-stripes-move 1.2s linear infinite;
}
@keyframes ingestion-stripes-move {
  from { background-position: 0 0; }
  to   { background-position: 34px 0; }
}

/* â”€â”€ Keyframes â”€â”€ */
@keyframes shimmer {
  0% {
    left: -100%;
  }

  50% {
    left: 100%;
  }

  100% {
    left: 100%;
  }
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseRing {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  100% {
    transform: scale(1.08);
    opacity: 0;
  }
}

@keyframes gradient-x {

  0%,
  100% {
    background-size: 200% 200%;
    background-position: left center;
  }

  50% {
    background-size: 200% 200%;
    background-position: right center;
  }
}

@keyframes fade-in {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@keyframes slide-up {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }

  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes float-y {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes bg-orb-1 {

  0%,
  100% {
    transform: translate(0px, 0px) scale(1);
  }

  25% {
    transform: translate(40px, -30px) scale(1.07);
  }

  50% {
    transform: translate(-20px, 50px) scale(0.95);
  }

  75% {
    transform: translate(-40px, -20px) scale(1.03);
  }
}

@keyframes bg-orb-2 {

  0%,
  100% {
    transform: translate(0px, 0px) scale(1);
  }

  33% {
    transform: translate(-35px, 25px) scale(1.08);
  }

  66% {
    transform: translate(30px, -30px) scale(0.93);
  }
}

@keyframes bg-orb-3 {

  0%,
  100% {
    transform: translate(0px, 0px) scale(1);
  }

  20% {
    transform: translate(25px, -20px) scale(1.05);
  }

  60% {
    transform: translate(-30px, 30px) scale(0.97);
  }

  80% {
    transform: translate(15px, 10px) scale(1.02);
  }
}
```


## src\main.jsx

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```


## src\api\apiClient.js

```javascript
/**
 * SmartFix API Client
 * Implements the SmartFix API Contract v2.
 * All requests include credentials: 'include' so HttpOnly session cookies are sent.
 * Auth credential handling is centralised here so a future switch from cookies
 * to Bearer tokens only requires changes in one place.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

export class ApiError extends Error {
  constructor(detail, code, status) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.name = 'ApiError';
    this.detail = detail;
    this.code = code || 'unknown_error';
    this.status = status;
  }
}

/**
 * Returns extra headers needed for auth.
 * Currently a no-op (cookies handle auth), but acts as a shim
 * for a future Bearer-token migration per Â§8 stability notes.
 */
export const getAuthHeaders = () => ({});

/**
 * Core fetch wrapper for JSON endpoints.
 */
export const fetchApi = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (data && data.detail) {
      throw new ApiError(data.detail, data.code, response.status);
    }
    throw new ApiError(`HTTP Error: ${response.status}`, 'http_error', response.status);
  }

  return data;
};

/**
 * Upload a new machine PDF via multipart/form-data.
 * DO NOT set Content-Type header â€” the browser will set it with the correct
 * multipart boundary automatically.
 *
 * @param {FormData} formData  Built by the caller with all required fields.
 * @returns {{ job_id: string, status: string }}
 */
export const uploadMachine = async (formData) => {
  const response = await fetch(`${API_BASE}/admin/machines`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(), // no Content-Type override â€” let browser set multipart boundary
    body: formData,
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (data && data.detail) {
      throw new ApiError(data.detail, data.code, response.status);
    }
    throw new ApiError(`HTTP Error: ${response.status}`, 'http_error', response.status);
  }

  return data;
};

/**
 * Poll a single ingestion job.
 * @param {string} jobId
 * @returns {Promise<{job_id, machine_id, status, step, progress, started_at, finished_at, error}>}
 */
export const pollJob = async (jobId) => {
  return fetchApi(`/admin/jobs/${jobId}`);
};

```


## src\components\BackgroundAnimation.jsx

```jsx
import React from 'react';

const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]">
      {/* Dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(20,40,160,0.1) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Faint radial highlight using accent color */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(20,40,160,0.15) 0%, transparent 100%)',
      }} />
      
      {/* Vignette edges */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, #000000 100%)',
      }} />
    </div>
  );
};

export default BackgroundAnimation;

```


## src\components\ChromaKeyVideo.jsx

```jsx
import React, { useRef, useEffect, useCallback } from 'react';

const ChromaKeyVideo = ({ src, width, height, className = '' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = frame.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Detect green-screen pixels: green channel dominant
      if (g > 80 && g > r * 1.25 && g > b * 1.25) {
        d[i + 3] = 0; // make transparent
      }
    }

    ctx.putImageData(frame, 0, 0);
    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const start = () => {
      rafRef.current = requestAnimationFrame(processFrame);
    };
    video.addEventListener('play', start);

    return () => {
      video.removeEventListener('play', start);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [processFrame]);

  return (
    <div className={className} style={{ width, height }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default ChromaKeyVideo;

```


## src\components\EndShiftModal.jsx

```jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';

const EndShiftModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    pressure: '78',
    temperature: '232',
    cycleCount: '146',
    oilLevel: 'OK',
    leaksObserved: false,
    unusualNoise: true,
    vibrationNormal: true,
    notes: 'Slight clicking near the clamp near end of shift, nothing on display.'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate submission
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-tecdia-textDeep/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-[640px] shadow-2xl p-8 z-10 bg-white rounded-3xl"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-tecdia-text/40 hover:text-tecdia-text transition-colors"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            
            <div className="mb-6">
              <span className="text-[11px] font-bold tracking-widest text-tecdia-accent uppercase mb-2 block">
                End of Shift
              </span>
              <h2 className="text-[28px] font-bold text-tecdia-textDeep leading-tight mb-2">
                Log your machines before signing off
              </h2>
              <p className="text-sm text-tecdia-text/60">
                Shift ended at 19:00 Â· Workstation 192.168.1.10 Â· Hi, A. Worker
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="bg-[#f0f7fb] rounded-xl px-5 py-4 mb-6">
                <p className="text-sm text-tecdia-textDeep">
                  <span className="font-semibold">Machine 1 of 1</span> â€” Injection Molding Machine
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-tecdia-textDeep mb-1">Readings</h3>
                <p className="text-[13px] text-tecdia-text/50 mb-4">
                  Take a glance at the machine. Out-of-range values trigger an alert.
                </p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Hydraulic pressure (bar)
                    </label>
                    <input 
                      type="text"
                      name="pressure"
                      value={formData.pressure}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">expected 75â€“80</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Barrel temperature (Â°C)
                    </label>
                    <input 
                      type="text"
                      name="temperature"
                      value={formData.temperature}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">expected 220â€“240</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Cycle count (last hour)
                    </label>
                    <input 
                      type="text"
                      name="cycleCount"
                      value={formData.cycleCount}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">typical 130â€“180</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-tecdia-textDeep mb-1.5">
                      Oil level
                    </label>
                    <input 
                      type="text"
                      name="oilLevel"
                      value={formData.oilLevel}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] font-medium text-tecdia-textDeep focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all"
                    />
                    <p className="text-[12px] text-tecdia-text/40 mt-1.5">expected OK / Low / Refilled</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-tecdia-textDeep mb-3">Visual checks</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.leaksObserved ? 'bg-tecdia-accent border-tecdia-accent' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.leaksObserved && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[14px] text-tecdia-textDeep">Leaks observed</span>
                    <input type="checkbox" name="leaksObserved" checked={formData.leaksObserved} onChange={handleChange} className="hidden" />
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.unusualNoise ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.unusualNoise && <AlertCircle size={14} className="text-white" strokeWidth={2.5} />}
                    </div>
                    <span className="text-[14px] text-tecdia-textDeep">Unusual noise</span>
                    {formData.unusualNoise && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-bold text-[#ff6b00] border border-[#ff6b00] bg-orange-50">
                        Will flag
                      </span>
                    )}
                    <input type="checkbox" name="unusualNoise" checked={formData.unusualNoise} onChange={handleChange} className="hidden" />
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${formData.vibrationNormal ? 'bg-[#10b981] border-[#10b981]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.vibrationNormal && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[14px] text-tecdia-textDeep">Vibration normal</span>
                    <input type="checkbox" name="vibrationNormal" checked={formData.vibrationNormal} onChange={handleChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-tecdia-textDeep mb-2">Anything else?</h3>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-4 py-3 text-[14px] text-tecdia-textDeep h-20 resize-none focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent transition-all custom-scrollbar"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="text-[13px] font-medium text-tecdia-text/50 hover:text-tecdia-text transition-colors"
                >
                  Skip â€” nothing notable
                </button>
                <button 
                  type="submit" 
                  className="bg-tecdia-accent hover:bg-[#0099e6] text-white font-bold rounded-xl px-6 py-2.5 text-[14px] transition-all flex items-center gap-2 shadow-lg shadow-tecdia-accent/30"
                >
                  Submit log <span className="text-lg leading-none">â†’</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EndShiftModal;

```


## src\components\FeatureCard.jsx

```jsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * FeatureCard â€“ a glassâ€‘morphism card used for product/technology showcase.
 * Props:
 *   icon   â€“ React element (e.g., an SVG) displayed at the top.
 *   title  â€“ Headline text.
 *   desc   â€“ Short description.
 *   className â€“ optional additional classes.
 */
export default function FeatureCard({ icon, title, desc, className = '' }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 0 20px #00A9FF' }}
      className={`glass p-6 rounded-xl border border-[#e0e0e0] bg-[#111111]/30 backdrop-blur-xl hover:bg-[#111111]/50 transition-colors ${className}`}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-[#00A9FF] text-3xl">{icon}</div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-sm text-[#777777]">{desc}</p>
      </div>
    </motion.div>
  );
}

```


## src\components\Footer.jsx

```jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="w-full py-14 px-6 bg-[#ffffff] border-t border-[#d9d9d9]">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">

      {/* Brand */}
      <div className="col-span-1 md:col-span-2">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#d9d9d9] bg-[#f5f5f5]">
            <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight transition-colors hover:text-[#1428A0] text-black group-hover:text-[#1428A0]">
            Tecdia <span className="text-tecdia-accent">SmartFix</span>
          </span>
        </Link>
        <p className="text-sm leading-relaxed max-w-xs mb-6 text-black/60">
          AI-powered industrial diagnostics â€” select your machine, describe the issue, and get expert-level fault analysis instantly.
        </p>
        {/* Stat chips */}
      </div>

      {/* Product */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Product</h4>
        <ul className="space-y-3 text-sm text-black/60">
          <li>
            <Link to="/features" className="transition-colors duration-200 hover:text-[#1428A0]">Features</Link>
          </li>
          <li>
            <Link to="/integrations" className="transition-colors duration-200 hover:text-[#1428A0]">Integrations</Link>
          </li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Support</h4>
        <ul className="space-y-3 text-sm text-tecdia-text/60">
          <li>
            <a href="mailto:smartfix@tecdia.co.jp" className="transition-colors duration-200 hover:text-[#1428A0]">smartfix@tecdia.co.jp</a>
          </li>
          <li>
            <a href="tel:+813XXXXXXXX" className="transition-colors duration-200 hover:text-[#1428A0]">+81-3-XXXX-XXXX</a>
          </li>
        </ul>
      </div>

      {/* Company */}
      <div>
        <h4 className="text-sm font-bold text-black mb-5 uppercase tracking-widest">Company</h4>
        <ul className="space-y-3 text-sm text-tecdia-text/60">
          <li>
            <Link to="/cookie-policy" className="transition-colors duration-200 hover:text-[#1428A0]">Cookie Policy</Link>
          </li>
          <li>
            <Link to="/privacy-policy" className="transition-colors duration-200 hover:text-[#1428A0]">Privacy Policy</Link>
          </li>
          <li>
            <Link to="/company-policy" className="transition-colors duration-200 hover:text-[#1428A0]">Company Policy</Link>
          </li>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="max-w-7xl mx-auto mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs border-t border-[#d9d9d9] text-black/40">
      <p>Â© {new Date().getFullYear()} Tecdia SmartFix. All rights reserved.</p>
      <p>Built for the future of industrial AI.</p>
    </div>
  </footer>
);

export default Footer;

```


## src\components\MessageContent.jsx

```jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-widest transition-all duration-200 px-2 py-1 rounded-md hover:bg-tecdia-text/5 ${copied ? 'text-tecdia-accent' : 'text-tecdia-text/40'}`}
      title="Copy code"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const MessageContent = ({ content, isAI }) => {
  return (
    <div className={`prose max-w-none text-[15px] leading-relaxed ${isAI ? 'text-tecdia-text/90' : 'text-tecdia-textDeep'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const codeText = String(children).replace(/\n$/, '');
            return inline ? (
              <code className="bg-tecdia-background border border-tecdia-border px-1.5 py-0.5 rounded text-sm font-mono text-tecdia-accent" {...props}>
                {children}
              </code>
            ) : (
              <div className="relative group my-4">
                <div className="flex items-center justify-between px-4 py-2 bg-tecdia-background border-b border-tecdia-border rounded-t-xl">
                  <span className="text-[11px] uppercase font-bold text-tecdia-text/60 tracking-widest">
                    {className?.replace('language-', '') || 'Code'}
                  </span>
                  <CopyButton text={codeText} />
                </div>
                <pre className="bg-tecdia-surface p-4 rounded-b-xl border border-t-0 border-tecdia-border overflow-x-auto font-mono text-sm leading-relaxed m-0 text-tecdia-textDeep" {...props}>
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-4 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-tecdia-textDeep">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-tecdia-textDeep">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-2 text-tecdia-textDeep">{children}</h3>,
          strong: ({ children }) => <strong className="text-tecdia-textDeep font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-tecdia-accent/40 pl-4 py-1 italic text-tecdia-text/60 mb-4 bg-tecdia-accent/5 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;

```


## src\components\Navbar.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShieldCheck, LogOut } from 'lucide-react';
import EndShiftModal from './EndShiftModal';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full flex items-center justify-between transition-all duration-500 border-b ${
          scrolled
            ? 'bg-[#000000] border-[#d9d9d9] text-white'
            : 'bg-transparent border-transparent text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className={`w-9 h-9 border flex items-center justify-center transition-all duration-300 ${scrolled ? 'border-[#e0e0e0] bg-[#f7f7f7]' : 'border-white/30 bg-white/10'}`}>
              <img src="/src/assets/logo.png" alt="Tecdia" className={`w-6 h-6 object-contain ${!scrolled ? 'brightness-0 invert' : ''}`} />
            </div>
            <span className={`text-[17px] font-bold tracking-tight transition-all duration-300 hover:text-[#1428A0] ${scrolled ? 'text-black' : 'text-white'}`}>
              Tecdia <span className="text-[#1428A0]">SmartFix</span>
            </span>
          </Link>
  
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            <Link to="/features"
              className={`text-sm font-medium transition-colors duration-200 hover:text-[#1428A0] ${scrolled ? 'text-[#333333]' : 'text-white/80'}`}
            >Features</Link>
  
            <div className={`h-4 w-px ${scrolled ? 'bg-[#e0e0e0]' : 'bg-white/30'}`} />
  
            <button
              onClick={() => setIsEndShiftOpen(true)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:text-[#1428A0] ${scrolled ? 'text-[#333333]' : 'text-white/80'}`}
            >
              <LogOut size={14} /> End Shift
            </button>

            <Link to="/admin/login"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 hover:text-[#1428A0] ${scrolled ? 'text-[#333333]' : 'text-white/80'}`}
            >
              <ShieldCheck size={14} /> Admin
            </Link>
  
            <Link to="/chat" className="btn-primary text-sm flex items-center gap-2 px-5 py-2.5">
              Get Started
            </Link>
          </div>
  
          {/* Mobile menu button */}
          <button
            className={`md:hidden w-9 h-9 flex items-center justify-center border transition-all duration-200 ${scrolled ? 'bg-[#f7f7f7] border-[#e0e0e0] text-[#333333]' : 'bg-white/10 border-white/30 text-white'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}

            className="md:hidden absolute top-[76px] left-4 right-4 rounded-2xl p-6 flex flex-col gap-4 bg-[#ffffff] border border-[#d9d9d9] shadow-xl"

          >
            <Link to="/features" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-tecdia-text/60 hover:text-tecdia-accent transition-colors">Features</Link>

            <hr className="border-tecdia-border" />
            <button 
              onClick={() => { setIsMenuOpen(false); setIsEndShiftOpen(true); }} 
              className="flex items-center gap-2 text-sm font-medium text-red-500/70 hover:text-red-500 transition-colors w-full text-left"
            >
              <LogOut size={14} /> End Shift
            </button>
            <Link to="/admin/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-tecdia-accent/70 hover:text-tecdia-accent transition-colors">
              <ShieldCheck size={14} /> Admin Login
            </Link>
            <Link to="/chat" onClick={() => setIsMenuOpen(false)} className="btn-primary text-center text-sm">
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <EndShiftModal isOpen={isEndShiftOpen} onClose={() => setIsEndShiftOpen(false)} />
    </nav>
  );
};

export default Navbar;

```


## src\components\ProtectedAdminRoute.jsx

```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

export default ProtectedAdminRoute;

```


## src\components\ShiftLogsPanel.jsx

```jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Download, ChevronRight } from 'lucide-react';

const mockLogs = [
  {
    id: 1,
    time: 'Today - 19:00',
    machine: 'Injection Molding Machine',
    worker: 'A. Worker',
    severity: { level: 3, label: '3 - Degraded', color: 'text-[#ea580c]', bg: 'bg-[#ffedd5]', border: 'border-[#fdba74]' },
    anomalies: ['Unusual noise'],
    details: {
      shiftEnded: 'Today - 19:00 (12h shift)',
      workstation: '192.168.1.10',
      notified: 'Admin email - 19:00:14',
      anomalyDescriptions: [
        { title: 'Unusual noise flagged - expected: false', notes: '"Slight clicking near the clamp near end of shift."' }
      ]
    }
  },
  {
    id: 2,
    time: 'Today - 19:00',
    machine: 'Laser Cutting Machine',
    worker: 'S. Mehra',
    severity: { level: 1, label: '1 - Info', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    anomalies: [],
    details: {
      shiftEnded: 'Today - 19:00 (12h shift)',
      workstation: '192.168.1.11',
      notified: '-',
      anomalyDescriptions: []
    }
  },
  {
    id: 3,
    time: 'Today - 07:00',
    machine: 'Hydraulic Press HP-500',
    worker: 'R. Tan',
    severity: { level: 4, label: '4 - Impact', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    anomalies: ['Hyd. pressure +18%'],
    details: {
      shiftEnded: 'Today - 07:00 (12h shift)',
      workstation: '192.168.1.12',
      notified: 'Admin email - 07:00:10',
      anomalyDescriptions: [
        { title: 'Hydraulic pressure high - expected: 75-80 bar', notes: '"Pressure gauge showed 94 bar consistently at end of shift."' }
      ]
    }
  },
  {
    id: 4,
    time: 'Yest - 19:00',
    machine: 'FDM-X300 3D Printer',
    worker: 'K. Iwasaki',
    severity: { level: 1, label: '1 - Info', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    anomalies: [],
    details: {
      shiftEnded: 'Yesterday - 19:00 (12h shift)',
      workstation: '192.168.1.13',
      notified: '-',
      anomalyDescriptions: []
    }
  },
  {
    id: 5,
    time: 'Yest - 07:00',
    machine: 'RA-6200 Robot Arm',
    worker: 'M. Diaz',
    severity: { level: 2, label: '2 - Minor', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    anomalies: ['Slight vibration'],
    details: {
      shiftEnded: 'Yesterday - 07:00 (12h shift)',
      workstation: '192.168.1.14',
      notified: 'Admin email - 07:00:25',
      anomalyDescriptions: [
        { title: 'Vibration detected - expected: normal', notes: '"Base plate is vibrating slightly during fast moves."' }
      ]
    }
  },
  {
    id: 6,
    time: 'Mon - 19:00',
    machine: 'Injection Molding Machine',
    worker: 'A. Worker',
    severity: { level: 1, label: '1 - Info', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    anomalies: [],
    details: {
      shiftEnded: 'Mon - 19:00 (12h shift)',
      workstation: '192.168.1.10',
      notified: '-',
      anomalyDescriptions: []
    }
  },
  {
    id: 7,
    time: 'Mon - 07:00',
    machine: 'Laser Cutting Machine',
    worker: 'S. Mehra',
    severity: { level: 5, label: '5 - Safety', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' },
    anomalies: ['Safety lockout fired'],
    details: {
      shiftEnded: 'Mon - 07:00 (12h shift)',
      workstation: '192.168.1.11',
      notified: 'Admin email, SMS - 07:00:05',
      anomalyDescriptions: [
        { title: 'Safety lockout engaged', notes: '"Door interlock failed during shift, engaged safety stop."' }
      ]
    }
  }
];

const ShiftLogsPanel = () => {
  const [selectedLog, setSelectedLog] = useState(mockLogs[0]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full relative">
      <div className="mb-6">
        <h2 className="text-[28px] font-bold text-tecdia-textDeep leading-tight mb-2">Shift logs</h2>
        <p className="text-[14px] text-tecdia-text/60">End-of-shift machine condition logs. Anomalies are flagged and emailed in real time.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-tecdia-border rounded-2xl p-5 shadow-sm transition-all hover:border-tecdia-accent hover:shadow-md cursor-default">
          <p className="text-[32px] font-bold text-tecdia-textDeep leading-none mb-2">47</p>
          <p className="text-[12px] font-semibold text-tecdia-text/60">Logs this week</p>
        </div>
        <div className="bg-white border border-tecdia-border rounded-2xl p-5 shadow-sm transition-all hover:border-tecdia-accent hover:shadow-md cursor-default">
          <p className="text-[32px] font-bold text-orange-500 leading-none mb-2">12</p>
          <p className="text-[12px] font-semibold text-tecdia-text/60">Anomalies detected</p>
        </div>
        <div className="bg-white border border-tecdia-border rounded-2xl p-5 shadow-sm transition-all hover:border-tecdia-accent hover:shadow-md cursor-default">
          <p className="text-[32px] font-bold text-red-500 leading-none mb-2">3</p>
          <p className="text-[12px] font-semibold text-tecdia-text/60">Severity â‰¥ 4</p>
        </div>
        <div className="bg-white border border-tecdia-border rounded-2xl p-5 shadow-sm transition-all hover:border-tecdia-accent hover:shadow-md cursor-default">
          <p className="text-[32px] font-bold text-emerald-500 leading-none mb-2">92%</p>
          <p className="text-[12px] font-semibold text-tecdia-text/60">Shift completion rate</p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-end gap-3 mb-6">
        <div className="w-48">
          <label className="block text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest mb-1.5">Machine</label>
          <select className="w-full bg-white border border-tecdia-border rounded-lg px-3 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 transition-all">
            <option>All machines</option>
          </select>
        </div>
        <div className="w-32">
          <label className="block text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest mb-1.5">Severity</label>
          <select className="w-full bg-white border border-tecdia-border rounded-lg px-3 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 transition-all">
            <option>â‰¥ 3</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest mb-1.5">Range</label>
          <select className="w-full bg-white border border-tecdia-border rounded-lg px-3 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 transition-all">
            <option>Last 7 days</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest mb-1.5">Worker</label>
          <select className="w-full bg-white border border-tecdia-border rounded-lg px-3 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 transition-all">
            <option>All workers</option>
          </select>
        </div>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecdia-text/40" />
          <input type="text" placeholder="Search workers, notes..." className="w-full bg-white border border-tecdia-border rounded-lg pl-9 pr-3 py-2 text-[13px] font-semibold text-tecdia-textDeep outline-none focus:border-tecdia-accent focus:ring-2 focus:ring-tecdia-accent/20 transition-all placeholder:font-normal placeholder:text-tecdia-text/40" />
        </div>
        <button className="bg-tecdia-textDeep text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-sm hover:bg-black transition-colors ml-4 whitespace-nowrap active:scale-95">
          Export CSV
        </button>
      </div>

      {/* Main Layout: Table and Details Panel */}
      <div className="flex items-start gap-6">
        <div className="flex-1 bg-white border border-tecdia-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tecdia-border bg-tecdia-background/30">
                <th className="px-6 py-4 text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest">Machine</th>
                <th className="px-6 py-4 text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest">Worker</th>
                <th className="px-6 py-4 text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-tecdia-text/50 uppercase tracking-widest">Anomalies</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map(log => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className={`cursor-pointer transition-colors border-b border-tecdia-border/50 last:border-0 ${selectedLog?.id === log.id ? 'bg-tecdia-background' : 'hover:bg-tecdia-background/50'}`}>
                  <td className="px-6 py-4 text-[13px] font-semibold text-tecdia-text/60 whitespace-nowrap">{log.time}</td>
                  <td className="px-6 py-4 text-[13px] font-bold text-tecdia-textDeep">{log.machine}</td>
                  <td className="px-6 py-4 text-[13px] font-semibold text-tecdia-text/80">{log.worker}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${log.severity.bg} ${log.severity.border} ${log.severity.color}`}>
                      {log.severity.label}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-[13px] font-bold ${log.anomalies.length > 0 ? log.severity.color : 'text-tecdia-text/40 font-medium'}`}>
                    {log.anomalies.length > 0 ? log.anomalies.join(', ') : 'â€”'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-tecdia-background/30 px-6 py-3 border-t border-tecdia-border text-[12px] font-medium text-tecdia-text/50">
            Showing 7 of 47 - prev / next
          </div>
        </div>

        {/* Selected Log Details Panel */}
        {selectedLog && (
          <div className="w-[360px] bg-white border border-tecdia-border rounded-2xl p-6 shadow-sm flex-shrink-0 relative overflow-hidden transition-all duration-200">
            <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${
               selectedLog.severity.level >= 4 ? 'bg-red-500' : 
               selectedLog.severity.level >= 3 ? 'bg-orange-500' :
               selectedLog.severity.level === 2 ? 'bg-yellow-500' :
               'bg-emerald-500'
            }`}></div>
            
            <div className="mb-4 pl-1">
              <span className={`inline-block px-2.5 py-0.5 border rounded-md text-[10px] font-bold uppercase tracking-widest mb-3 ${selectedLog.severity.bg} ${selectedLog.severity.color} ${selectedLog.severity.border}`}>
                SEV {selectedLog.severity.level} â€” {selectedLog.severity.label.split(' - ')[1] || 'INFO'}
              </span>
              <h3 className="text-[20px] font-bold text-tecdia-textDeep leading-tight">{selectedLog.machine}</h3>
            </div>

            <div className="space-y-4 mb-6 pl-1">
              <div>
                <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-0.5">Worker</p>
                <p className="text-[13px] font-bold text-tecdia-textDeep">{selectedLog.worker}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-0.5">Shift ended</p>
                <p className="text-[13px] font-bold text-tecdia-textDeep">{selectedLog.details.shiftEnded}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-0.5">Workstation</p>
                <p className="text-[13px] font-bold text-tecdia-accent">{selectedLog.details.workstation}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-0.5">Notified</p>
                <p className="text-[13px] font-bold text-tecdia-textDeep">{selectedLog.details.notified}</p>
              </div>
            </div>

            {selectedLog.details.anomalyDescriptions.length > 0 && (
              <div className="mb-6 pl-1">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${selectedLog.severity.color}`}>Anomalies</p>
                <div className={`bg-white border rounded-xl p-4 space-y-3 ${selectedLog.severity.border} shadow-sm`}>
                  {selectedLog.details.anomalyDescriptions.map((anom, idx) => (
                    <div key={idx}>
                      <p className={`text-[12px] font-bold mb-1 ${selectedLog.severity.color}`}>â€¢ {anom.title}</p>
                      <p className="text-[12px] text-tecdia-text/60 italic">{anom.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-8 pl-1">
              <button className="flex-1 bg-white border border-tecdia-border text-tecdia-textDeep font-bold text-[13px] py-2.5 rounded-xl hover:bg-tecdia-background hover:border-tecdia-accent transition-colors active:scale-95 shadow-sm">
                Acknowledge
              </button>
              <button className="flex-1 bg-tecdia-textDeep text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-black transition-colors active:scale-95 shadow-sm">
                Notify next shift
              </button>
            </div>
            
            <button className="w-full text-center mt-4 text-[12px] font-bold text-tecdia-accent hover:underline transition-colors">
              Open chat thread â†’
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ShiftLogsPanel;

```


## src\components\Sidebar.jsx

```jsx
import React, { useState } from 'react';
import { Plus, Search, MessageSquare, X, Trash2 } from 'lucide-react';

const Sidebar = ({
  currentChatId,
  chats = [],
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.trim().toLowerCase();
  const filteredChats = q
    ? chats.filter(c => (c.title || '').toLowerCase().includes(q))
    : chats;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 w-[280px] h-full flex flex-col border-r border-tecdia-border/60 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Gradient top accent bar */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, var(--accent), var(--border))' }} />

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-[-44px] p-2 bg-white/60 border border-tecdia-border rounded-r-lg md:hidden text-tecdia-text/50 backdrop-blur-sm"
        >
          <X size={20} />
        </button>

        {/* â”€â”€ New Chat â€” flex-shrink-0 keeps it always visible â”€â”€ */}
        <div className="flex-shrink-0 p-4 border-b border-tecdia-border/40">
          <button
            onClick={() => { onNewChat(); if (window.innerWidth < 768) onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-tecdia-border text-tecdia-text/70 text-sm font-semibold hover:bg-white/60 hover:text-tecdia-text hover:border-tecdia-accent/40 transition-all group/btn active:scale-95 bg-white/30"
          >
            <div className="w-5 h-5 rounded-lg bg-tecdia-accent flex items-center justify-center group-hover/btn:scale-110 transition-transform flex-shrink-0">
              <Plus size={13} className="text-white" />
            </div>
            New chat
          </button>
        </div>

        {/* â”€â”€ Search â€” flex-shrink-0 keeps it always visible â”€â”€ */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="relative group/search">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecdia-text/30 group-focus-within/search:text-tecdia-accent transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-white/50 border border-tecdia-border rounded-xl py-2 pl-9 pr-9 text-sm text-tecdia-text placeholder:text-tecdia-text/30 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 focus:bg-white/80 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-tecdia-text/30 hover:text-tecdia-text/70 transition-colors"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* â”€â”€ Chat History â€” only this part scrolls â”€â”€ */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar min-h-0">
          <div className="text-[10px] font-black text-tecdia-text/40 uppercase tracking-[0.2em] mb-3 px-2 pt-2">Recents</div>
          {chats.length === 0 ? (
            <p className="text-xs text-tecdia-text/30 px-2 py-6 text-center italic">No chats yet</p>
          ) : filteredChats.length === 0 ? (
            <p className="text-xs text-tecdia-text/30 px-2 py-6 text-center italic">No chats match "{searchQuery}"</p>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 rounded-xl transition-all border-2 ${currentChatId === chat.id
                    ? 'bg-white border-tecdia-accent/30 text-tecdia-text shadow-md border-l-[3px] border-l-tecdia-accent'
                    : 'border-transparent text-tecdia-text/60 hover:bg-white/50 hover:border-tecdia-border hover:text-tecdia-text'
                  }`}
              >
                <button
                  onClick={() => { onSelectChat(chat.id); if (window.innerWidth < 768) onClose(); }}
                  className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm text-left truncate"
                >
                  <MessageSquare size={14} className={currentChatId === chat.id ? 'text-tecdia-accent' : 'text-tecdia-text/30'} />
                  <span className="truncate font-medium">{chat.title}</span>
                </button>

                <button
                  onClick={() => onDeleteChat(chat.id)}
                  className="px-2 py-2 text-transparent group-hover:text-tecdia-text/20 hover:!text-red-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

```


## src\context\AdminAuthContext.jsx

```jsx
import React, { createContext, useContext } from 'react';
import { fetchApi } from '../api/apiClient';
import { useAuth } from './AuthContext';

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const { fetchSession } = useAuth();

  /**
   * POST /auth/request-link { email }
   * Server always returns 200 (to prevent email enumeration).
   * Actual email is only sent to allowlisted addresses.
   */
  const requestLoginLink = async (email) => {
    try {
      await fetchApi('/auth/request-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true };
    } catch (err) {
      // 422 = invalid email format
      return { success: false, error: err.detail || 'Failed to request link.' };
    }
  };

  /**
   * Reads ?login_error from the current URL.
   * The server sets this param when redirecting after an invalid/expired token:
   *   GET /auth/verify?token=... â†’ 302 /?login_error=expired
   *
   * Call this on AdminLogin mount.
   * @returns {string|null} Error message to show, or null.
   */
  const checkLoginError = () => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('login_error');
    if (err === 'expired') {
      return 'This login link has expired or was already used. Please request a new one.';
    }
    if (err) {
      return `Login failed: ${err}`;
    }
    return null;
  };

  /**
   * Called after the browser lands on / following a successful magic-link redirect.
   * The server already set the session cookie, so we just refresh /auth/me.
   */
  const refreshAfterVerify = async () => {
    await fetchSession();
  };

  const adminLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    await fetchSession();
  };

  return (
    <AdminAuthContext.Provider
      value={{ requestLoginLink, checkLoginError, refreshAfterVerify, adminLogout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};

```


## src\context\AlertContext.jsx

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../api/apiClient';
import { useAuth } from './AuthContext';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [alertThreshold, setAlertThreshold] = useState(12);
  const { user } = useAuth();

  /**
   * GET /admin/alerts â€” fetches all alerts, newest first.
   * Only runs when the user is an admin.
   */
  const fetchAlerts = async () => {
    if (user.role !== 'admin') return;
    try {
      const data = await fetchApi('/admin/alerts');
      if (data) {
        setAlerts(data.alerts || []);
        if (data.threshold !== undefined) {
          setAlertThreshold(data.threshold);
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user.role]);

  /**
   * DELETE /admin/alerts â€” clears all alert history.
   * Maps to the "Clear All History" button in the Admin Dashboard.
   */
  const clearAlerts = async () => {
    try {
      await fetchApi('/admin/alerts', { method: 'DELETE' });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  /**
   * POST /admin/alerts/test â€” injects a synthetic alert for email pipeline verification.
   */
  const testAlert = async () => {
    try {
      await fetchApi('/admin/alerts/test', { method: 'POST' });
      await fetchAlerts(); // Refresh the list to show the new test alert
      return { success: true };
    } catch (err) {
      console.error('Failed to inject test alert:', err);
      return { success: false, error: err.detail || 'Test alert failed' };
    }
  };

  return (
    <AlertContext.Provider value={{
      alerts,
      alertThreshold,
      clearAlerts,
      testAlert,
      refreshAlerts: fetchAlerts,
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlerts must be used within AlertProvider');
  return context;
};

```


## src\context\AuthContext.jsx

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../api/apiClient';

const AuthContext = createContext();

/**
 * Domain values as defined in API Contract v2 Â§4.1.
 * Exported for use in the domain selector UI (LandingPage).
 */
export const EXPERTISE_DOMAINS = [
  'General',
  'Fabrication',
  'Manufacturing',
  'Additive Manufacturing',
  'Automation',
  'Heavy Machinery',
  'All Access',
];

/** Null/unauthenticated user shape */
const GUEST = {
  authenticated: false,
  role: null,
  domain: null,
  email: null,
  session_expires_at: null,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(GUEST);
  const [loading, setLoading] = useState(true);

  /**
   * Calls GET /auth/me â€” the single source of truth for session state.
   * Maps the contract response directly onto user state.
   */
  const fetchSession = async () => {
    try {
      const data = await fetchApi('/auth/me');
      if (data && data.authenticated) {
        setUser({
          authenticated: data.authenticated,
          role: data.role,           // "worker" | "admin"
          domain: data.domain,       // one of EXPERTISE_DOMAINS
          email: data.email || null,
          session_expires_at: data.session_expires_at || null,
        });
      } else {
        setUser(GUEST);
      }
    } catch (err) {
      // 401 â†’ not authenticated
      setUser(GUEST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  /**
   * Worker login â€” POST /auth/worker-session { domain }.
   * Sets the worker_session cookie and refreshes /auth/me.
   */
  const login = async (domain) => {
    try {
      await fetchApi('/auth/worker-session', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
      await fetchSession();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.detail || 'Login failed' };
    }
  };

  /**
   * POST /auth/logout â€” clears session cookies server-side.
   */
  const logout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch {
      // ignore â€” clear local state regardless
    }
    setUser(GUEST);
  };

  const isAdmin = user.role === 'admin';
  const isWorker = user.role === 'worker';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchSession, isAdmin, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

```


## src\context\MachineContext.jsx

```jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../api/apiClient';
import { uploadMachine, pollJob } from '../api/apiClient';
import { useAuth } from './AuthContext';

const MachineContext = createContext();

export const MachineProvider = ({ children }) => {
  const [machines, setMachines] = useState([]);
  const [activeJob, setActiveJob] = useState(null); // { job_id, machine_id, status, step, progress, error }
  const { user } = useAuth();

  /**
   * Fetch machines from the correct endpoint based on role.
   * Admins get extra metadata (uploaded_at, uploaded_by, pdf_size_bytes) from /admin/machines.
   * Workers get filtered results from /machines.
   */
  const fetchMachines = useCallback(async () => {
    if (!user.authenticated) return;
    try {
      const endpoint = user.role === 'admin' ? '/admin/machines' : '/machines';
      const data = await fetchApi(endpoint);
      if (data && data.machines) {
        setMachines(data.machines.map(m => ({
          ...m,
          // Keep display_name as name for UI compatibility
          name: m.display_name || m.name || m.id,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    }
  }, [user.authenticated, user.role]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // â”€â”€ Silent cross-user sync â”€â”€
  // When an admin uploads a new machine (or deletes one), other authenticated
  // users won't see it until they refresh. Polling /machines every 30s closes
  // that gap with negligible cost (tiny JSON, no LLM call). Polling pauses
  // when the tab is hidden so background tabs don't keep hammering the API.
  // Real-time push (SSE / WebSocket) is the v2 upgrade once state moves off
  // a single Python process.
  useEffect(() => {
    if (!user.authenticated) return;
    let intervalId = null;
    const start = () => {
      if (intervalId == null) intervalId = setInterval(fetchMachines, 30_000);
    };
    const stop = () => {
      if (intervalId != null) { clearInterval(intervalId); intervalId = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMachines(); // catch up immediately on focus
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user.authenticated, fetchMachines]);

  /**
   * Start polling a job every 2 seconds until it's done or failed.
   * Per contract Â§4.3: poll while status is not "done" or "failed".
   */
  const startPolling = useCallback((jobId) => {
    const intervalId = setInterval(async () => {
      try {
        const job = await pollJob(jobId);
        setActiveJob(job);

        if (job.status === 'done') {
          clearInterval(intervalId);
          await fetchMachines(); // New machine now appears in /machines
        } else if (job.status === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Job poll failed:', err);
        clearInterval(intervalId);
        setActiveJob(prev => prev ? { ...prev, status: 'failed', error: err.detail || 'Polling error' } : null);
      }
    }, 2000);

    // Safety: stop polling after 10 minutes regardless
    setTimeout(() => clearInterval(intervalId), 10 * 60 * 1000);
  }, [fetchMachines]);

  /**
   * Upload a new machine PDF via POST /admin/machines (multipart/form-data).
   * Returns immediately with a job_id; caller should watch `activeJob` for progress.
   *
   * @param {FormData} formData  Built by AdminDashboard with all required fields.
   */
  const addMachine = async (formData) => {
    try {
      setActiveJob({ status: 'queued', step: 'Queuing uploadâ€¦', progress: 0 });
      const result = await uploadMachine(formData);
      // result = { job_id, status: "queued" }
      setActiveJob({ job_id: result.job_id, status: result.status, step: 'Queued', progress: 0 });
      startPolling(result.job_id);
      return { success: true, job_id: result.job_id };
    } catch (err) {
      setActiveJob({ status: 'failed', error: err.detail || 'Upload failed' });
      return { success: false, error: err.detail || 'Upload failed', code: err.code };
    }
  };

  /** Clear the active job display (e.g. after user dismisses progress). */
  const clearActiveJob = () => setActiveJob(null);

  const deleteMachine = async (id) => {
    try {
      const result = await fetchApi(`/admin/machines/${id}`, { method: 'DELETE' });
      setMachines(prev => prev.filter(m => m.id !== id));
      return { success: true, deletedChunks: result.deleted_chunks };
    } catch (err) {
      return { success: false, error: err.detail || 'Deletion failed' };
    }
  };

  return (
    <MachineContext.Provider value={{
      machines,
      activeJob,
      addMachine,
      deleteMachine,
      clearActiveJob,
      refreshMachines: fetchMachines,
    }}>
      {children}
    </MachineContext.Provider>
  );
};

export const useMachines = () => {
  const context = useContext(MachineContext);
  if (!context) throw new Error('useMachines must be used within MachineProvider');
  return context;
};

```


## src\context\ThemeContext.jsx

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('tecdia-theme');
    return saved || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('tecdia-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

```


## src\hooks\useChatHistory.js

```javascript
import { useState, useEffect } from 'react';

/**
 * useChatHistory â€” sidebar chat list, scoped per machine.
 *
 * Storage key  : tecdia_chat_history:{machineKey}
 * Lifetime     : persists in localStorage forever (until cleared by the user)
 *
 * Each machine gets its own isolated history â€” switching machines must remount
 * this hook (via a React `key` prop on ChatPage) so we read fresh data from the
 * new namespace. Without remount the `useState` initializer wouldn't re-run.
 */

const PREFIX = 'tecdia_chat_history';
const keyFor = (machineKey) => `${PREFIX}:${machineKey || 'ALL'}`;

const loadChats = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useChatHistory = (machineKey = 'ALL') => {
  const storageKey = keyFor(machineKey);

  const [chats, setChats] = useState(() => loadChats(storageKey));
  const [currentChatId, setCurrentChatId] = useState(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(chats));
  }, [chats, storageKey]);

  const currentChat = chats.find(c => c.id === currentChatId) || null;

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      lastModified: new Date().toISOString(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const addMessage = (chatId, message) => {
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === chatId) {
        const updatedMessages = [...chat.messages, {
          ...message,
          id: message.id || Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];

        // Update title if it's the first message
        let newTitle = chat.title;
        if (chat.messages.length === 0 && message.sender === 'user') {
          newTitle = message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '');
        }

        return {
          ...chat,
          messages: updatedMessages,
          title: newTitle,
          lastModified: new Date().toISOString()
        };
      }
      return chat;
    }));
  };

  const deleteChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  const clearHistory = () => {
    setChats([]);
    setCurrentChatId(null);
  };

  return {
    chats,
    currentChatId,
    currentChat,
    setCurrentChatId,
    createNewChat,
    addMessage,
    deleteChat,
    clearHistory
  };
};

```


## src\hooks\useChatSession.js

```javascript
/**
 * useChatSession â€” API Contract v2 Â§7 compliant chat history hook, scoped per machine.
 *
 * Storage key : smartfix.history:{machineKey}
 * Shape stored: { history: [{role, content}], lastActivity: number }
 * Idle expiry : 15 minutes of inactivity clears history on next app load.
 *
 * The `history` array is sent directly as the `history` field in POST /query.
 * Each turn is a { role: "user" | "assistant", content: string } object.
 *
 * Scoped per machine so follow-up context never leaks across machines â€” asking
 * "and what about the next step?" on the laser-cutter chat must NOT carry an
 * injection-molding question in as the prior turn.
 */

import { useState, useEffect, useCallback } from 'react';

const PREFIX = 'smartfix.history';
const IDLE_MS = 15 * 60 * 1000; // 15 minutes

const keyFor = (machineKey) => `${PREFIX}:${machineKey || 'ALL'}`;

const loadFromStorage = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { history: [], lastActivity: Date.now() };
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.lastActivity || 0) > IDLE_MS) {
      localStorage.removeItem(storageKey);
      return { history: [], lastActivity: Date.now() };
    }
    return parsed;
  } catch {
    return { history: [], lastActivity: Date.now() };
  }
};

export const useChatSession = (machineKey = 'ALL') => {
  const storageKey = keyFor(machineKey);
  const [session, setSession] = useState(() => loadFromStorage(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(session));
  }, [session, storageKey]);

  const appendTurn = useCallback((userContent, assistantContent) => {
    setSession(prev => ({
      history: [
        ...prev.history,
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ],
      lastActivity: Date.now(),
    }));
  }, []);

  const updateLastActivity = useCallback(() => {
    setSession(prev => ({ ...prev, lastActivity: Date.now() }));
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSession({ history: [], lastActivity: Date.now() });
  }, [storageKey]);

  return {
    history: session.history,
    appendTurn,
    updateLastActivity,
    clearHistory,
  };
};

```


## src\hooks\useWorkstation.js

```javascript
import { useEffect, useState } from 'react';
import { fetchApi } from '../api/apiClient';

/**
 * Single-shot probe of GET /workstation on mount.
 *
 * If the caller's IP is in `data/workstations.json`, the backend returns
 *   { bound: true, ip, machine: { id, display_name, category, ... } }
 * and sets a `worker_session` cookie inline so the next /query is authenticated.
 *
 * If unbound:
 *   { bound: false, ip }
 * and the frontend falls back to the existing LandingPage â†’ MachinesPage flow.
 *
 * Network failure is treated as "unbound" so the app never gets stuck on a
 * loading spinner when the backend is down.
 */
export function useWorkstation() {
  const [state, setState] = useState({
    loading: true,
    bound: false,
    machine: null,
    ip: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchApi('/workstation')
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          bound: !!data?.bound,
          machine: data?.machine || null,
          ip: data?.ip || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, bound: false, machine: null, ip: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

```


## src\pages\AdminDashboard.jsx

```jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Upload, FileText, Image, Trash2, LogOut, Settings2,
  Printer, Scissors, Bot, Wrench, Gauge, Cpu, ChevronRight,
  CheckCircle, X, LayoutDashboard, Package, Database, Shield, AlertCircle,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, Pipette, BellRing, BarChart3, TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useMachines } from '../context/MachineContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';
import ShiftLogsPanel from '../components/ShiftLogsPanel';

const ICON_OPTIONS = [
  { label: 'Settings',  value: 'Settings2',   icon: Settings2   },
  { label: 'Gauge',     value: 'Gauge',        icon: Gauge        },
  { label: 'Printer',   value: 'Printer',      icon: Printer      },
  { label: 'Scissors',  value: 'Scissors',     icon: Scissors     },
  { label: 'Robot',     value: 'Bot',          icon: Bot          },
  { label: 'Wrench',    value: 'Wrench',       icon: Wrench       },
  { label: 'CPU',       value: 'Cpu',          icon: Cpu          },
  { label: 'Factory',   value: 'Factory',      icon: Factory      },
  { label: 'Cog',       value: 'Cog',          icon: Cog          },
  { label: 'Activity',  value: 'Activity',     icon: Activity     },
  { label: 'Flame',     value: 'Flame',        icon: Flame        },
  { label: 'Monitor',   value: 'Monitor',      icon: Monitor      },
  { label: 'Layers',    value: 'Layers',       icon: Layers       },
  { label: 'Radio',     value: 'Radio',        icon: Radio        },
  { label: 'Thermo',    value: 'Thermometer',  icon: Thermometer  },
  { label: 'Drive',     value: 'HardDrive',    icon: HardDrive    },
  { label: 'Activity',  value: 'Activity',     icon: Activity     },
  { label: 'Truck',     value: 'Truck',        icon: Truck        },
  { label: 'Flask',     value: 'FlaskConical', icon: FlaskConical },
  { label: 'Upload',    value: 'Upload',       icon: Upload       },
];

const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Activity, Truck, FlaskConical, Upload,
};

const COLOR_OPTIONS = [
  { label: 'Theme Blue', value: 'text-tecdia-accent', glow: 'rgba(0,169,255,0.15)', border: 'hover:border-tecdia-accent/40', dot: 'bg-tecdia-accent' },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB â€” matches backend cap (API_CONTRACT Â§4.3)
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const EMPTY_FORM = {
  machine_id: '',         // [A-Z0-9_]+ slug â€” required by API
  name: '', description: '', category: '', icon: 'Settings2',
  color: 'text-tecdia-accent', glow: 'rgba(0,169,255,0.15)',
  border: 'hover:border-tecdia-accent/40',
  customColor: '',
  customIconUrl: null,
  iconFile: null,         // File object for icon upload
  pdfFile: null,          // File object for PDF upload
  files: [],
  significance: 3,
};


const Toast = ({ message, onClose }) => (
  <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white/80 backdrop-blur-md border border-tecdia-accent/30 text-tecdia-accent px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium">
    <div className="w-7 h-7 rounded-full bg-tecdia-accent/10 flex items-center justify-center flex-shrink-0">
      <CheckCircle size={15} className="text-tecdia-accent" />
    </div>
    {message}
    <button onClick={onClose} className="ml-2 text-tecdia-text/40 hover:text-tecdia-text transition-colors"><X size={13} /></button>
  </motion.div>
);

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white/40 backdrop-blur-md border border-tecdia-border rounded-2xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const InputField = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest">{label}</label>
    {props.as === 'textarea'
      ? <textarea {...props} as={undefined} className="w-full bg-tecdia-background border border-tecdia-border rounded-xl py-3 px-4 text-tecdia-text text-sm placeholder:text-tecdia-text/40 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all resize-none" />
      : <input {...props} className="w-full bg-tecdia-background border border-tecdia-border rounded-xl py-3 px-4 text-tecdia-text text-sm placeholder:text-tecdia-text/40 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all" />
    }
  </div>
);

// Auto-generate a machine_id slug from a display name
const toSlug = (name) =>
  name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Ingestion job lifecycle. Order matters â€” drives the stage display.
const JOB_STAGES = [
  { key: 'queued',    label: 'Queued',    pct: 0   },
  { key: 'parsing',   label: 'Parsing',   pct: 20  },
  { key: 'chunking',  label: 'Chunking',  pct: 40  },
  { key: 'embedding', label: 'Embedding', pct: 65  },
  { key: 'indexing',  label: 'Indexing',  pct: 85  },
  { key: 'done',      label: 'Done',      pct: 100 },
];
const STAGE_PCT = Object.fromEntries(JOB_STAGES.map(s => [s.key, s.pct]));

/**
 * Ingestion progress, Elisa-style:
 *   - Single horizontal bar with rounded ends, soft background, accent fill.
 *   - Animated diagonal stripes overlay while the job is in-progress; turns
 *     solid (no stripes) on done / failed.
 *   - Stage chips beneath the bar light up as the job advances, so the worker
 *     can see exactly which step is running.
 *   - Header pill shows the active stage label + percentage.
 *
 * Reference: https://designsystem.elisa.fi/9b207b2c3/p/159293-progressbar
 */
const IngestionProgress = ({ job, onDismiss }) => {
  if (!job) return null;
  const isFailed = job.status === 'failed';
  const isDone   = job.status === 'done';
  const isActive = !isFailed && !isDone;
  const pct      = isDone ? 100
                 : (job.progress != null ? Math.round(job.progress * 100)
                    : STAGE_PCT[job.status] ?? 0);
  const currentStageIdx = JOB_STAGES.findIndex(s => s.key === job.status);
  const headerLabel = isFailed
    ? 'Ingestion failed'
    : (JOB_STAGES.find(s => s.key === job.status)?.label || 'Working');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`mb-6 rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${
        isFailed ? 'bg-[#E6F7FF]/60 border-[#0057D9]/40 shadow-inner'
        : isDone ? 'bg-[#0057D9]/5 border-[#0057D9]/20'
        : 'bg-white border-tecdia-border'
      }`}
    >
      {/* â”€â”€ Header: status pill + dismiss â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              isFailed ? 'bg-[#0A2540]/10 text-[#0A2540] border border-[#0A2540]/20'
              : isDone ? 'bg-[#0057D9] text-white border border-[#0057D9]'
              : 'bg-[#42A5F5]/10 text-[#42A5F5] border border-[#42A5F5]/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              isFailed ? 'bg-[#0A2540] animate-pulse'
              : isDone ? 'bg-white'
              : 'bg-[#42A5F5] animate-pulse'
            }`} />
            {isFailed ? 'FAILED' : isDone ? 'COMPLETE' : 'IN PROGRESS'}
          </span>
          <span className="text-sm font-bold text-tecdia-textDeep">
            {headerLabel}
          </span>
          {!isFailed && (
            <span className="text-xs font-mono font-semibold text-tecdia-text/50 tabular-nums">
              {pct}%
            </span>
          )}
        </div>
        {(isDone || isFailed) && (
          <button
            onClick={onDismiss}
            className="text-xs font-medium text-tecdia-text/40 hover:text-tecdia-text px-2 py-1 rounded-md hover:bg-white/60 transition-all"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* â”€â”€ Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className={`relative w-full rounded-full h-2.5 mb-4 overflow-hidden bg-[#E6F7FF]`}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`relative h-full rounded-full overflow-hidden ${
            isFailed ? 'bg-[#0A2540]/30'
            : isDone ? 'bg-[#0057D9] shadow-[0_0_10px_rgba(0,87,217,0.2)]'
            : 'bg-[#1E88E5]'
          }`}
        >
          {/* Diagonal stripes shimmer â€” only while in-progress */}
          {isActive && (
            <div
              className="absolute inset-0 opacity-30 ingestion-stripes"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.8) 6px 12px)',
                backgroundSize: '17px 17px',
              }}
            />
          )}
        </motion.div>
      </div>

      {/* â”€â”€ Stage chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {JOB_STAGES.slice(0, -1).map((stage, i) => {
          const reached = currentStageIdx >= i || isDone;
          const isCurrent = !isFailed && !isDone && job.status === stage.key;
          return (
            <div
              key={stage.key}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${
                isFailed && reached
                  ? 'bg-tecdia-accent/20 text-tecdia-textDeep'
                  : isCurrent
                    ? 'bg-[#1E88E5] text-white shadow-sm'
                    : reached
                      ? 'bg-[#42A5F5]/10 text-[#42A5F5]'
                      : 'bg-[#E6F7FF] text-tecdia-text/30'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${
                isCurrent ? 'bg-white animate-pulse'
                : reached ? (isFailed ? 'bg-tecdia-accent' : 'bg-tecdia-accent/60')
                : 'bg-tecdia-text/20'
              }`} />
              {stage.label}
            </div>
          );
        })}
      </div>

      {/* â”€â”€ Live step / error message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <p className={`mt-3 text-[11px] font-medium ${
        isFailed ? 'text-tecdia-textDeep'
        : isDone ? 'text-tecdia-accent'
        : 'text-tecdia-text/60'
      }`}>
        {isFailed
          ? (job.error || 'Unknown error during ingestion')
          : isDone
            ? (job.step || 'Machine indexed and ready for worker queries.')
            : (job.step || 'Workingâ€¦')}
      </p>
    </motion.div>
  );
};


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AuditPanel
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tails GET /admin/audit and renders an append-only table of admin actions.
// Filterable by action prefix (auth / machine / all). Backend reads from the
// JSONL file at data/audit.jsonl â€” entries persist across server restarts.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const AUDIT_ACTION_COLORS = {
  'auth.admin_login':       { className: 'bg-tecdia-accent text-white', label: 'Login' },
  'auth.admin_logout':      { className: 'bg-white text-tecdia-textDeep border border-tecdia-border', label: 'Logout' },
  'machine.create':         { className: 'bg-tecdia-textDeep text-white', label: 'Machine Created' },
  'machine.delete':         { className: 'bg-tecdia-textDeep/80 text-white', label: 'Machine Deleted' },
  'machine.ingest_complete':{ className: 'bg-tecdia-surface text-tecdia-textDeep border border-tecdia-accent/50', label: 'Ingest Complete' },
  'machine.ingest_failed':  { className: 'bg-transparent text-tecdia-textDeep border border-tecdia-textDeep/30', label: 'Ingest Failed' },
};

const AuditPanel = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all'); // 'all' | 'auth.' | 'machine.'
  const [expanded, setExpanded] = useState(new Set());

  const load = useCallback(async (prefix = filter) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '200' });
      if (prefix !== 'all') qs.set('action_prefix', prefix);
      const d = await fetchApi(`/admin/audit?${qs.toString()}`);
      setEntries(d.entries || []);
      setError(null);
    } catch (e) {
      setError(e.detail || e.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(filter); }, [filter, load]);

  const toggleExpanded = (idx) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="relative z-10">
      {/* Background Glows for premium feel */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-tecdia-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-tecdia-textDeep to-tecdia-accent flex items-center gap-3">
            <Shield size={28} className="text-tecdia-accent" />
            Audit Log
          </h2>
          <p className="text-[11px] font-semibold text-tecdia-text/50 uppercase tracking-[0.2em] mt-1.5 ml-10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tecdia-accent animate-pulse" />
            Append-only security record
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-xl border border-tecdia-border/50 shadow-sm relative">
            {[
              { id: 'all',       label: 'All Activity' },
              { id: 'auth.',     label: 'Authentication' },
              { id: 'machine.',  label: 'Machine Events' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition-all duration-300 relative z-10 ${
                  filter === f.id
                    ? 'text-white shadow-md'
                    : 'text-tecdia-text/60 hover:text-tecdia-textDeep hover:bg-white/50'
                }`}>
                {filter === f.id && (
                  <motion.div layoutId="auditTab" className="absolute inset-0 bg-gradient-to-r from-tecdia-accent to-blue-500 rounded-lg -z-10" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                )}
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => load(filter)} className="group bg-white hover:bg-tecdia-accent hover:text-white text-tecdia-textDeep border border-tecdia-border shadow-sm text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2">
            <Activity size={14} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            Sync
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-6 flex items-center gap-3 font-medium backdrop-blur-md relative z-10">
          <AlertCircle size={18} />
          {error}
        </motion.div>
      )}

      {loading && entries.length === 0 ? (
        <div className="p-20 flex flex-col items-center justify-center gap-4 text-tecdia-text/50 relative z-10">
          <Activity size={32} className="animate-spin text-tecdia-accent opacity-50" />
          <span className="text-sm font-semibold tracking-wider uppercase">Retrieving secure logs...</span>
        </div>
      ) : entries.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-12 text-center relative overflow-hidden z-10">
          <Shield size={48} className="mx-auto text-tecdia-accent/20 mb-4" />
          <p className="text-lg font-bold text-tecdia-textDeep mb-2">No Security Events Found</p>
          <p className="text-sm text-tecdia-text/60">The audit ledger is currently empty for this filter.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10">
          <div className="bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl overflow-hidden relative">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-white/50 border-b border-tecdia-border/40 text-[10px] font-black uppercase tracking-[0.15em] text-tecdia-text/40">
                    <th className="text-left py-4 px-6 font-semibold">Timestamp <span className="font-mono lowercase text-[9px]">(utc)</span></th>
                    <th className="text-left py-4 px-6 font-semibold">Event Vector</th>
                    <th className="text-left py-4 px-6 font-semibold">Principal</th>
                    <th className="text-left py-4 px-6 font-semibold">Resource</th>
                    <th className="text-left py-4 px-6 font-semibold">Origin IP</th>
                    <th className="text-left py-4 px-6 font-semibold">Resolution</th>
                    <th className="text-right py-4 px-6 font-semibold">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tecdia-border/30">
                  <AnimatePresence>
                    {entries.map((e, i) => {
                      const colorObj = AUDIT_ACTION_COLORS[e.action] || { className: 'bg-tecdia-surface text-tecdia-textDeep border border-tecdia-border', label: e.action };
                      const isFailure = e.status === 'failure';
                      const hasDetails = e.details && Object.keys(e.details).length > 0;
                      const isExpanded = expanded.has(i);
                      let ts = e.ts;
                      try { ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19); } catch { /* keep raw */ }
                      
                      return (
                        <React.Fragment key={`${e.ts}-${i}`}>
                          <motion.tr 
                            onClick={() => toggleExpanded(i)}
                            initial={{ opacity: 0, backgroundColor: 'rgba(255,255,255,0)' }} 
                            animate={{ opacity: 1, backgroundColor: isExpanded ? 'rgba(0,169,255,0.08)' : 'rgba(255,255,255,0)' }}
                            className={`transition-colors duration-200 cursor-pointer group ${isExpanded ? 'border-l-2 border-tecdia-accent' : 'border-l-2 border-transparent'}`}
                          >
                            <td className={`py-3.5 px-6 font-mono text-[11px] tabular-nums whitespace-nowrap transition-colors ${isExpanded ? 'text-tecdia-accent font-bold' : 'text-tecdia-textDeep/70'}`}>
                              {ts}
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg ${colorObj.className}`}>
                                {colorObj.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-500">
                                  {e.actor ? e.actor.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className={`text-xs font-semibold truncate max-w-[200px] transition-colors ${isExpanded ? 'text-tecdia-accent' : 'text-tecdia-textDeep'}`}>{e.actor || 'Anonymous'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className="font-mono text-[11px] text-tecdia-text/60 truncate max-w-[200px] block bg-white/50 px-2 py-0.5 rounded-md border border-black/5">{e.target || '*'}</span>
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-1.5">
                                <Monitor size={12} className="text-tecdia-text/30" />
                                <span className="font-mono text-[11px] text-tecdia-text/60 tracking-tight">{e.ip || 'â€”'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                                isFailure 
                                  ? 'bg-tecdia-textDeep/5 border-tecdia-textDeep/20 text-tecdia-textDeep' 
                                  : 'bg-tecdia-accent/10 border-tecdia-accent/30 text-tecdia-accent'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isFailure ? 'bg-tecdia-textDeep animate-pulse' : 'bg-tecdia-accent'}`} />
                                {isFailure ? 'REJECTED' : 'SUCCESS'}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              {hasDetails && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleExpanded(i); }} 
                                  className={`p-1.5 rounded-lg transition-all duration-300 ${isExpanded ? 'bg-tecdia-accent text-white shadow-md' : 'bg-white text-tecdia-text/40 hover:text-tecdia-accent hover:shadow-sm border border-transparent hover:border-tecdia-border/50'}`}
                                >
                                  <ChevronRight size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              )}
                            </td>
                          </motion.tr>
                          
                          {/* Expanded payload details */}
                          <AnimatePresence>
                            {isExpanded && hasDetails && (
                              <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-gradient-to-b from-white/60 to-transparent"
                              >
                                <td colSpan={7} className="px-6 py-4 border-b border-tecdia-border/20">
                                  <div className="bg-[#0A2540] rounded-xl p-4 shadow-inner relative overflow-hidden group/code">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-tecdia-accent" />
                                    <div className="flex items-center justify-between mb-2 opacity-60">
                                      <span className="text-[10px] font-mono text-blue-300 uppercase tracking-widest flex items-center gap-1.5"><Database size={10} /> Event Payload</span>
                                    </div>
                                    <pre className="text-[11px] font-mono text-blue-100 overflow-x-auto custom-scrollbar pb-2">
                                      {JSON.stringify(e.details, null, 2)}
                                    </pre>
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            <div className="bg-white/50 border-t border-tecdia-border/30 px-6 py-4 flex items-center justify-between">
              <p className="text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest flex items-center gap-2">
                <Layers size={12} />
                Showing {entries.length} log {entries.length === 1 ? 'entry' : 'entries'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-tecdia-text/40">
                <Activity size={12} className="text-tecdia-accent" /> Real-time sync active
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AnalyticsPanel
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Fetches GET /admin/analytics on mount and renders five widgets:
//   1. KPI cards            (totals: queries, alerts, alert-rate, machines)
//   2. Per-machine table    (per-machine activity + top codes + avg severity)
//   3. Code frequency bars  (top 15 alarm/error codes globally)
//   4. Severity donut       (distribution across the five severity levels)
//   5. 24h activity bars    (queries per hour, last 24h)
//
// All charts use plain <div>s with width%/clip-path so no extra dep is needed.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const SEVERITY_PALETTE = {
  '1': { color: '#B6E6FF', label: 'Informational' },
  '2': { color: '#7CC7FF', label: 'Minor' },
  '3': { color: '#42A5F5', label: 'Degraded' },
  '4': { color: '#0057D9', label: 'Production Impact' },
  '5': { color: '#0A2540', label: 'Safety Risk' },
};

const MACHINE_COLORS = ['#0057D9', '#42A5F5', '#0A2540', '#7CC7FF', '#1E88E5', '#B6E6FF'];

const AnalyticsPanel = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchApi('/admin/analytics');
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.detail || e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const seed = async ({ replace = false } = {}) => {
    setSeeding(true);
    try {
      await fetchApi(`/admin/_seed-analytics?count=120&replace=${replace}`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e.detail || e.message || 'Failed to seed analytics');
    } finally {
      setSeeding(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-tecdia-text/50 text-sm">
        Loading analyticsâ€¦
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-red-700">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const {
    totals, per_machine, code_frequency, severity_distribution, queries_per_hour_24h,
    top_questions, failure_likelihood = [], depreciation = [],
  } = data;
  const isEmpty = totals.queries === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* â”€â”€ header + refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-tecdia-textDeep flex items-center gap-2.5">
            <BarChart3 size={22} className="text-tecdia-accent" />
            Fleet Analytics
          </h2>
          <p className="text-[11px] font-medium text-tecdia-text/40 uppercase tracking-widest mt-1 ml-8">Real-time system diagnostics & query analytics</p>
        </div>
        <div className="flex items-center gap-2 w-fit">
          <button
            onClick={() => seed({ replace: true })}
            disabled={seeding || loading}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 disabled:opacity-50"
            title="Replace the in-memory query log with synthetic demo data"
          >
            <Database size={14} className={seeding ? 'animate-pulse' : ''} />
            {seeding ? 'Seeding...' : isEmpty ? 'Populate Demo Data' : 'Re-seed Demo Data'}
          </button>
          <button
            onClick={load}
            className="btn-secondary text-xs px-5 py-2 flex items-center gap-2"
          >
            <Activity size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-2xl p-5 mb-6 text-sm text-tecdia-text/70 flex items-center justify-between gap-4">
          <div>
            <span className="font-bold text-tecdia-textDeep">No query data yet.</span>
            {' '}Click <span className="font-semibold text-tecdia-accent">Populate Demo Data</span> to load synthetic activity for the demo, or wait for workers to start asking questions.
          </div>
        </div>
      )}

      {/* â”€â”€ 1. KPI cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Queries"  value={totals.queries.toLocaleString()} icon={FileText} />
        <KpiCard label="Alerts Fired"   value={totals.alerts.toLocaleString()}   icon={AlertCircle} accent="border-[#0057D9]/20 shadow-[0_0_15px_rgba(0,87,217,0.05)]" />
        <KpiCard label="Alert Rate"     value={`${totals.alert_rate_pct}%`}      icon={TrendingUp} accent="border-[#1E88E5]/20" />
        <KpiCard label="Active Machines" value={totals.machines}                 icon={Package} />
      </div>

      {/* â”€â”€ 2. Per-machine table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <SectionCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-tecdia-accent" />
          <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Per-machine activity</h3>
        </div>
        {per_machine.length === 0 ? (
          <p className="text-sm text-tecdia-text/40 italic">No machines have been queried yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 custom-scrollbar">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-tecdia-text/30">
                  <th className="text-left px-4 py-3">Machine</th>
                  <th className="text-right px-4 py-3">Queries</th>
                  <th className="text-right px-4 py-3">Alerts</th>
                  <th className="text-right px-4 py-3">Rate</th>
                  <th className="text-right px-4 py-3">Avg Severity</th>
                  <th className="text-left px-4 py-3">Top Alarm Codes</th>
                </tr>
              </thead>
              <tbody>
                {per_machine.map((m, i) => (
                  <tr key={m.machine_id} className="group transition-all duration-200">
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-l border-y border-tecdia-border/30 rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: MACHINE_COLORS[i % MACHINE_COLORS.length] }} />
                        <span className="font-bold text-tecdia-textDeep">{m.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right font-mono tabular-nums text-tecdia-text/80">{m.query_count}</td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right font-mono tabular-nums text-tecdia-textDeep font-bold">{m.alert_count}</td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right font-mono tabular-nums text-tecdia-text/50">{m.alert_rate_pct}%</td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-y border-tecdia-border/30 text-right">
                      <SeverityPill value={m.avg_severity} />
                    </td>
                    <td className="px-4 py-3.5 bg-white/30 group-hover:bg-white/60 border-r border-y border-tecdia-border/30 rounded-r-xl">
                      <div className="flex flex-wrap gap-1.5">
                        {m.most_asked_codes.length === 0 ? (
                          <span className="text-[10px] text-tecdia-text/20 italic">No codes recorded</span>
                        ) : (
                          m.most_asked_codes.slice(0, 3).map(([code, count]) => (
                            <span key={code} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-tecdia-border/40 text-tecdia-accent shadow-sm">
                              {code} <span className="text-tecdia-text/30 font-medium ml-1">Ã—{count}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* â”€â”€ 3. Code frequency bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Top error / alarm codes</h3>
          </div>
          {code_frequency.length === 0 ? (
            <p className="text-sm text-tecdia-text/40 italic">No coded queries yet.</p>
          ) : (
            <div className="space-y-2">
              {code_frequency.map((c, i) => {
                const maxCount = code_frequency[0]?.count || 1;
                const pct = (c.count / maxCount) * 100;
                const sev = Math.round(c.avg_severity);
                const colorObj = SEVERITY_PALETTE[String(sev)] || SEVERITY_PALETTE['1'];
                return (
                  <div key={`${c.code}_${c.machine}_${i}`} className="flex items-center gap-3 text-sm">
                    <span className="w-20 font-mono font-bold text-tecdia-textDeep flex-shrink-0">{c.code}</span>
                    <div className="flex-1 h-5 bg-[#E6F7FF] rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500 bg-[#0057D9]"
                        style={{ width: `${pct}%`, background: colorObj.color, opacity: 0.9 }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono tabular-nums text-tecdia-textDeep/60 font-bold">Ã—{c.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* â”€â”€ 4. Severity donut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Severity distribution</h3>
          </div>
          <SeverityDonut distribution={severity_distribution} />
        </SectionCard>
      </div>

      {/* â”€â”€ 5. Last 24h activity bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <SectionCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-tecdia-accent" />
          <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Query volume â€” last 24h (UTC)</h3>
        </div>
        <ActivityBars buckets={queries_per_hour_24h} />
      </SectionCard>

      {/* â”€â”€ 6 + 7. Failure likelihood + depreciation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SectionCard>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Failure likelihood</h3>
          </div>
          <p className="text-[10px] text-tecdia-text/40 mb-4 ml-6">Poisson estimate from last 7 days of alerts</p>
          <FailureLikelihoodList rows={failure_likelihood} />
        </SectionCard>

        <SectionCard>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-tecdia-accent rotate-180" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Asset depreciation</h3>
          </div>
          <p className="text-[10px] text-tecdia-text/40 mb-4 ml-6">Straight-line, 12-month trailing</p>
          <DepreciationList rows={depreciation} />
        </SectionCard>
      </div>

      {/* â”€â”€ Top questions (bonus, sparse table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {top_questions.length > 0 && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-tecdia-accent" />
            <h3 className="text-sm font-bold text-tecdia-textDeep uppercase tracking-wider">Most-asked questions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 mt-2">
            {top_questions.map((q, i) => (
              <div key={i} className="group flex items-center gap-4 py-3 border-b border-tecdia-border/20 last:border-0 hover:bg-white/20 px-3 -mx-3 rounded-xl transition-colors">
                <span className="font-mono tabular-nums text-xs font-bold text-tecdia-accent/40 w-5">{(i + 1).toString().padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-tecdia-textDeep truncate group-hover:text-tecdia-accent transition-colors">{q.question}</p>
                  <p className="text-[10px] font-bold text-tecdia-text/30 uppercase tracking-widest mt-0.5">{q.machine.replaceAll('_', ' ')}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-tecdia-textDeep font-mono">Ã—{q.count}</span>
                  <span className="text-[9px] font-bold text-tecdia-text/30 uppercase">Queries</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
};

const FailureLikelihoodList = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-tecdia-text/40 italic">No machines indexed.</p>;
  }
  const riskColor = (pct) => {
    if (pct >= 75) return '#0A2540';
    if (pct >= 40) return '#0057D9';
    if (pct >= 15) return '#1E88E5';
    if (pct >  0)  return '#42A5F5';
    return '#B6E6FF';
  };
  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <div key={r.machine_id} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: MACHINE_COLORS[i % MACHINE_COLORS.length] }} />
              <span className="text-sm font-bold text-tecdia-textDeep">{r.display_name}</span>
            </div>
            <span className="text-[10px] font-mono text-tecdia-text/40">
              Î» {r.lambda_per_day.toFixed(2)}/day Â· {r.alerts_7d} alerts/7d
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['24h', r.prob_24h_pct], ['7d', r.prob_7d_pct], ['30d', r.prob_30d_pct]].map(([label, pct]) => (
              <div key={label} className="bg-[#E6F7FF]/60 rounded-lg px-2.5 py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-tecdia-text/50">{label}</span>
                  <span className="text-xs font-mono font-bold tabular-nums" style={{ color: riskColor(pct) }}>{pct}%</span>
                </div>
                <div className="h-1 bg-white/70 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: riskColor(pct) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const DepreciationList = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-tecdia-text/40 italic">No depreciation data configured.</p>;
  }
  const fmt = (n) => `â‚¹${(n / 100000).toFixed(1)}L`;
  return (
    <div className="space-y-4">
      {rows.map((r, i) => {
        const values = r.series.map((p) => p.value);
        const min = Math.min(...values, 0);
        const max = Math.max(...values, r.initial_value);
        const range = max - min || 1;
        const W = 100;
        const H = 28;
        const points = r.series.map((p, idx) => {
          const x = (idx / (r.series.length - 1)) * W;
          const y = H - ((p.value - min) / range) * H;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return (
          <div key={r.machine_id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MACHINE_COLORS[i % MACHINE_COLORS.length] }} />
                <span className="text-sm font-bold text-tecdia-textDeep truncate">{r.display_name}</span>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums text-tecdia-textDeep">{fmt(r.current_value)}</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="flex-1 h-7">
                <polyline
                  points={points}
                  fill="none"
                  stroke={MACHINE_COLORS[i % MACHINE_COLORS.length]}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col items-end text-[10px] font-mono tabular-nums">
                <span className="font-bold text-tecdia-text/60">{r.pct_remaining}% left</span>
                <span className="text-tecdia-text/30">âˆ’{fmt(r.monthly_loss)}/mo</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const KpiCard = ({ label, value, accent, icon: Icon }) => (
  <div className={`rounded-2xl p-5 border transition-all duration-300 hover:translate-y-[-2px] bg-white/50 backdrop-blur-md border-tecdia-border/30 hover:border-tecdia-accent/40 hover:shadow-lg ${accent}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-tecdia-text/40">{label}</div>
      {Icon && <Icon size={14} className="opacity-40" />}
    </div>
    <div className="text-2xl font-extrabold font-mono tabular-nums text-tecdia-textDeep">{value}</div>
  </div>
);

const SeverityPill = ({ value }) => {
  const sev = Math.round(value || 1);
  const obj = SEVERITY_PALETTE[String(sev)] || SEVERITY_PALETTE['1'];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border tabular-nums"
      style={{ borderColor: `${obj.color}30`, color: obj.color, background: `${obj.color}08` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: obj.color }} />
      {(value || 0).toFixed(2)}
    </span>
  );
};

// Pure SVG donut with professional hover tooltips.
const SeverityDonut = ({ distribution }) => {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const entries = Object.entries(distribution).sort((a, b) => Number(a[0]) - Number(b[0]));
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  
  if (total === 0) {
    return <p className="text-sm text-tecdia-text/40 italic">No queries to distribute yet.</p>;
  }

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const r = 38;
  const circ = 2 * Math.PI * r;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-10">
      <div className="relative w-44 h-44 flex-shrink-0 group" onMouseMove={handleMouseMove}>
        <div className="absolute inset-0 rounded-full bg-tecdia-accent/5 blur-2xl group-hover:bg-tecdia-accent/10 transition-all duration-500" />
        
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-sm overflow-visible">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E6F7FF" strokeWidth="10" />
          
          {entries.map(([sev, count]) => {
            const percent = (count / total);
            if (percent === 0) return null;
            const dashLength = percent * circ;
            const dashOffset = -accumulatedPercent * circ;
            accumulatedPercent += percent;
            const config = SEVERITY_PALETTE[sev];
            const isHovered = hovered?.sev === sev;

            return (
              <motion.circle
                key={sev} cx="50" cy="50" r={r} fill="none" stroke={config.color}
                strokeWidth={isHovered ? 13 : 10}
                strokeDasharray={`${dashLength} ${circ}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                onMouseEnter={() => setHovered({ sev, count, pct: Math.round(percent * 100), color: config.color, label: config.label })}
                onMouseLeave={() => setHovered(null)}
                className="transition-all duration-300 ease-out cursor-pointer pointer-events-auto"
                style={{ filter: isHovered ? `drop-shadow(0 0 4px ${config.color}40)` : 'none' }}
              />
            );
          })}
          <circle cx="50" cy="50" r="33" fill="white" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-tecdia-text/30 block mb-0.5">Total Queries</span>
            <span className="text-3xl font-extrabold font-mono tabular-nums text-tecdia-accent">{total}</span>
          </div>
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="absolute z-50 pointer-events-none"
              style={{ top: '15%', right: '-15%' }}
            >
              <div className="bg-white border border-tecdia-border shadow-lg rounded-md px-3 py-2 flex items-center gap-2.5 min-w-max">
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: hovered.color }} />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-tecdia-textDeep">Level {hovered.sev} â€” {hovered.label}</span>
                  <span className="text-[10px] font-mono font-bold text-tecdia-accent">{hovered.pct}% â€¢ {hovered.count} Queries</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 w-full space-y-3">
        {entries.map(([sev, count]) => {
          const obj = SEVERITY_PALETTE[sev];
          const pct = total ? Math.round((count / total) * 100) : 0;
          const isHovered = hovered?.sev === sev;
          return (
            <div 
              key={sev} 
              onMouseEnter={() => setHovered({ sev, count, pct, color: obj.color, label: obj.label })}
              onMouseLeave={() => setHovered(null)}
              className={`group flex items-center gap-3 text-sm p-2.5 rounded-2xl transition-all duration-300 border cursor-pointer ${
                isHovered ? 'bg-white shadow-md border-tecdia-accent/20 translate-x-1' : 'hover:bg-white/60 border-transparent'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border-2 border-white" style={{ background: obj.color }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-tecdia-textDeep text-xs">Level {sev} â€” {obj.label}</span>
                  <span className="font-mono tabular-nums font-bold text-tecdia-textDeep">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-[#E6F7FF] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: obj.color }}
                  />
                </div>
              </div>
              <span className="font-mono tabular-nums font-black text-tecdia-accent/40 w-10 text-right text-xs">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActivityBars = ({ buckets }) => {
  const max = Math.max(1, ...buckets.map(b => b.count));
  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2 custom-scrollbar">
      {buckets.map(b => (
        <div key={b.hour} className="flex-1 min-w-[16px] flex flex-col items-center group">
          <div className="relative w-full flex flex-col items-center justify-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(b.count / max) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full bg-[#0057D9] rounded-t-md transition-all duration-300 group-hover:bg-[#0A2540] group-hover:shadow-[0_0_12px_rgba(10,37,64,0.2)] relative"
              style={{ minHeight: b.count > 0 ? 2 : 0 }}
            >
              {b.count > 0 && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#1E88E5] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-tecdia-border/30">
                  {b.count}
                </span>
              )}
            </motion.div>
          </div>
          <span className="text-[9px] font-bold text-tecdia-text/30 mt-2 tabular-nums">{b.hour.split(':')[0]}</span>
        </div>
      ))}
    </div>
  );
};


const AdminDashboard = () => {
  const { adminLogout } = useAdminAuth();
  const { machines, addMachine, deleteMachine, activeJob, clearActiveJob } = useMachines();
  const { alerts, alertThreshold, clearAlerts, testAlert } = useAlerts();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'add' ? 'add' : 'machines');
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState('');
  const [fileErrors, setFileErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };


  const handleColorPick = (opt) => setForm(f => ({ ...f, color: opt.value, glow: opt.glow, border: opt.border }));

  const processFiles = (rawFiles) => {
    const errors = [];
    const valid = [];
    Array.from(rawFiles).forEach(file => {
      const kind = ALLOWED_TYPES[file.type];
      if (!kind) {
        errors.push(`"${file.name}" â€” unsupported type. Use PDF, JPG, PNG or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" â€” exceeds 10 MB limit.`);
        return;
      }
      valid.push({ name: file.name, type: kind, url: URL.createObjectURL(file), size: file.size });
    });
    setFileErrors(errors);
    if (valid.length) setForm(f => ({ ...f, files: [...f.files, ...valid] }));
    setTimeout(() => setFileErrors([]), 5000);
  };

  const handleFileInput = (e) => processFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setForm(f => ({ ...f, files: f.files.filter((_, i) => i !== idx) }));

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.machine_id.trim()) return;
    if (!form.pdfFile) { showToast('Please attach a PDF manual.'); return; }
    setIsSubmitting(true);
    const fd = new FormData();
    fd.append('machine_id',   form.machine_id.trim());
    fd.append('display_name', form.name.trim());
    fd.append('file',         form.pdfFile);
    if (form.description) fd.append('description',  form.description);
    if (form.category)    fd.append('category',     form.category);
    fd.append('significance', String(form.significance));
    // Backend expects a Lucide icon name string (e.g. "Printer"), not an image File.
    if (form.icon)        fd.append('icon',         form.icon);
    const result = await addMachine(fd);
    setIsSubmitting(false);
    if (result.success) {
      setForm(EMPTY_FORM);
      setActiveTab('machines');
      showToast(`Ingestion started for "${form.name}".`);
    } else {
      showToast(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (deleteConfirm === id) {
      const result = await deleteMachine(id);
      setDeleteConfirm(null);
      if (result.success) {
        showToast(`"${name}" removed.`);
      } else {
        showToast(`Error: ${result.error}`);
      }
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleClearAlerts = async () => {
    await clearAlerts();
    showToast('Alert history cleared.');
  };

  const handleTestAlert = async () => {
    const result = await testAlert();
    if (result.success) {
      showToast('Test alert injected.');
    } else {
      showToast(`Error: ${result.error}`);
    }
  };

  const PreviewIcon = ICON_MAP[form.icon] || Settings2;
  // Default seeded machines â€” match backend `_machine_metadata` slugs in src/api.py.
  const isDefault = (id) => ['INJECTION_MOLDING_MACHINE', 'LASER_CUTTING_MACHINE'].includes(id);

  return (
    <div className="min-h-screen text-tecdia-text pt-[76px]">

      {/* â”€â”€ Top Header â”€â”€ */}
      <header className="sticky top-[76px] z-40 border-b border-tecdia-border bg-white/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/src/assets/logo.png" alt="Tecdia" className="w-7 h-7 object-contain opacity-100 transition-opacity" />
              <span className="text-sm font-semibold text-tecdia-text/60 group-hover:text-tecdia-textDeep transition-colors">Tecdia SmartFix</span>
            </Link>
            <ChevronRight size={13} className="text-tecdia-border" />
            <div className="flex items-center gap-1.5 text-sm font-bold text-tecdia-textDeep">
              <LayoutDashboard size={14} className="text-tecdia-accent" />
              Admin
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-tecdia-surface border border-tecdia-border">
              <Shield size={12} className="text-tecdia-text/60" />
              <span className="text-xs font-semibold text-tecdia-text/80">Admin Session</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white border border-tecdia-border text-tecdia-text/40 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
              title="Exit Admin"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* â”€â”€ Page Title + Stats â”€â”€ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-tecdia-textDeep mb-1">Admin Dashboard</h1>
            <p className="text-tecdia-text/60 text-sm">Manage your machine catalogue and diagnostic resources.</p>
          </div>

          {/* Inline stat pills */}
          <div className="flex items-center gap-3">
            {(() => {
              const defaultCount = machines.filter(m => isDefault(m.id)).length;
              return [
                { icon: Database, label: 'Total', value: machines.length, color: 'text-white', bg: 'bg-[#00A9FF]', border: 'border-[#00A9FF]/20' },
                { icon: Package, label: 'Default', value: defaultCount, color: 'text-tecdia-textDeep', bg: 'bg-[#89CFF3]', border: 'border-[#89CFF3]/20' },
                { icon: Plus, label: 'Custom', value: Math.max(0, machines.length - defaultCount), color: 'text-tecdia-textDeep', bg: 'bg-[#A0E9FF]', border: 'border-[#A0E9FF]/20' },
              ];
            })().map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${s.bg} border ${s.border} shadow-sm`}>
                  <Icon size={14} className={s.color} />
                  <div>
                    <div className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</div>
                    <div className={`text-[10px] font-medium mt-0.5 ${s.color === 'text-white' ? 'text-white/80' : 'text-tecdia-text/60'}`}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* â”€â”€ Tab Bar â”€â”€ */}
        <div className="flex gap-1 p-1 bg-white border border-tecdia-border rounded-2xl mb-8 w-fit shadow-sm">
          {[
            { id: 'machines',  label: 'All Machines',  icon: Package },
            { id: 'add',       label: 'Add Machine',   icon: Plus },
            { id: 'alerts',    label: 'Alert History', icon: BellRing, count: alerts.length },
            { id: 'analytics', label: 'Analytics',     icon: BarChart3 },
            { id: 'shift_logs',label: 'Shift logs',    icon: FileText, isNew: true },
            { id: 'audit',     label: 'Audit Log',     icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? 'bg-tecdia-accent text-white shadow-md'
                    : 'text-tecdia-text/60 hover:text-tecdia-accent'
                }`}>
                <Icon size={14} /> 
                {tab.label}
                {tab.count > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    activeTab === tab.id ? 'bg-red-500 text-white border-tecdia-accent' : 'bg-red-500 text-white border-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.isNew && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-white">
                    NEW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* â”€â”€ Global ingestion progress bar â”€â”€
            Rendered OUTSIDE the tab content blocks so it remains visible
            after handleAddMachine() switches the active tab to 'machines'.
            Without this, the bar mounted inside the Add tab and was
            immediately unmounted on tab switch â€” user never saw it. */}
        <AnimatePresence>
          {activeJob && <IngestionProgress job={activeJob} onDismiss={clearActiveJob} />}
        </AnimatePresence>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Machines â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'machines' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => {
                const Icon = ICON_MAP[machine.icon] || Settings2;
                const defaultMachine = isDefault(machine.id);
                const confirming = deleteConfirm === machine.id;
                return (
                  <motion.div key={machine.id} layout
                    className="group relative bg-white border border-tecdia-border rounded-2xl p-5 hover:border-tecdia-accent transition-all duration-200 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-tecdia-accent/10 border border-tecdia-border flex items-center justify-center overflow-hidden">
                        {machine.customIconUrl ? (
                          <img src={machine.customIconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon size={18} className="text-tecdia-accent" />
                        )}
                      </div>
                      {defaultMachine
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-tecdia-background text-tecdia-text/40 border border-tecdia-border">Default</span>
                        : (
                          <button onClick={() => handleDelete(machine.id, machine.name)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                              confirming
                                ? 'bg-tecdia-accent/20 border-tecdia-accent/40 text-tecdia-textDeep'
                                : 'text-transparent group-hover:text-tecdia-text/40 border-transparent hover:!text-tecdia-accent hover:bg-tecdia-accent/10 hover:border-tecdia-accent/20'
                            }`}>
                            <Trash2 size={13} />
                          </button>
                        )
                      }
                    </div>

                    <h3 className="font-bold text-tecdia-textDeep text-sm mb-1">{machine.name}</h3>
                    <p className="text-tecdia-text/80 text-xs leading-relaxed">{machine.description}</p>
                    {machine.category && (
                      <div className="mt-3 pt-3 border-t border-tecdia-border flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-tecdia-text/60 uppercase tracking-wider">{machine.category}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-tecdia-text/40">SIG:</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= machine.significance ? 'bg-[#0057D9]' : 'bg-[#E6F7FF] border border-tecdia-border/20'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Add Machine â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'add' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* (Progress bar moved above tabs â€” it's rendered globally
                so it stays visible after the auto-switch to Machines tab.) */}
            <form onSubmit={handleAddMachine}>
              {/* Two-column grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* LEFT â€” Machine Details */}
                <SectionCard className="bg-white">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
                      <FileText size={13} className="text-tecdia-accent" />
                    </div>
                    <h2 className="font-bold text-tecdia-textDeep text-sm">Machine Details</h2>
                  </div>
                  <div className="space-y-4">
                    <InputField label="Machine Name *" type="text" required value={form.name}
                      onChange={e => {
                        const name = e.target.value;
                        setForm(f => ({
                          ...f, name,
                          // Auto-generate slug only if user hasn't manually edited it
                          machine_id: f._slugEdited ? f.machine_id : toSlug(name),
                        }));
                      }}
                      placeholder="e.g. CNC Milling Machine" />
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest">Machine ID (slug) *</label>
                      <input
                        type="text" required
                        value={form.machine_id}
                        onChange={e => setForm(f => ({ ...f, machine_id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''), _slugEdited: true }))}
                        placeholder="AUTO_GENERATED_FROM_NAME"
                        className="w-full bg-tecdia-background border border-tecdia-border rounded-xl py-3 px-4 text-tecdia-text text-sm font-mono placeholder:text-tecdia-text/30 focus:outline-none focus:border-tecdia-accent focus:ring-1 focus:ring-tecdia-accent/20 transition-all"
                      />
                      <p className="text-[10px] text-tecdia-text/40">Auto-generated. Only Aâ€“Z, 0â€“9, underscore allowed. Must be unique.</p>
                    </div>
                    <InputField label="Description" as="textarea" rows={4} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of this machine's diagnostic capabilities..." />
                    <InputField label="Category" type="text" value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Fabrication, Automation" />
                    
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest flex justify-between">
                        Machine Significance
                        <span className="text-tecdia-accent font-bold">Level {form.significance}</span>
                      </label>
                      <input 
                        type="range" min="1" max="5" step="1" 
                        value={form.significance} 
                        onChange={e => setForm(f => ({ ...f, significance: parseInt(e.target.value) }))}
                        className="w-full h-1.5 bg-[#E6F7FF] rounded-lg appearance-none cursor-pointer accent-[#0057D9] border border-tecdia-border/30" 
                      />
                      <div className="flex justify-between text-[9px] text-tecdia-text/40 font-bold uppercase tracking-tighter">
                        <span>Low Impact</span>
                        <span>Mission Critical</span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* RIGHT â€” Appearance */}
                <SectionCard className="bg-white">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
                      <Settings2 size={13} className="text-tecdia-accent" />
                    </div>
                    <h2 className="font-bold text-tecdia-textDeep text-sm">Appearance</h2>
                  </div>

                  {/* â”€â”€ ICON SECTION â”€â”€ */}
                  <div className="mb-6">
                    <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest mb-3">Icon</label>

                    {/* Custom icon upload */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="custom-icon-upload"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) setForm(f => ({ ...f, customIconUrl: URL.createObjectURL(file) }));
                        }}
                      />
                      <label htmlFor="custom-icon-upload"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-tecdia-background border border-tecdia-border hover:border-tecdia-accent text-tecdia-text/60 hover:text-tecdia-accent text-xs font-medium cursor-pointer transition-all duration-200">
                        <Image size={13} /> Upload Custom Icon
                      </label>
                      {form.customIconUrl && (
                        <div className="flex items-center gap-2">
                          <img src={form.customIconUrl} alt="custom icon" className="w-8 h-8 rounded-lg object-cover border border-tecdia-border" />
                          <button type="button" onClick={() => setForm(f => ({ ...f, customIconUrl: null }))}
                            className="w-6 h-6 rounded-full bg-tecdia-background border border-tecdia-border flex items-center justify-center text-tecdia-text/40 hover:text-tecdia-accent transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/*Live preview */}
                  <div>
                    <label className="block text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest mb-2.5">Preview</label>
                    <div className="flex items-center gap-3 bg-tecdia-background border border-tecdia-border rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-tecdia-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {form.customIconUrl
                          ? <img src={form.customIconUrl} alt="" className="w-full h-full object-cover" />
                          : React.createElement(ICON_MAP[form.icon] || Settings2, {
                              size: 18,
                              className: 'text-tecdia-accent',
                            })
                        }
                      </div>
                      <div>
                        <span className="font-semibold text-tecdia-textDeep text-sm block">{form.name || 'Machine Name'}</span>
                        {form.category && <span className="text-[10px] text-tecdia-text/60">{form.category}</span>}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Unified File Upload */}
              <SectionCard className="mb-6 bg-white">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center">
                      <Upload size={13} className="text-tecdia-accent" />
                    </div>
                    <h2 className="font-bold text-tecdia-textDeep text-sm">Files & Media</h2>
                  </div>
                  {form.files.length > 0 && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-tecdia-accent/10 border border-tecdia-accent/20 text-tecdia-accent font-semibold">
                      {form.files.length} file{form.files.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 50 * 1024 * 1024) { setFileErrors(['File exceeds 50 MB limit.']); return; }
                    setForm(f => ({ ...f, pdfFile: file, files: [{ name: file.name, type: 'pdf', size: file.size }] }));
                    setFileErrors([]);
                  }}
                  className="hidden"
                />

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-tecdia-accent/60 bg-tecdia-accent/5 scale-[1.01]'
                      : 'border-[#89CFF3] bg-[#A0E9FF]/20 hover:border-tecdia-accent/50 hover:bg-[#A0E9FF]/40'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isDragging ? 'bg-tecdia-accent/15' : 'bg-white border border-tecdia-border'
                  }`}>
                    <Upload size={22} className={isDragging ? 'text-tecdia-accent' : 'text-tecdia-accent/60'} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold mb-1 transition-colors ${isDragging ? 'text-tecdia-accent' : 'text-tecdia-text/60'}`}>
                      {isDragging ? 'Drop files here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-tecdia-text/40">PDF, JPG, PNG, WebP Â· Max 10 MB per file</p>
                  </div>
                </div>

                {/* Validation errors */}
                <AnimatePresence>
                  {fileErrors.map((err, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 mt-3 px-4 py-3 bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-xl text-tecdia-accent text-xs">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                      {err}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Uploaded files list */}
                {form.files.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="text-[11px] font-semibold text-tecdia-text/60 uppercase tracking-widest mb-3">Uploaded</p>

                    {/* Image grid */}
                    {form.files.filter(f => f.type === 'image').length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                        {form.files.map((file, idx) => file.type === 'image' && (
                          <div key={idx} className="relative group/img aspect-square">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-xl border border-tecdia-border" />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 rounded-xl transition-all duration-200 flex items-center justify-center">
                              <button type="button" onClick={() => removeFile(idx)}
                                className="w-6 h-6 bg-white/70 rounded-full items-center justify-center text-tecdia-textDeep hover:text-tecdia-accent opacity-0 group-hover/img:opacity-100 transition-opacity flex">
                                <X size={11} />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-white/80 rounded-b-xl px-1.5 py-1 opacity-0 group-hover/img:opacity-100 transition-opacity border-t border-tecdia-border">
                              <p className="text-[9px] text-tecdia-textDeep truncate">{file.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PDF rows */}
                    {form.files.map((file, idx) => file.type === 'pdf' && (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-tecdia-accent/5 border border-tecdia-accent/20 rounded-xl group/pdf">
                        <div className="w-8 h-8 rounded-lg bg-tecdia-accent/10 border border-tecdia-accent/20 flex items-center justify-center flex-shrink-0">
                          <FileText size={14} className="text-tecdia-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-tecdia-textDeep truncate">{file.name}</p>
                          <p className="text-[10px] text-tecdia-text/60">{(file.size / 1024).toFixed(0)} KB Â· PDF</p>
                        </div>
                        <button type="button" onClick={() => removeFile(idx)}
                          className="text-tecdia-text/40 hover:text-tecdia-accent transition-colors opacity-0 group-hover/pdf:opacity-100 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Submit Button */}
              <button type="submit" disabled={!form.name.trim() || !form.machine_id.trim() || !form.pdfFile || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-300 shadow-md ${
                  form.name.trim() && form.machine_id.trim() && form.pdfFile && !isSubmitting
                    ? 'bg-tecdia-accent text-white hover:bg-tecdia-accent/90 active:scale-[0.99]'
                    : 'bg-tecdia-background border border-tecdia-border text-tecdia-text/40 cursor-not-allowed'
                }`}>
                {isSubmitting
                  ? <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Uploading...</>
                  : <><Plus size={18} /> Upload & Index Machine</>}
              </button>
            </form>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Alerts â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {alertThreshold && <p className="text-xs text-tecdia-text/40 mb-4">Alerts fire when score â‰¥ {alertThreshold} of 25</p>}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-tecdia-textDeep flex items-center gap-2">
                <BellRing size={20} className="text-tecdia-accent" />
                Critical Fault Alerts
              </h2>
              <div className="flex items-center gap-4">
                <button onClick={handleTestAlert} className="text-xs font-bold text-tecdia-accent hover:text-tecdia-accent/80 transition-colors">
                  Inject Test Alert
                </button>
                {alerts.length > 0 && (
                  <button onClick={handleClearAlerts} className="text-xs font-bold text-tecdia-text/40 hover:text-tecdia-accent transition-colors">
                    Clear All History
                  </button>
                )}
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white border border-tecdia-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-tecdia-background border border-tecdia-border flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-tecdia-text/20" />
                </div>
                <p className="text-tecdia-textDeep font-bold">No critical alerts detected</p>
                <p className="text-tecdia-text/60 text-sm max-w-xs mt-1">High-severity fault reports will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <motion.div 
                    key={alert.alert_id} 
                    layout 
                    initial={{ opacity: 0, y: 12 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-white border border-tecdia-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-tecdia-accent/20 transition-all duration-300"
                  >
                    {/* High-Contrast Indicator Strip (Navy) */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0A2540]" />
                    
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Main Info */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                              <Shield size={12} /> Score {alert.score}
                            </span>
                            <h3 className="text-base font-bold text-tecdia-textDeep tracking-tight uppercase">
                              {alert.machine_id.replaceAll('_', ' ')}
                            </h3>
                            <span className="text-[10px] font-bold text-tecdia-accent bg-tecdia-accent/5 px-2 py-1 rounded-md border border-tecdia-accent/10">
                              {new Date(alert.notified_at).toLocaleString('en-US', { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-tecdia-text/30 uppercase tracking-tighter">Impact Level</span>
                              <span className="text-xs font-black text-tecdia-textDeep uppercase">Severity {alert.severity_level}</span>
                            </div>
                            <div className="w-px h-6 bg-tecdia-border" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-tecdia-text/30 uppercase tracking-tighter">Significance</span>
                              <span className="text-xs font-black text-tecdia-textDeep uppercase">Priority {alert.machine_significance}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-tecdia-accent/10" />
                            <p className="text-sm text-tecdia-textDeep/80 leading-relaxed pl-3">
                              {alert.answer_excerpt || alert.question}
                            </p>
                          </div>
                        </div>

                        {/* Status Side */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-tecdia-border lg:pl-8">
                          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-colors duration-300 ${
                            alert.email_notified 
                              ? 'bg-[#E6F7FF] border-[#B6E6FF] text-[#0057D9]' 
                              : 'bg-tecdia-background border-tecdia-border text-tecdia-text/40'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${alert.email_notified ? 'bg-tecdia-accent animate-pulse' : 'bg-tecdia-text/20'}`} />
                            <span className="text-[11px] font-black uppercase tracking-wider">
                              {alert.email_notified ? 'System Notified' : 'Dispatch Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Analytics â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'analytics' && <AnalyticsPanel />}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Shift Logs â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'shift_logs' && <ShiftLogsPanel />}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB: Audit Log â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'audit' && <AuditPanel />}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

```


## src\pages\AdminLogin.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const InputField = ({ icon: Icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="block text-[11px] font-black uppercase tracking-widest text-[#1a1a2e]/50">
      {label}
    </label>
    <div className="relative group">
      <Icon size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 text-[#1a1a2e]/30 group-focus-within:text-[#00A9FF]" />
      <input
        {...props}
        className="w-full py-3.5 pl-10 pr-4 text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 rounded-xl outline-none transition-all duration-200 bg-white border-2 border-[#89CFF3] focus:border-[#00A9FF] focus:ring-2 focus:ring-[#00A9FF]/10"
      />
    </div>
  </div>
);

const AdminLogin = () => {
  const { requestLoginLink, checkLoginError } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1); // 1 = email input, 2 = check-email confirmation
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for ?login_error=expired from server redirect
  useEffect(() => {
    const linkError = checkLoginError();
    if (linkError) {
      setError(linkError);
      // Clean the URL so the error doesn't persist on reload
      const url = new URL(window.location.href);
      url.searchParams.delete('login_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await requestLoginLink(email);
    setLoading(false);
    if (result.success) {
      setStep(2);
    } else {
      setError(result.error);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 pt-20 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #89CFF3 0%, #CDF5FD 50%, #A0E9FF 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-[#00A9FF]/15 blur-[80px] -z-0" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-[280px] h-[280px] rounded-full bg-[#89CFF3]/40 blur-[60px] -z-0" />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-7">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border-2 border-[#89CFF3] shadow-sm">
              <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold text-[#1a1a2e]">Tecdia <span className="text-[#00A9FF]">SmartFix</span></span>
          </Link>

          <h1 className="text-3xl font-black text-[#1a1a2e] mb-2">Welcome back</h1>
          <p className="text-sm text-[#1a1a2e]/50">Restricted area â€” authorized personnel only</p>
        </div>

        {/* Form Card */}
        <div
          className="rounded-3xl p-8 border border-white/60 shadow-2xl overflow-hidden relative"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}
        >
          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* â”€â”€ Step 1: Email input â”€â”€ */
              <motion.form key="step1" onSubmit={handleRequestLink} className="space-y-5"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                <InputField
                  icon={Mail}
                  label="Admin Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@tecdia.com.ph"
                  autoComplete="email"
                  required
                />

                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-500 border border-red-200">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${loading || !email
                    ? 'bg-[#A0E9FF] text-[#1a1a2e]/40 cursor-not-allowed border-2 border-[#89CFF3]'
                    : 'bg-[#00A9FF] text-white active:scale-[0.98]'
                    }`}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <><Mail size={14} /> Request Login Link</>
                  )}
                </button>
              </motion.form>

            ) : (
              /* â”€â”€ Step 2: Check your email confirmation â”€â”€ */
              <motion.div key="step2" className="space-y-5"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                {/* Success icon */}
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-black text-[#1a1a2e] mb-2">Check your email</h2>
                  <p className="text-sm text-[#1a1a2e]/60 leading-relaxed max-w-xs">
                    We sent a secure login link to{' '}
                    <span className="font-bold text-[#00A9FF]">{email}</span>.
                    Click the link in the email to sign in.
                  </p>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#89CFF3]/20 border border-[#89CFF3]/40 text-xs text-[#1a1a2e]/60">
                  <Lock size={13} className="flex-shrink-0 mt-0.5 text-[#00A9FF]" />
                  <span>The link expires in <strong>15 minutes</strong> and is single-use. If you don't see the email, check your spam folder.</span>
                </div>

                {/* Resend link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="text-xs text-[#1a1a2e]/50 hover:text-[#00A9FF] transition-colors underline underline-offset-2"
                  >
                    Didn't receive the email? Try again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs mt-6 text-[#1a1a2e]/40">
          <Link to="/" className="transition-colors duration-200 hover:text-[#00A9FF]">â† Back to Tecdia SmartFix</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;

```


## src\pages\ChatPage.jsx

```jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import MessageContent from '../components/MessageContent';
import { useChatHistory } from '../hooks/useChatHistory';
import { useWorkstation } from '../hooks/useWorkstation';
import {
  Bot, Plus, User, Send, Mic, MicOff, Menu, Settings2,
  Printer, Scissors, Wrench, Gauge, X, FileText, Cpu, Factory,
  Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, ShieldAlert, ArrowLeft,
  BellRing, RefreshCw, BookOpen, AlertTriangle, Square,
} from 'lucide-react';
import { useMachines } from '../context/MachineContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { fetchApi } from '../api/apiClient';
import ChromaKeyVideo from '../components/ChromaKeyVideo';
import EndShiftModal from '../components/EndShiftModal';

// Icon map for dynamic lookup
const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

// Generic fallback suggestions, lightly tailored by machine category.
// Used only when the backend hasn't supplied suggested_questions for a machine
// (e.g. a freshly uploaded one without curated defaults yet).
const FALLBACK_SUGGESTIONS_BY_CATEGORY = {
  'Manufacturing':           ['What does the latest error code mean?', 'Production has stopped â€” where do I start?', 'Run a preventive maintenance check', 'What is the recommended service interval?'],
  'Fabrication':             ['What does the latest error code mean?', 'Output quality has dropped â€” what to check?', 'Run a preventive maintenance check', 'What is the recommended service interval?'],
  'Heavy Machinery':         ['What does the latest alarm code mean?', 'Pressure is not reaching the setpoint', 'Run a preventive maintenance check', 'What is the safety lockout procedure?'],
  'Additive Manufacturing':  ['What does the latest error code mean?', 'A print just failed â€” what to look at first?', 'Run a preventive maintenance check', 'What materials does this printer support?'],
  'Automation':              ['What does the latest error code mean?', 'A safety stop was triggered â€” what now?', 'Run a preventive maintenance check', 'How do I re-home the axes?'],
};
const DEFAULT_SUGGESTIONS = ['What does the latest error code mean?', 'Run a preventive maintenance check', 'Explain a critical safety procedure', 'Check operational status'];

const SEVERITY_COLORS = {
  1: { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  label: 'Informational' },
  2: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Minor' },
  3: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Degraded' },
  4: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    label: 'Production Impact' },
  5: { bg: 'bg-red-100',   border: 'border-red-400',    text: 'text-red-700',    label: 'Safety Risk' },
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="h-screen pt-[76px]"
  >
    {children}
  </motion.div>
);

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const { machines } = useMachines();
  const { user } = useAuth();
  const { refreshAlerts } = useAlerts();
  const ws = useWorkstation();

  // Canonical per-machine key used to namespace chat history + session storage.
  // Matches the wrapper key in App.jsx ChatRoute so storage layout stays in sync
  // with the React remount boundary.
  const machineParam = searchParams.get('machine');
  const machineKey = (machineParam || 'ALL').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();

  // useChatHistory manages the sidebar chat list (multi-session, localStorage), per machine
  const { chats, currentChatId, currentChat, setCurrentChatId, createNewChat, addMessage, deleteChat } = useChatHistory(machineKey);

  // /query history is DERIVED from the current chat's messages, not stored
  // separately. This makes context strictly per-chat: clicking "+ New chat"
  // resets currentChat.messages to [] â†’ queryHistory becomes [] â†’ the LLM
  // gets a clean slate, no bleed from previous chats on the same machine.
  // Cap at last 8 messages (â‰ˆ4 turns) to fit Groq's TPM budget. Recomputed
  // every render â€” cheap, and the React Compiler will memoize if needed.
  const queryHistory = (currentChat?.messages || [])
    .filter(m => !m.isErrorMessage && m.text)
    .slice(-8)
    .map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const machineName = machineParam || 'All Machines';
  const dynamicMachine = machines.find(
    m => m.name === machineName || m.display_name === machineName || m.id === machineParam
  );
  // Pretty label for UI chips + the textarea placeholder. Falls back to the
  // raw machineName (URL param) until /machines has loaded.
  const machineLabel = dynamicMachine?.display_name || machineName;

  // â”€â”€ Workstation binding guard â”€â”€
  // If this client's IP is bound to a machine, force the URL to point at that
  // machine. Computed here (no early return â€” Rules of Hooks) and acted on
  // after all hooks have been declared, just below.
  const workstationRedirectTo = (() => {
    if (!(ws.bound && ws.machine?.id)) return null;
    const onCorrectMachine =
      machineParam === ws.machine.id || machineName === ws.machine.display_name;
    return onCorrectMachine ? null : ws.machine.id;
  })();

  // â”€â”€ Access control (uses user.domain per contract) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hasAccess =
    user.domain === 'All Access' ||
    machineName === 'All Machines' ||
    (dynamicMachine && (dynamicMachine.category === 'General' || dynamicMachine.category === user.domain));

  // â”€â”€ Suggestion resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Priority: backend-curated per machine â†’ category fallback â†’ generic default.
  // Newly uploaded machines without curated suggestions land in the category bucket.
  const suggestions =
    (dynamicMachine?.suggested_questions?.length ? dynamicMachine.suggested_questions : null) ||
    FALLBACK_SUGGESTIONS_BY_CATEGORY[dynamicMachine?.category] ||
    DEFAULT_SUGGESTIONS;

  const MachineIcon = ICON_MAP[dynamicMachine?.icon] || Settings2;

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [currentChat?.messages, isLoading]);

  // â”€â”€ Send handler â€” calls real POST /query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    let chatId = currentChatId;
    if (!chatId) chatId = createNewChat();

    const questionText = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setQueryError(null);

    // Add user message to sidebar chat immediately
    addMessage(chatId, { text: questionText, sender: 'user' });
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      // Per API contract: machine_filter is Optional[str]. Omit it entirely for
      // "All Machines" â€” sending a sentinel like 'ALL' would mismatch every chunk.
      const body = {
        question: questionText,
        history: queryHistory, // [{role, content}] â€” last N turns, server caps at 8
      };
      if (dynamicMachine?.id) {
        body.machine_filter = dynamicMachine.id;
      }

      const data = await fetchApi('/query', {
        method: 'POST',
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      // data: { status, answer, sources, severity_level, alert_score, machine_significance, alert_fired }
      const aiText = data.answer || 'No answer returned.';

      addMessage(chatId, {
        text: aiText,
        sender: 'ai',
        // Contract fields, stored on the message for display
        queryStatus: data.status,           // "success" | "not_found" | "error"
        severityLevel: data.severity_level,  // 1â€“5
        alertScore: data.alert_score,        // severity Ã— significance
        machineSignificance: data.machine_significance,
        alertFired: data.alert_fired,        // bool
        sources: data.sources || [],         // [{document, page}]
      });

      // (No separate appendTurn call â€” queryHistory derives from currentChat.messages,
      // and addMessage above already updated them.)

      // If an alert was fired server-side, refresh the alert list
      if (data.alert_fired) {
        refreshAlerts();
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        addMessage(chatId, {
          text: '',
          sender: 'ai',
          queryStatus: 'stopped',
          isErrorMessage: true,
          errorText: 'Response generation stopped by user.',
        });
        return;
      }
      setQueryError(err.detail || err.message || 'Failed to get a response. Please try again.');
      // Remove the user message's "pending" state by adding an error AI message
      addMessage(chatId, {
        text: '',
        sender: 'ai',
        queryStatus: 'error',
        isErrorMessage: true,
        errorText: err.code === 'access_denied'
          ? `Access denied: ${err.detail}`
          : (err.detail || 'The AI service is currently unavailable. Please try again shortly.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleInput = (e) => {
    const target = e.target;
    setInput(target.value);
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  const applySuggestion = (text) => {
    setInput(text);
    textareaRef.current?.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  // â”€â”€ "Start over" â€” same effect as "+ New chat" now that queryHistory
  // derives from currentChat.messages: a new chat = empty messages = empty
  // history. Kept as a separate button for UX clarity (the worker reads it
  // as "wipe the slate").
  const handleStartOver = () => {
    createNewChat();
  };

  // â”€â”€ Voice input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setInput(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    };
    recognition.start();
  }, [isListening]);

  // â”€â”€ Workstation redirect (after all hooks, per Rules of Hooks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (workstationRedirectTo) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(workstationRedirectTo)}`} replace />;
  }

  // â”€â”€ Access denied screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!hasAccess) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-76px)] px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-tecdia-textDeep mb-2">Access Restricted</h2>
          <p className="text-tecdia-text/60 max-w-md mb-8 leading-relaxed">
            Your current domain (<span className="font-bold text-tecdia-accent">{user.domain}</span>)
            does not grant access to the <span className="font-bold">{machineName}</span> diagnostics.
          </p>
          {ws.bound ? (
            // Bound workstation â€” nowhere to go back to; surface a contact hint instead.
            <p className="text-tecdia-text/50 text-sm">
              Contact your shift manager if you believe this workstation is mis-configured.
            </p>
          ) : (
            <Link to="/machines" className="btn-primary flex items-center gap-2">
              <ArrowLeft size={18} /> Back to Machines
            </Link>
          )}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex h-[calc(100vh-76px)] text-tecdia-text overflow-hidden relative">
        <Sidebar
          currentChatId={currentChatId}
          chats={chats}
          onSelectChat={setCurrentChatId}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden">
          {/* â”€â”€ Header â”€â”€
              shrink-0 is essential: when the textarea auto-grows as the user
              types a multi-line follow-up, the input bar (shrink-0, growing)
              competes with this header for space inside <main>. Without
              shrink-0 the header gets collapsed to 0px by flex distribution. */}
          <header className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-tecdia-border bg-white/40 backdrop-blur-md relative z-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-tecdia-text/60 hover:text-tecdia-text">
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pr-4 border-r border-tecdia-border">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-tecdia-border bg-tecdia-surface">
                    <img src="/src/assets/logo.png" alt="Tecdia" className="w-full h-full object-contain" />
                  </div>
                  <span className="hidden sm:inline text-sm font-bold text-tecdia-textDeep">Tecdia SmartFix</span>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-tecdia-surface border border-tecdia-border overflow-hidden">
                  {dynamicMachine?.icon && dynamicMachine.icon !== 'Settings2'
                    ? <MachineIcon size={16} className="text-tecdia-text/60" />
                    : <MachineIcon size={16} className="text-tecdia-text/60" />
                  }
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tecdia-accent border border-tecdia-accent/20 text-xs font-bold text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="leading-none">{machineLabel}</span>
              </div>
            </div>

            {/* Chat actions â€” always visible so the user can branch / reset
                regardless of conversation state or sidebar visibility. */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEndShiftModalOpen(true)}
                className="px-5 py-1.5 rounded-full border border-gray-300 text-[13px] font-semibold text-tecdia-textDeep bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                End shift
              </button>
            </div>
          </header>

          {/* â”€â”€ Messages â”€â”€
              min-h-0 is essential: without it the flex child won't shrink below
              its content size, so the scroll viewport overflows the parent and
              bleeds behind the input bar. */}
          <div className="flex-1 min-h-0 overflow-y-auto pt-4 flex flex-col items-center w-full">
            
            {/* Hardcoded Previous Shift Banner redesigned */}
            <div className="w-full max-w-5xl px-4 mb-6 mt-2">
              <div className="bg-white rounded-2xl p-5 flex justify-between items-center gap-4 shadow-sm border border-tecdia-border transition-all duration-200 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-orange-500"></div>
                <div className="flex items-start gap-4 pl-1">
                  <div className="bg-orange-50 text-orange-500 p-2 rounded-xl mt-0.5 border border-orange-100">
                    <AlertTriangle size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-100">Previous Shift</span>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-100">Severity 3</span>
                    </div>
                    <p className="text-[15px] font-bold text-tecdia-textDeep mb-1">The night shift flagged unusual noise on this machine.</p>
                    <p className="text-[13px] text-tecdia-text/60 italic">"Slight clicking near the clamp near end of shift, nothing on display." â€” A. Worker, 19:00</p>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-end gap-2 pr-2 shrink-0">
                   <button className="btn-primary py-1.5 px-5 text-[13px] bg-tecdia-textDeep hover:bg-black shadow-none text-white border border-tecdia-textDeep rounded-xl transition-all duration-200">
                     View log
                   </button>
                   <span className="text-[12px] font-semibold text-tecdia-text/50 cursor-pointer hover:text-tecdia-text transition-colors mt-0.5">Acknowledge</span>
                </div>
              </div>
            </div>

            {!currentChat || currentChat.messages.length === 0 ? (
              /* Empty state with suggestions */
              <div className="flex-1 flex flex-col items-center px-4 w-full max-w-5xl mx-auto">
                <div className="w-full text-left mb-4 mt-2">
                  <span className="text-[11px] font-black text-tecdia-text/40 uppercase tracking-[0.2em] ml-1">Suggested first checks</span>
                </div>
                <div className="w-full flex flex-wrap gap-3 mb-12">
                  {suggestions.slice(0, 3).map((s, i) => (
                    <button key={i} onClick={() => applySuggestion(s)} className="bg-white/60 backdrop-blur-sm border border-tecdia-border hover:border-tecdia-accent hover:text-tecdia-accent hover:bg-white text-[14px] font-semibold text-tecdia-textDeep px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95 shadow-sm">
                      {s}
                    </button>
                  ))}
                </div>

                <div className="w-full max-w-3xl bg-white rounded-3xl p-12 flex flex-col items-center text-center shadow-sm border border-tecdia-border">
                   <div className="w-16 h-16 rounded-2xl bg-tecdia-background flex items-center justify-center mb-6 shadow-inner border border-tecdia-border/50">
                     <User size={32} className="text-tecdia-accent" />
                   </div>
                   <h2 className="text-[32px] font-bold text-tecdia-textDeep mb-3">Good morning, A. Worker</h2>
                   <p className="text-[15px] text-tecdia-text/60 mb-10">Start with one of the suggestions above, or ask anything about this machine.</p>
                   
                   <button onClick={() => setIsEndShiftModalOpen(true)} className="btn-secondary flex items-center gap-2 shadow-sm text-[14px]">
                     <Settings2 size={18} /> Don't forget to log your machine at end of shift
                   </button>
                </div>
              </div>
            ) : (
              /* Message list */
              <div className="w-full max-w-3xl px-4 space-y-8 pb-6">
                <AnimatePresence>
                  {currentChat.messages.map((message) => (
                    <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                          message.sender === 'user' ? 'bg-tecdia-accent text-white' : 'bg-white border border-tecdia-border'
                        }`}>
                          {message.sender === 'user' ? <User size={16} /> : <img src="/src/assets/logo.png" alt="AI" className="w-5 h-5 object-contain" />}
                        </div>
                        <div className={`rounded-2xl px-5 py-3 border transition-all ${
                          message.sender === 'user'
                            ? 'bg-tecdia-accent/15 border-tecdia-accent/30 text-tecdia-textDeep backdrop-blur-sm'
                            : 'bg-white/80 border-tecdia-border/50 text-tecdia-text shadow-sm backdrop-blur-sm'
                        }`}>
                          {/* Error AI message */}
                          {message.isErrorMessage ? (
                            <div className="flex items-start gap-2.5 text-sm text-red-600">
                              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                              <span>{message.errorText}</span>
                            </div>
                          ) : (
                            <>
                              <MessageContent content={message.text} isAI={message.sender !== 'user'} />

                              {/* Sources (AI only) */}
                              {message.sender === 'ai' && message.sources && message.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-tecdia-border">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-tecdia-text/40 uppercase tracking-widest mb-2">
                                    <BookOpen size={10} /> Sources
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {message.sources.map((src, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-tecdia-background border border-tecdia-border text-tecdia-text/50 font-medium">
                                        {src.document} Â· p.{src.page}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Severity + alert (AI only) */}
                              {message.sender === 'ai' && message.severityLevel > 0 && (() => {
                                const sev = SEVERITY_COLORS[message.severityLevel] || SEVERITY_COLORS[1];
                                return (
                                  <div className={`mt-3 pt-3 border-t border-tecdia-border space-y-1.5`}>
                                    {/* Severity badge */}
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sev.bg} ${sev.border} ${sev.text}`}>
                                        Severity {message.severityLevel} â€” {sev.label}
                                      </span>
                                      <span className="text-[9px] font-medium text-tecdia-text/30 uppercase tracking-tight">
                                        Score {message.alertScore}/{message.machineSignificance * 5}
                                      </span>
                                    </div>

                                    {/* Alert fired indicator */}
                                    {message.alertFired && (
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 animate-pulse">
                                        <BellRing size={12} /> ALERT FIRED â€” Managers notified
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}

                          <span className="text-[10px] text-tecdia-text/40 mt-2 block text-right font-medium tracking-tight">
                            {message.timestamp}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-tecdia-border flex items-center justify-center flex-shrink-0">
                        <img src="/src/assets/logo.png" alt="AI" className="w-5 h-5 object-contain" />
                      </div>
                      <div className="bg-white rounded-2xl px-5 py-4 flex gap-1.5 items-center border border-tecdia-border shadow-sm">
                        <span className="w-1.5 h-1.5 bg-tecdia-accent/60 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-tecdia-accent/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-tecdia-accent/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* â”€â”€ Input Bar â”€â”€
              Normal flex child (no absolute positioning) so the scroll area
              above it has a real bottom boundary. Transparent background â€”
              the form pill (bg-white) is the only thing that visually sits
              on top of the page gradient. */}
          <div className="shrink-0 w-full px-4 md:px-6 pt-2 pb-0 bg-transparent">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSend}
                className="input-glow glass p-2 pl-4 pr-2 rounded-2xl border flex items-end gap-2 bg-white transition-all duration-300 shadow-lg">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  placeholder={`Ask about your ${machineLabel}â€¦`}
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none py-3 px-2 text-tecdia-text placeholder:text-tecdia-text/40 focus:outline-none focus:ring-0 resize-none max-h-[200px] text-[15px] disabled:opacity-50"
                />
                <div className="flex items-center gap-1 mb-1">
                  {/* Mic */}
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={isLoading}
                    className={`p-2.5 rounded-xl transition-all hidden sm:flex items-center justify-center ${
                      isListening
                        ? 'bg-red-500/10 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse'
                        : 'hover:bg-tecdia-background text-tecdia-text/40 hover:text-tecdia-text'
                    }`}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  {isLoading ? (
                    <button type="button" onClick={handleStop}
                      className="p-2.5 rounded-xl transition-all bg-red-500 text-white hover:bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse"
                      title="Stop generation">
                      <Square size={20} fill="currentColor" />
                    </button>
                  ) : (
                    <button type="submit" disabled={!input.trim()}
                      className={`p-2.5 rounded-xl transition-all ${
                        input.trim()
                          ? 'bg-tecdia-accent text-white hover:bg-tecdia-accent/90'
                          : 'bg-tecdia-background text-tecdia-text/20 cursor-not-allowed border border-tecdia-border'
                      }`}>
                      <Send size={20} />
                    </button>
                  )}
                </div>
              </form>
              <p className="text-[10px] text-center mt-1 text-tecdia-text/40 font-medium">
                Tecdia SmartFix can make mistakes. Always verify critical decisions with a qualified engineer.
              </p>
            </div>
          </div>
        </main>
      </div>
      <EndShiftModal isOpen={isEndShiftModalOpen} onClose={() => setIsEndShiftModalOpen(false)} />
    </PageWrapper>
  );
};

export default ChatPage;

```


## src\pages\CompanyPolicy.jsx

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

/* â”€â”€ animation â”€â”€ */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.35, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

/* â”€â”€ policy items â”€â”€ */
const THEME_COLOR = '#00A9FF';

const POLICIES = [
  {
    number: '01',
    title: 'Legal Compliance',
    desc: 'We take pride and awareness as employees of Tecdia and not only comply with laws and regulations and work rules, but also act as business people based on corporate ethics and strive to earn the trust of society.',
  },
  {
    number: '02',
    title: 'Social Contribution',
    desc: 'Through our business activities, we will solve social problems and customer problems, work to realize a better society, and contribute to the innovation and revitalization of society as a whole.',
  },
  {
    number: '03',
    title: 'Environmental Protection',
    desc: 'Our company is dedicated to creating a prosperous society and protecting the environment through our sustainable business practices. We develop products with excellent performance that are environmentally friendly, and work to eliminate wastefulness and inequality in the daily work of each of our employees. We also strive to conserve resources and energy, and aim to create a workplace that is environmentally friendly.',
  },
  {
    number: '04',
    title: 'Trust in Customers',
    desc: 'We are dedicated to providing safe products, with quality services, and information that meets and exceeds our customers expectations and earns their trust.',
  },
  {
    number: '05',
    title: 'Relationship of Trust with Business Partners',
    desc: 'We will promote transactions that consider mutual prosperity with our business partners, build transparent, fair and sound relationships of trust, and strive not to build relationships that are biased toward specific business partners.',
  },
  {
    number: '06',
    title: 'Maintaining a Healthy Working Environment',
    desc: 'In order to create a comfortable workplace, we will create a safe and comfortable working environment where all employees can work with peace of mind and work efficiently.',
  },
  {
    number: '07',
    title: 'Restrictions on Entertainment and Gifts',
    desc: 'We will not engage in any acts that deviate from general business customs regarding entertainment and the giving and receiving of gifts, including bribery.',
  },
  {
    number: '08',
    title: 'Dealing with Antisocial Forces',
    desc: 'We have nothing to do with antisocial forces that threaten social order and security, and we take a resolute attitude to deal with unreasonable demands.',
  },
  {
    number: '09',
    title: 'Conservation of Company Assets',
    desc: 'We will record the necessary assets of the company (whether tangible or intangible assets such as inventory, equipment, equipment, information, etc.) and manage them appropriately.',
  },
  {
    number: '10',
    title: 'Management of Confidential Information',
    desc: 'We manage all information, both internally and externally, as confidential information according to its importance, and strictly adhere to all privacy and security protocols.',
  },
  {
    number: '11',
    title: 'Prohibition of Individual Actions that Conflict with the Interests of the Company',
    desc: 'We do not accept any personal act that may adversely affect the business activities of Tecdia.',
  },
];

/* â”€â”€ Policy card â”€â”€ */
const PolicyCard = ({ policy, index }) => {
  return (
    <motion.div
      {...fadeUp(index * 0.05)}
      className="relative flex flex-col md:flex-row items-start gap-6 md:gap-10"
    >
      {/* Number Column */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-2"
          style={{ 
            color: THEME_COLOR, 
            borderColor: `${THEME_COLOR}40`,
            background: 'white'
          }}
        >
          {policy.number}
        </div>
        {index < POLICIES.length - 1 && (
          <div 
            className="w-0.5 flex-1 my-2"
            style={{ background: `${THEME_COLOR}20`, minHeight: '40px' }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-2xl p-6 md:p-8 border border-tecdia-border transition-all duration-300 hover:border-tecdia-accent/30"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h3 className="text-xl md:text-2xl font-bold text-tecdia-textDeep mb-2 leading-tight">
          {policy.title}
        </h3>
        <p className="text-tecdia-text/70 leading-relaxed text-base font-medium">
          {policy.desc}
        </p>
      </div>
    </motion.div>
  );
};

/* â”€â”€ Page â”€â”€ */
const CompanyPolicy = () => (
  <PageWrapper>
    <div className="relative min-h-screen overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-tecdia-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-64 h-64 rounded-full bg-[#89CFF3]/20 blur-2xl pointer-events-none" />

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative px-6 pt-36 pb-12 md:pt-48 md:pb-16 text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-tecdia-textDeep mb-4"
        >
          Company <span className="text-tecdia-accent">Policy</span>
        </motion.h1>
        <motion.p
          {...fadeUp(0.08)}
          className="text-lg text-tecdia-text/60 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          Our guiding principles for ethical business conduct and corporate responsibility.
        </motion.p>
      </section>

      {/* â”€â”€ Policy Cards â”€â”€ */}
      <section className="relative px-6 pb-28">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {POLICIES.map((policy, i) => (
            <PolicyCard key={policy.number} policy={policy} index={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  </PageWrapper>
);

export default CompanyPolicy;

```


## src\pages\FeaturesPage.jsx

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

/* â”€â”€ animation â”€â”€ */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.35, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

/* â”€â”€ flow steps â”€â”€ */
const THEME_COLOR = '#00A9FF';

const STEPS = [
  {
    number: '1',
    title: 'Instant Machine Access (IP Binding)',
    desc: 'Every workstation on your factory floor is assigned a fixed, static IP address on your local network. When a worker opens the React app on Workstation A, the backend instantly recognizes the IP address. The React frontend sees that this workstation is "bound" to a particular machine. It completely skips the Landing Page and the Machine Selection Page, and drops the worker directly into the Chat Page for that exact machine.',
  },
  {
    number: '2',
    title: 'Pick Your Role (Unrestricted IPs)',
    desc: 'For unrestricted devices (like an admin laptop or phone), there is a Landing Page at the start. When you open SmartFix, simply choose what kind of work you do â€” for example, hydraulics, electrical, or robotics. This lets the app show you only what matters to you.',
  },
  {
    number: '3',
    title: 'Find Your Machine',
    desc: 'If using the Landing Page flow, you\'ll see a list of machines that match your role. Browse through them and tap the one you\'re currently working on.',
  },
  {
    number: '4',
    title: 'Describe the Problem',
    desc: 'Just type what\'s wrong in plain words â€” no technical jargon needed. For example: "the machine keeps stopping halfway" or "there\'s a strange noise from the left side."',
  },
  {
    number: '5',
    title: 'Get a Clear Fix',
    desc: 'SmartFix reads your message and gives you a simple, step-by-step guide on what to check and how to fix it â€” like having an expert right beside you.',
  },
  {
    number: '6',
    title: 'Serious Issues Are Flagged',
    desc: 'If the problem sounds serious or urgent, SmartFix automatically alerts your supervisor or admin â€” so nothing gets overlooked and help arrives faster.',
  },
  {
    number: '7',
    title: 'Full Admin Control',
    desc: 'Admins and managers have their own dashboard where they can manage the fleet by adding or deleting machines, monitor all reported issues, and track maintenance progress to keep the whole facility running smoothly.',
  },
];

/* â”€â”€ Step card â”€â”€ */
const StepCard = ({ step, index }) => {
  return (
    <motion.div
      {...fadeUp(index * 0.05)}
      className="relative flex flex-col md:flex-row items-start gap-6 md:gap-10"
    >
      {/* Number Column */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-2"
          style={{ 
            color: THEME_COLOR, 
            borderColor: `${THEME_COLOR}40`,
            background: 'white'
          }}
        >
          {step.number}
        </div>
        {index < STEPS.length - 1 && (
          <div 
            className="w-0.5 flex-1 my-2"
            style={{ background: `${THEME_COLOR}20`, minHeight: '40px' }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-2xl p-6 md:p-8 border border-tecdia-border transition-all duration-300 hover:border-tecdia-accent/30"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h3 className="text-xl md:text-2xl font-bold text-tecdia-textDeep mb-2 leading-tight">
          {step.title}
        </h3>
        <p className="text-tecdia-text/70 leading-relaxed text-base font-medium">
          {step.desc}
        </p>
      </div>
    </motion.div>
  );
};

/* â”€â”€ Page â”€â”€ */
const FeaturesPage = () => (
  <PageWrapper>
    <div className="relative min-h-screen overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-tecdia-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-64 h-64 rounded-full bg-[#89CFF3]/20 blur-2xl pointer-events-none" />

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative px-6 pt-36 pb-12 md:pt-48 md:pb-16 text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-tecdia-textDeep mb-4"
        >
          How <span className="text-tecdia-accent">SmartFix</span> Works
        </motion.h1>
        <motion.p
          {...fadeUp(0.08)}
          className="text-lg text-tecdia-text/60 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          A simple, step-by-step guide to reporting issues and getting fixes.
        </motion.p>
      </section>

      {/* â”€â”€ Flow Steps â”€â”€ */}
      <section className="relative px-6 pb-28">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  </PageWrapper>
);

export default FeaturesPage;

```


## src\pages\IntegrationsPage.jsx

```jsx
import React from 'react';
import Footer from '../components/Footer';

const INTEGRATIONS = [
  {
    name: 'Groq LLM API',
    category: 'AI Engine',
    desc: 'Uses the Groq LPUâ„¢ Inference Engine for lightning-fast responses, powering our fault diagnosis and severity analysis.',
  },
  {
    name: 'FastAPI Backend',
    category: 'Core API',
    desc: 'A robust Python-based API server that handles all requests, domain-based access control, and background ingestion jobs.',
  },
  {
    name: 'ChromaDB',
    category: 'Vector Database',
    desc: 'The primary storage for machine manuals. It stores document embeddings and performs similarity searches to find relevant fixes.',
  },
  {
    name: 'Sentence Transformers',
    category: 'Embedding',
    desc: 'Uses the all-MiniLM-L6-v2 model to convert technical text into high-dimensional vectors for semantic search.',
  },
  {
    name: 'Docling Parser',
    category: 'Document Processing',
    desc: 'Advanced PDF parsing engine used by our ingestion pipeline to accurately extract text and layout from engineering manuals.',
  },
  {
    name: 'React & Vite',
    category: 'Frontend Stack',
    desc: 'Modern frontend technologies providing a fast, reactive, and intuitive interface for both workers and administrators.',
  },
  {
    name: 'Tailwind CSS',
    category: 'Design System',
    desc: 'A utility-first CSS framework that allows us to build premium, responsive, and consistent user interfaces.',
  },
  {
    name: 'Framer Motion',
    category: 'Animations',
    desc: 'Powering the fluid transitions and micro-interactions that make the SmartFix experience feel alive and premium.',
  },
  {
    name: 'Lucide React',
    category: 'Iconography',
    desc: 'A beautiful and consistent icon library used across the application to provide visual cues and clarity.',
  }
];

const IntegrationsPage = () => {
  return (
    <div className="relative min-h-screen bg-tecdia-background flex flex-col">
      <div className="relative z-10 flex-grow">
        {/* Header */}
        <header className="px-6 pt-36 pb-20 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-tecdia-textDeep mb-4">
            System <span className="text-tecdia-accent">Integrations</span>
          </h1>
          <p className="text-base md:text-lg text-tecdia-text/60 leading-relaxed font-medium">
            The core technology and services powering the SmartFix platform.
          </p>
        </header>

        {/* Integrations List */}
        <main className="px-6 pb-32">
          <div className="max-w-4xl mx-auto space-y-16">
            {INTEGRATIONS.map((item, index) => (
              <div key={item.name} className="relative group">
                <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-8 items-start">
                  
                  {/* Category - Bold and Larger as requested */}
                  <div className="md:col-span-4 lg:col-span-3">
                    <h2 className="text-xl md:text-2xl font-bold text-tecdia-accent uppercase tracking-tight">
                      {item.category}
                    </h2>
                  </div>

                  {/* Content */}
                  <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-tecdia-accent/40" />
                      <h3 className="text-xl font-bold text-tecdia-textDeep">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-base text-tecdia-text/65 leading-relaxed font-medium pl-4 border-l-2 border-tecdia-accent/10">
                      {item.desc}
                    </p>
                  </div>
                </div>
                
                {index < INTEGRATIONS.length - 1 && (
                  <div className="mt-16 h-px w-full bg-tecdia-accent/5" />
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default IntegrationsPage;

```


## src\pages\LandingPage.jsx

```jsx
import React, { useRef, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Wrench, ChevronRight, CheckCircle, Mail, Phone } from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth, EXPERTISE_DOMAINS } from '../context/AuthContext';
import { useWorkstation } from '../hooks/useWorkstation';
import { Shield } from 'lucide-react';

import ChromaKeyVideo from '../components/ChromaKeyVideo';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

const ChatPreview = () => (
  <div className="relative w-full max-w-lg mx-auto">
    <div className="relative bg-white border border-[#e0e0e0] overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e0e0e0] bg-[#f7f7f7]">
        <div className="w-7 h-7 bg-[#f7f7f7] border border-[#e0e0e0] flex items-center justify-center">
          <Wrench size={13} className="text-[#1428A0]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#000000]">Hydraulic Press</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1428A0] animate-pulse" />
            <p className="text-[10px] text-[#757575]">AI ready</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 bg-white">
        <div className="flex justify-end">
          <div className="max-w-[75%] bg-[#1428A0] text-white px-4 py-2.5 text-sm leading-relaxed">
            Hydraulic pressure drops mid-cycle. Seal 2 might be leaking.
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="w-7 h-7 bg-[#f7f7f7] border border-[#e0e0e0] flex items-center justify-center flex-shrink-0 mt-1">
            <Zap size={12} className="text-[#1428A0]" />
          </div>
          <div className="max-w-[80%] bg-[#f7f7f7] border border-[#e0e0e0] px-4 py-3 text-sm leading-relaxed">
            <p className="text-[#000000] font-semibold mb-1 text-xs">Diagnostic Result</p>
            <p className="text-[#333333] text-xs mb-2">Consistent with <strong className="text-[#000000]">cylinder-2 rod seal failure</strong>. Internal bypass is likely causing the pressure drop.</p>
            <div className="space-y-1">
              {['Isolate cylinder 2 and inspect rod seal', 'Check for contamination in hydraulic fluid', 'Replace seal kit â€” P/N HYD-224-RS'].map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#757575]">
                  <span className="text-[#1428A0] font-bold flex-shrink-0">{i + 1}.</span>{s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 bg-white">
        <div className="flex items-center gap-2 bg-[#f7f7f7] border border-[#e0e0e0] px-3 py-2.5">
          <p className="text-xs text-[#757575] flex-1">Ask about your machine...</p>
          <div className="w-6 h-6 bg-[#1428A0] flex items-center justify-center">
            <ArrowRight size={11} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.35, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

const LandingPage = () => {
  const { user, login } = useAuth();
  const ws = useWorkstation();

  // Workstation-bound IPs skip the landing+selector flow entirely and land
  // straight in the chat for the bound machine. Unbound IPs (dev/admin) see
  // the existing landing page below.
  if (ws.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-tecdia-text/60 text-sm">
        Checking workstationâ€¦
      </div>
    );
  }
  if (ws.bound && ws.machine?.id) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(ws.machine.id)}`} replace />;
  }

  return (
    <PageWrapper>
      <div className="relative overflow-hidden min-h-screen">
        <section className="relative px-6 pt-36 pb-20 md:pt-48 md:pb-28 overflow-hidden bg-black">
          {/* Removed glowing orbs for clean corporate look */}

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative z-20">
                <motion.h1 {...fadeUp(0.05)} className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.06] mb-6">
                  <span className="text-tecdia-textDeep">Tecdia </span>
                  <span className="text-tecdia-accent">SmartFix</span>
                </motion.h1>

                <motion.p {...fadeUp(0.15)} className="text-tecdia-text/70 text-lg max-w-xl mb-10 leading-relaxed">
                  Select your machine, describe the issue, and get expert-level fault analysis
                  in seconds â€” powered by industrial AI trained on real engineering data.
                </motion.p>

                <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Link to="/chat" className="btn-primary flex items-center justify-center gap-2.5 text-base px-8 py-4 shadow-lg hover:shadow-xl transition-shadow">
                    Start Diagnosing <ArrowRight size={18} />
                  </Link>
                  <Link to="/machines" className="btn-secondary flex items-center justify-center gap-2 text-base px-8 py-4">
                    View Machines <ChevronRight size={16} />
                  </Link>
                </motion.div>

                {/* Domain selector â€” calls POST /auth/worker-session */}
                <motion.div {...fadeUp(0.3)} className="relative z-30 bg-[#111111] border border-[#333333] p-8 max-w-xl shadow-lg">
                  <div className="flex items-center gap-2 mb-4 text-white font-bold text-sm">
                    <Shield size={16} className="text-[#1428A0]" />
                    Select Your Expertise Domain
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXPERTISE_DOMAINS.map(domain => (
                      <button
                        key={domain}
                        type="button"
                        onClick={async () => {
                          const result = await login(domain);
                          if (!result.success) alert(result.error);
                        }}
                        className={`text-xs py-3 px-4 border transition-all cursor-pointer font-semibold tracking-wide ${
                          user.domain === domain
                            ? 'bg-[#1428A0] text-white border-[#1428A0]'
                            : 'bg-[#000000] text-[#a3a3a3] border-[#333333] hover:border-[#1428A0] hover:text-white'
                        }`}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[10px] text-tecdia-text/40 leading-relaxed italic">
                    Select your domain to access relevant machine diagnostics. Sessions last 12 hours.
                  </p>
                </motion.div>
              </div>

              <motion.div {...fadeUp(0.2)} className="hidden lg:flex items-center justify-end relative">
                {/* Robot Floating on Left */}
                <div className="relative w-[260px] h-[260px] -mr-12 z-20 pointer-events-none drop-shadow-2xl translate-y-4">
                  <ChromaKeyVideo
                    src="/src/assets/robot.webm"
                    width={260}
                    height={260}
                    className="relative"
                  />
                </div>

                {/* Chat Preview on Right */}
                <div className="relative z-10 w-full max-w-[420px]">
                  <ChatPreview />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="relative px-6 py-20 bg-[#f7f7f7] border-t border-[#e0e0e0]">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 {...fadeUp(0)} className="text-3xl md:text-4xl font-bold text-[#000000] mb-4">
              Expert <span className="text-[#1428A0]">Technician Support</span>
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-[#333333] leading-relaxed max-w-2xl mx-auto mb-12">
              Facing a complex issue? Our expert engineers are here to help you get back to peak productivity. Reach out directly for specialized machine diagnostics and technical assistance.
            </motion.p>
            
            <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ffffff] border border-[#e0e0e0] text-[#1428A0] flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#757575] uppercase tracking-widest mb-0.5">Email Support</p>
                  <a href="mailto:smartfix@tecdia.co.jp" className="text-sm font-bold text-[#000000] hover:text-[#1428A0] transition-colors">smartfix@tecdia.co.jp</a>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ffffff] border border-[#e0e0e0] text-[#1428A0] flex items-center justify-center">
                  <Phone size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-[#757575] uppercase tracking-widest mb-0.5">Technician Hotline</p>
                  <a href="tel:+813XXXXXXXX" className="text-sm font-bold text-[#000000] hover:text-[#1428A0] transition-colors">+81-3-XXXX-XXXX</a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default LandingPage;
```


## src\pages\LegalNotice.jsx

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const CookiePolicy = () => (
  <div className="relative min-h-screen bg-tecdia-background flex flex-col">
    <div className="relative z-10 flex-grow">
      {/* Header */}
      <header className="px-6 pt-36 pb-16 text-center max-w-4xl mx-auto">
        <motion.h1 {...fadeUp(0)} className="text-4xl md:text-5xl font-bold text-black mb-4">
          Cookie Policy
        </motion.h1>
      </header>

      {/* Content */}
      <main className="px-6 pb-32 max-w-4xl mx-auto">
        <motion.div {...fadeUp(0.2)} className="text-black space-y-12">
          
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              This Cookie Policy explains how SmartFix uses cookies and similar technologies when users and visitors access our website and use our machine troubleshooting assistant.
            </p>
            <p className="leading-relaxed mt-4">
              This policy should be read together with our Privacy Policy and Terms of Service.
            </p>
            <p className="leading-relaxed mt-4">
              By continuing to use SmartFix, users consent to the use of cookies and related technologies as described in this policy. Users may withdraw consent at any time through browser settings or through the cookie preferences banner available on the website.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">2. What Are Cookies?</h2>
            <p className="leading-relaxed">
              Cookies are small text files stored on a userâ€™s device when visiting a website. They help websites recognize devices, remember preferences, maintain secure sessions, and improve overall user experience.
            </p>
            <p className="leading-relaxed mt-4 mb-2 font-bold text-black text-lg">SmartFix may also use similar technologies including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Local Storage</li>
              <li>Session Storage</li>
              <li>IndexedDB</li>
            </ul>
            <p className="leading-relaxed mt-4">These technologies function similarly to cookies and help support platform functionality and performance.</p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">3. How We Use Cookies</h2>
            <p className="leading-relaxed mb-4">SmartFix uses cookies and related technologies to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep authorized users signed in securely</li>
              <li>Remember selected machines, language preferences, and user interface settings</li>
              <li>Maintain active troubleshooting chat sessions</li>
              <li>Protect the platform against security threats, abuse, and unauthorized access</li>
              <li>Analyze anonymized usage data to improve platform performance and troubleshooting quality</li>
            </ul>
            <p className="leading-relaxed mt-6 font-bold text-black text-lg">
              SmartFix does not use cookies for advertising, cross-site tracking, or selling user data to third parties.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">4. Types of Cookies We Use</h2>
            <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-tecdia-accent/10">
                  <tr>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Category</th>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Purpose</th>
                    <th className="px-6 py-4 font-bold text-black border-b border-tecdia-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tecdia-border">
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Strictly Necessary</td>
                    <td className="px-6 py-5">Required for website functionality, authentication, session management, and security protection.</td>
                    <td className="px-6 py-5 whitespace-nowrap">Session / up to 30 days</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Functional</td>
                    <td className="px-6 py-5">Stores user preferences such as selected machine, language, and UI settings.</td>
                    <td className="px-6 py-5 whitespace-nowrap">Up to 12 months</td>
                  </tr>
                  <tr className="text-black">
                    <td className="px-6 py-5 font-bold whitespace-nowrap">Analytics</td>
                    <td className="px-6 py-5">Helps improve platform performance through anonymized usage analytics and performance monitoring.</td>
                    <td className="px-6 py-5 whitespace-nowrap">Up to 12 months</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm font-bold text-black/60">
              Note: Strictly Necessary cookies cannot be disabled because essential platform features such as login access and chatbot functionality depend on them.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">5. Third-Party Services</h2>
            <p className="leading-relaxed mb-4">
              Some SmartFix platform features rely on trusted third-party services that may process limited technical information on our behalf.
            </p>
            <p className="leading-relaxed mb-4 font-bold text-black text-lg">These services may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Groq</strong> â€” AI inference and troubleshooting response generation</li>
              <li><strong>Hosting/CDN Providers</strong> â€” Website delivery, system reliability, performance optimization, and security protection</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Information shared with third-party providers is limited to what is necessary for operating and maintaining the service securely and efficiently.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">6. Managing Your Cookies</h2>
            <p className="leading-relaxed mb-6 font-bold text-black text-lg">Users may manage or disable cookies through the following methods:</p>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Cookie Preferences</h3>
                <p className="leading-relaxed font-medium">Cookie settings can be adjusted through the cookie banner or the â€œCookie Settingsâ€ option available on the website.</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-black mb-2">Browser Settings</h3>
                <p className="leading-relaxed mb-2 font-medium">Most browsers allow users to block, manage, or delete cookies through browser settings. Supported browsers may include:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Google Chrome</li>
                  <li>Mozilla Firefox</li>
                  <li>Safari</li>
                  <li>Microsoft Edge</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold text-black mb-2">Do Not Track (DNT)</h3>
                <p className="leading-relaxed font-medium">Where technically feasible, SmartFix respects browser-based â€œDo Not Trackâ€ signals.</p>
              </div>
            </div>

            <p className="leading-relaxed mt-8 p-4 bg-white/50 rounded-xl border border-tecdia-border italic text-sm font-medium">
              Please note that disabling cookies may affect website functionality, including login sessions, saved preferences, and chatbot accessibility.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">7. Changes to This Policy</h2>
            <p className="leading-relaxed">
              SmartFix may update this Cookie Policy periodically to reflect changes in technology, regulations, or platform functionality.
            </p>
            <p className="leading-relaxed mt-4">
              The â€œLast Updatedâ€ date at the top of this page will indicate the latest version of the policy. Significant updates may also be communicated through the website.
            </p>
          </section>

          <hr className="border-tecdia-border/30" />

          <section className="bg-white/60 border border-tecdia-border p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold text-black mb-4">8. Contact Us</h2>
            <p className="leading-relaxed mb-6 font-medium">If users have any questions regarding this Cookie Policy or the use of cookies and related technologies, please contact us:</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-black">Email:</span>
                <a href="mailto:support@tecdia.com" className="text-black hover:text-tecdia-accent transition-colors font-bold underline decoration-black/30 underline-offset-4">support@tecdia.com</a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-black">Address:</span>
                <span className="text-black font-bold">Tecdia Inc., Morgan Hill, CA, USA</span>
              </div>
            </div>
          </section>

        </motion.div>
      </main>
    </div>

    <Footer />
  </div>
);

export default CookiePolicy;

```


## src\pages\MachinesPage.jsx

```jsx
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings2, Printer, Scissors, Bot, Wrench, Gauge, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical, ChevronRight, Search, X
} from 'lucide-react';
import { useMachines } from '../context/MachineContext';
import { useAuth } from '../context/AuthContext';
import { useWorkstation } from '../hooks/useWorkstation';
import { ShieldAlert } from 'lucide-react';


const ICON_MAP = {
  Settings2, Gauge, Printer, Scissors, Bot, Wrench, Cpu,
  Factory, Cog, Activity, Flame, Monitor, Layers, Radio, Thermometer,
  HardDrive, Truck, FlaskConical,
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const MachinesPage = () => {
  const { machines } = useMachines();
  const { user } = useAuth();
  const ws = useWorkstation();
  const [searchQuery, setSearchQuery] = useState('');

  // Bound workstations don't get a picker â€” they go straight to their machine's chat.
  if (ws.bound && ws.machine?.id) {
    return <Navigate to={`/chat?machine=${encodeURIComponent(ws.machine.id)}`} replace />;
  }

  const filteredMachines = machines.filter((m) => {
    // 1. Search filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      m.name.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Domain filter (per API contract â€” AuthContext exposes user.domain)
    if (user.domain === 'All Access') return true;

    // Always show General machines
    if (m.category === 'General') return true;

    // Show machines matching the worker's domain
    return m.category === user.domain;
  });

  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col items-center px-6 pb-20 relative overflow-hidden">

        {/* â”€â”€ Hero strip with gradient â”€â”€ */}
        <div
          className="w-full flex flex-col items-center pt-32 pb-16 relative overflow-hidden mb-4"
          style={{ background: 'linear-gradient(160deg, #89CFF3 0%, #CDF5FD 60%, #A0E9FF 100%)' }}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#00A9FF]/10 blur-[80px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 rounded-full bg-[#89CFF3]/40 blur-[60px]" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-center relative z-10"
          >
            <span className="inline-flex items-center gap-2 bg-white/70 border border-[#89CFF3] backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-bold text-[#00A9FF] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A9FF] animate-pulse" />
              {machines.length} machines available
            </span>
            <h1 className="text-6xl md:text-8xl font-bold mb-4">
              <span className="text-[#1a1a2e]">Your </span>
              <span className="text-[#00A9FF]">Machines</span>
            </h1>
            <p className="text-base md:text-lg max-w-md mx-auto text-[#1a1a2e]/70">
              Choose a machine to start AI-powered fault diagnostics
            </p>
          </motion.div>

          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
            <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" className="w-full h-8" preserveAspectRatio="none">
              <path d="M0,20 C480,40 960,0 1440,20 L1440,40 L0,40 Z" fill="#CDF5FD" />
            </svg>
          </div>
        </div>

        {/* â”€â”€ Search Bar â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl mb-10 relative z-10"
        >
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00A9FF]/60 group-focus-within:text-[#00A9FF] transition-colors duration-300 pointer-events-none" />
            <input
              id="machine-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search machines by name, type, or category..."
              className="w-full pl-11 pr-10 py-4 rounded-2xl text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/40 bg-white border-2 border-[#89CFF3] focus:border-[#00A9FF] outline-none transition-all duration-300 font-medium shadow-sm"
              style={{ boxShadow: '0 2px 12px rgba(0,169,255,0.08)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#1a1a2e]/40 hover:text-[#1a1a2e] hover:bg-[#89CFF3]/20 transition-all duration-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-[#1a1a2e]/50 mt-2 ml-1 font-medium">
              {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} found
            </p>
          )}
        </motion.div>

        {/* â”€â”€ Machine Grid â”€â”€ */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10"
          style={{ gridAutoRows: '1fr' }}
        >
          {filteredMachines.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-white border-2 border-[#89CFF3] shadow-sm">
                <Search size={24} className="text-[#1a1a2e]/30" />
              </div>
              <p className="text-[#1a1a2e]/50 text-sm font-medium">No machines match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#00A9FF] hover:text-[#0077cc] transition-colors font-bold"
              >
                Clear search
              </button>
            </motion.div>
          )}

          {filteredMachines.map((machine, index) => {
            const Icon = ICON_MAP[machine.icon] || Settings2;
            return (
              <motion.div
                key={machine.id || index}
                className="h-full"
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
              >
                <Link
                  to={`/chat?machine=${encodeURIComponent(machine.name)}`}
                  className="group relative h-full flex flex-col rounded-2xl p-6 overflow-hidden cursor-pointer transition-all duration-300 bg-white border-2 border-[#89CFF3] hover:border-[#00A9FF]/60 hover:shadow-xl hover:shadow-[#00A9FF]/10 hover:-translate-y-1"
                >
                  {/* Bottom accent line on hover */}
                  <div className="absolute bottom-0 left-0 h-[3px] w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-[#00A9FF] rounded-b-2xl" />

                  {/* Icon row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md bg-[#00A9FF]/10 border border-[#00A9FF]/20 flex-shrink-0 overflow-hidden">
                      {machine.customIconUrl ? (
                        <img src={machine.customIconUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon size={22} className="text-[#00A9FF]" />
                      )}
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all duration-200 mt-1 text-[#00A9FF] group-hover:translate-x-0.5" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#1a1a2e] mb-2">{machine.name}</h3>

                  {/* Description â€” flex-1 makes this grow so badge is always at bottom */}
                  <p className="text-sm leading-relaxed text-[#1a1a2e]/60 flex-1 min-h-[40px]">
                    {machine.description || 'AI-powered diagnostics for this machine type.'}
                  </p>

                  {/* Category badge â€” pinned to bottom via mt-4 after flex-1 description */}
                  <div className="mt-4">
                    {machine.category ? (
                      <span className="inline-block self-start text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#00A9FF]/10 text-[#00A9FF] border border-[#00A9FF]/20">
                        {machine.category}
                      </span>
                    ) : (
                      /* invisible spacer so cards without category still match height */
                      <span className="inline-block h-[26px]" />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default MachinesPage;

```


## src\pages\PrivacyPolicy.jsx

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

/* â”€â”€ animation â”€â”€ */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.35, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

const THEME_COLOR = '#00A9FF';

/* â”€â”€ section data â”€â”€ */
const SECTIONS = [
  {
    number: '01',
    title: 'Who this applies to',
    content: (
      <ul className="space-y-3">
        <li className="leading-relaxed">
          <strong>Workers</strong> â€” shop-floor technicians who sign in at a workstation and ask the assistant questions.
        </li>
        <li className="leading-relaxed">
          <strong>Admins</strong> â€” staff who sign in to the admin dashboard to manage manuals, view analytics, and receive alerts.
        </li>
      </ul>
    ),
  },
  {
    number: '02',
    title: 'What we collect',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-bold text-tecdia-textDeep mb-2">From workers</h4>
          <ul className="list-disc pl-6 space-y-1.5 text-tecdia-text/70">
            <li>Worker name or ID that you enter at sign-in.</li>
            <li>Workstation network address (IP), used to identify which physical machine you are working on.</li>
            <li>Your chat messages and the assistant's replies, including timestamps.</li>
            <li>Severity tag the assistant assigns to each answer (info / minor / degraded / production impact / safety).</li>
            <li>A session cookie that keeps you signed in on that workstation.</li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold text-tecdia-textDeep mb-2">From admins</h4>
          <ul className="list-disc pl-6 space-y-1.5 text-tecdia-text/70">
            <li>Email address (used for magic-link sign-in via Resend).</li>
            <li>A session cookie that keeps you signed in to the admin dashboard.</li>
            <li>Audit data: manuals you upload, machines you create or edit, alerts you view.</li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-bold text-tecdia-textDeep mb-2">Automatic / technical</h4>
          <ul className="list-disc pl-6 space-y-1.5 text-tecdia-text/70">
            <li>Standard server logs (request paths, response codes, timestamps, IP). Used only for debugging and security monitoring.</li>
          </ul>
        </div>
        <p className="text-sm italic text-tecdia-text/50 bg-white/60 border border-tecdia-border rounded-xl p-4">
          We do not collect government IDs, payroll data, biometrics, location beyond the workstation IP, or any data from your personal devices.
        </p>
      </div>
    ),
  },
  {
    number: '03',
    title: 'Why we collect it',
    content: (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/60 shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead style={{ background: `${THEME_COLOR}10` }}>
              <tr>
                <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Data</th>
                <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tecdia-border text-tecdia-text/70">
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Worker name + IP</td><td className="px-5 py-4">Identify who is asking from which machine, so answers come from the right manual</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Chat messages</td><td className="px-5 py-4">Generate troubleshooting answers; show your chat history; improve the assistant</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Severity tags</td><td className="px-5 py-4">Trigger admin alerts for serious faults; populate the analytics dashboard</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Admin email</td><td className="px-5 py-4">Magic-link sign-in; send alert notifications</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Cookies</td><td className="px-5 py-4">Keep you signed in for the duration of your shift / admin session</td></tr>
              <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Server logs</td><td className="px-5 py-4">Detect abuse, debug outages</td></tr>
            </tbody>
          </table>
        </div>
        <p className="font-bold text-tecdia-textDeep">
          We do not use any of this data for advertising, profiling, or selling to third parties.
        </p>
      </div>
    ),
  },
  {
    number: '04',
    title: 'Third parties',
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-tecdia-text/70">
          SmartFix relies on the following services. Your data is transmitted to them only as needed to deliver the feature:
        </p>
        <ul className="space-y-3">
          <li className="bg-white/60 border border-tecdia-border rounded-xl p-4">
            <strong className="text-tecdia-textDeep">Groq</strong> <span className="text-tecdia-text/50">(groq.com)</span> â€” receives the text of your question and the relevant manual excerpts, so the LLM can generate an answer. Groq's privacy policy applies.
          </li>
          <li className="bg-white/60 border border-tecdia-border rounded-xl p-4">
            <strong className="text-tecdia-textDeep">Resend</strong> <span className="text-tecdia-text/50">(resend.com)</span> â€” receives admin email addresses to deliver magic-link sign-in emails and alert notifications. Resend's privacy policy applies.
          </li>
          <li className="bg-white/60 border border-tecdia-border rounded-xl p-4">
            <strong className="text-tecdia-textDeep">Hosting provider</strong> â€” operates the servers where SmartFix runs.
          </li>
        </ul>
        <p className="font-medium text-tecdia-text/70">We do not share data with anyone else.</p>
      </div>
    ),
  },
  {
    number: '05',
    title: 'How long we keep it',
    content: (
      <div className="overflow-x-auto border border-tecdia-border rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead style={{ background: `${THEME_COLOR}10` }}>
            <tr>
              <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Data</th>
              <th className="px-5 py-3.5 font-bold text-tecdia-textDeep border-b border-tecdia-border">Retention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tecdia-border text-tecdia-text/70">
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Chat history</td><td className="px-5 py-4">90 days, then deleted</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Worker session cookies</td><td className="px-5 py-4">Expire when the browser is closed, or after 8 hours</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Admin session cookies</td><td className="px-5 py-4">7 days</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Admin alert log</td><td className="px-5 py-4">12 months</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Server logs</td><td className="px-5 py-4">30 days</td></tr>
            <tr><td className="px-5 py-4 font-semibold text-tecdia-textDeep whitespace-nowrap">Uploaded manuals + indexed chunks</td><td className="px-5 py-4">Kept until removed by an admin</td></tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    number: '06',
    title: 'Security',
    content: (
      <div className="space-y-4">
        <ul className="list-disc pl-6 space-y-2 text-tecdia-text/70">
          <li>Sign-in cookies are HTTP-only.</li>
          <li>Admin sign-in uses single-use magic links that expire in 15 minutes.</li>
          <li>The vector database and chat history are stored on Tecdia-controlled infrastructure.</li>
          <li>API keys (Groq, Resend) are stored as server-side secrets, not exposed to the browser.</li>
        </ul>
        <p className="text-sm italic text-tecdia-text/50 bg-white/60 border border-tecdia-border rounded-xl p-4">
          No system is perfect â€” if you suspect a security issue, report it to{' '}
          <a href="mailto:security@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold not-italic">
            security@yourcompany.com
          </a>.
        </p>
      </div>
    ),
  },
  {
    number: '07',
    title: 'Your rights',
    content: (
      <div className="space-y-4">
        <p className="leading-relaxed text-tecdia-text/70">If you are a worker or admin whose data is in SmartFix, you can:</p>
        <ul className="list-disc pl-6 space-y-2 text-tecdia-text/70">
          <li>Ask what we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your chat history or admin account.</li>
          <li>Withdraw consent by signing out and asking an admin to delete your records.</li>
        </ul>
        <p className="leading-relaxed text-tecdia-text/70">
          Email{' '}
          <a href="mailto:privacy@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">
            privacy@yourcompany.com
          </a>{' '}
          and we will respond within 30 days.
        </p>
        <p className="leading-relaxed font-medium text-tecdia-text/70">
          Depending on where you work, you may also have rights under GDPR, UK GDPR, CCPA, India DPDP Act, or other local laws. Those rights apply on top of what is listed above.
        </p>
      </div>
    ),
  },
  {
    number: '08',
    title: 'Children',
    content: (
      <p className="leading-relaxed text-tecdia-text/70">
        SmartFix is an internal workplace tool. It is not intended for, and not knowingly used by, anyone under 18.
      </p>
    ),
  },
  {
    number: '09',
    title: 'Changes to this policy',
    content: (
      <p className="leading-relaxed text-tecdia-text/70">
        We may update this policy as the product evolves. Material changes will be announced internally at least 14 days before they take effect. The "Last updated" date at the top always reflects the current version.
      </p>
    ),
  },
  {
    number: '10',
    title: 'Contact',
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-tecdia-textDeep">Privacy:</span>
          <a href="mailto:privacy@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">privacy@yourcompany.com</a>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-tecdia-textDeep">Security:</span>
          <a href="mailto:security@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">security@yourcompany.com</a>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-bold text-tecdia-textDeep">Operator:</span>
          <span className="font-semibold text-tecdia-text/70">Tecdia, Tokyo, Japan</span>
        </div>
      </div>
    ),
  },
];

/* â”€â”€ Section card â”€â”€ */
const SectionCard = ({ section, index }) => (
  <motion.div
    {...fadeUp(index * 0.05)}
    className="relative flex flex-col md:flex-row items-start gap-6 md:gap-10"
  >
    {/* Number Column */}
    <div className="flex-shrink-0 flex flex-col items-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm border-2"
        style={{
          color: THEME_COLOR,
          borderColor: `${THEME_COLOR}40`,
          background: 'white',
        }}
      >
        {section.number}
      </div>
      {index < SECTIONS.length - 1 && (
        <div
          className="w-0.5 flex-1 my-2"
          style={{ background: `${THEME_COLOR}20`, minHeight: '40px' }}
        />
      )}
    </div>

    {/* Content */}
    <div
      className="flex-1 rounded-2xl p-6 md:p-8 border border-tecdia-border transition-all duration-300 hover:border-tecdia-accent/30"
      style={{
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <h3 className="text-xl md:text-2xl font-bold text-tecdia-textDeep mb-3 leading-tight">
        {section.title}
      </h3>
      <div className="text-base font-medium">{section.content}</div>
    </div>
  </motion.div>
);

/* â”€â”€ Page â”€â”€ */
const PrivacyPolicy = () => (
  <PageWrapper>
    <div className="relative min-h-screen overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-tecdia-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-64 h-64 rounded-full bg-[#89CFF3]/20 blur-2xl pointer-events-none" />

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative px-6 pt-36 pb-6 md:pt-48 md:pb-10 text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-tecdia-textDeep mb-4"
        >
          Privacy <span className="text-tecdia-accent">Policy</span>
        </motion.h1>
        <motion.p
          {...fadeUp(0.08)}
          className="text-lg text-tecdia-text/60 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          How SmartFix handles your data â€” transparent, minimal, and respectful.
        </motion.p>
      </section>

      {/* â”€â”€ Operator Badge â”€â”€ */}
      <section className="relative px-6 pb-12">
        <motion.div
          {...fadeUp(0.12)}
          className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-tecdia-text/60 font-medium bg-white/50 border border-tecdia-border rounded-2xl px-8 py-5"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <span><strong className="text-tecdia-textDeep">Operator:</strong> Tecdia, Tokyo, Japan</span>
          <span className="hidden sm:inline text-tecdia-border">|</span>
          <span><strong className="text-tecdia-textDeep">Contact:</strong>{' '}
            <a href="mailto:privacy@yourcompany.com" className="text-tecdia-accent hover:underline font-semibold">privacy@yourcompany.com</a>
          </span>
          <span className="hidden sm:inline text-tecdia-border">|</span>
          <span><strong className="text-tecdia-textDeep">Last updated:</strong> 17 May 2026</span>
        </motion.div>
      </section>

      {/* â”€â”€ Intro â”€â”€ */}
      <section className="relative px-6 pb-14">
        <motion.p
          {...fadeUp(0.15)}
          className="max-w-3xl mx-auto text-center text-tecdia-text/60 leading-relaxed font-medium"
        >
          This policy explains what information SmartFix collects when you use it, why, how long we keep it, and who else sees it.
          SmartFix is an internal troubleshooting assistant for Tecdia's shop-floor machinery. It is not a public consumer product.
        </motion.p>
      </section>

      {/* â”€â”€ Section Cards â”€â”€ */}
      <section className="relative px-6 pb-28">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {SECTIONS.map((section, i) => (
            <SectionCard key={section.number} section={section} index={i} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  </PageWrapper>
);

export default PrivacyPolicy;

```


