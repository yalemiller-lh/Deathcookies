/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Build time in UTC, e.g. '2026-10-07 19:52', shown as the version. */
const build = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(build) },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'sender/src/**/*.test.ts'],
  },
});
