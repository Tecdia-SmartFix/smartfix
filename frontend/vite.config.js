import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ── Backend-only paths (no React route at the same URL) ──
      '/auth':                  'http://localhost:8000',
      '/admin/machines':        'http://localhost:8000',
      '/admin/jobs':            'http://localhost:8000',
      '/admin/alerts':          'http://localhost:8000',
      '/admin/analytics':       'http://localhost:8000',
      '/admin/audit':           'http://localhost:8000',
      '/admin/_seed-analytics': 'http://localhost:8000',
      '/admin/shifts':          'http://localhost:8000',
      '/shifts':                'http://localhost:8000',
      '/query':                 'http://localhost:8000',
      '/health':                'http://localhost:8000',
      '/workstation':           'http://localhost:8000',

      // ── SPA-vs-API collision: /machines is both a React route and a backend GET.
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
