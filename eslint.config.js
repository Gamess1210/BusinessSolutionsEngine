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
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // BSE complexity rule — CC 1-10: pass; CC 11+: build-blocking error, refactor required
      'complexity': ['error', { 'max': 10 }],
    },
  },
  {
    // Vercel serverless functions run in Node.js — allow Node globals
    files: ['api/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Server-side-only lib helpers (no browser runtime)
    files: ['src/lib/sharepoint.js', 'src/lib/generatePdf.js', 'src/lib/generateBaDoc.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])