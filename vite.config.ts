/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Build time in UTC, e.g. '2026-10-07 19:52:31'. Shown as the version, and compared to spot a newer deploy. */
const build = new Date().toISOString().slice(0, 19).replace('T', ' ');

/** Publishes /version.json so a running app can tell when a newer build is live. */
function versionFile(): Plugin {
  return {
    name: 'deathcookies-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ build })}\n` });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD__: JSON.stringify(build) },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'worker/src/**/*.test.ts'],
  },
});
