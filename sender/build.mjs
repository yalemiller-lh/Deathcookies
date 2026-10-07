// Bundles src/run.ts (with the shared domain code it imports from ../src)
// into lib/run.mjs. Packages stay external and come from this folder's node_modules.
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path => fileURLToPath(new URL(path, import.meta.url));

await build({
  entryPoints: [here('src/run.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  outfile: here('lib/run.mjs'),
  logLevel: 'info',
});
