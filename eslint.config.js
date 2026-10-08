import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'docs/design', 'node_modules', 'worker/node_modules', 'worker/.wrangler'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // Layer boundaries (docs/PLAN.md): the domain knows nothing of UI or storage,
  // and the UI never talks to Firebase directly.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', 'firebase', 'firebase/*', '../ui/*', '../data/*', '../services/*'] }],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['firebase', 'firebase/*'] }],
    },
  },
  {
    files: ['worker/src/**/*.ts', 'tools/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tools/**/*.mjs'],
    extends: [js.configs.recommended],
  },
  {
    files: ['public/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.serviceworker },
  },
);
