import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client talks to the API via a relative `/api` path. In dev, Vite proxies
// those requests to the Express server on :4000. In production the Express
// server itself serves the built client, so the same relative path works.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
