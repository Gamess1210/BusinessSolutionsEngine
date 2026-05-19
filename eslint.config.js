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
      // BSE complexity rule — see Section 6.4 of BSE Instructions v5.1
      // CC 1-10:  pass (green/warn)
      // CC 11-20: error — auto-fed to codeFixChain before Gemini review
      // CC 21+:   untestable — pipeline pauses, BA notified via Teams
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
    files: ['src/lib/sharepoint.js', 'src/lib/generatePdf.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])