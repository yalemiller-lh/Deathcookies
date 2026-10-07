// Bundles functions/src (with the shared domain code it imports) into
// functions/lib/index.js. Packages stay external; Cloud Functions installs them.
import { build } from 'esbuild';

await build({
  entryPoints: ['functions/src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  packages: 'external',
  outfile: 'functions/lib/index.js',
  sourcemap: true,
  logLevel: 'info',
});
