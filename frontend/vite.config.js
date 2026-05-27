import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Helper: SPA/API collision pattern.
//
// Several backend routes share a URL prefix with frontend React routes
// (`/admin/...` is both the admin SPA and the admin REST API; `/machines`
// is both a React page and `GET /machines` returning JSON). The proxy
// bypasses to the SPA entry when the browser is navigating (Accept
// includes text/html) and forwards to the backend otherwise. Mirrors the
// nginx prod config in frontend/nginx.conf.
const apiSpaProxy = (target = 'http://localhost:8000') => ({
  target,
  changeOrigin: true,
  bypass(req) {
    if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
      return '/index.html';
    }
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ── Backend-only paths (no React route at the same URL) ──
      '/auth':        'http://localhost:8000',
      '/shifts':      'http://localhost:8000',
      '/query':       'http://localhost:8000',
      '/health':      'http://localhost:8000',
      '/workstation': 'http://localhost:8000',
      // Custom machine icons (admin upload) served by FastAPI's StaticFiles
      // mount at /uploads/icons/. Only this subpath is exposed; PDFs in
      // /uploads/ stay private.
      '/uploads':     'http://localhost:8000',

      // ── SPA-vs-API collisions ──
      // /admin covers every backend endpoint under that prefix (config,
      // machines, alerts, shifts, analytics, audit, jobs, _seed-analytics,
      // …) so adding a new /admin route to api.py never requires a Vite
      // config edit. The bypass falls through to /index.html for browser
      // navigation to /admin and /admin/login so the SPA still owns those
      // page routes.
      '/admin':    apiSpaProxy(),
      '/machines': apiSpaProxy(),
    }
  }
})
