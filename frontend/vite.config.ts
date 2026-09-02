import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // TrustFund's API (Django/DRF) is CORS-whitelisted for this origin.
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Force a dev/test React build regardless of an ambient NODE_ENV
    // (e.g. NODE_ENV=production in the shell). Production React builds omit
    // `React.act`, which breaks @testing-library/react's render.
    env: { NODE_ENV: 'test' },
    // css: false (default) — tests assert structure/accessibility, not
    // computed styles, and jsdom's parser chokes on modern token syntax
    // (color-mix, clamp) that the Vite build handles fine.
  },
});