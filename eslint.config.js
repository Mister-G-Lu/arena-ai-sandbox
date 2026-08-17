import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

const CODE_FILES = ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'];
const REACT_FILES = ['src/**/*.{js,jsx,ts,tsx}'];

export default [
  {
    ignores: [
      'coverage/**',
      'docs/**',
      'node_modules/**',
      'dist/**',
      '*.min.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: CODE_FILES,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      sonarjs,
    },
    rules: {
      ...js.configs.recommended.rules,
      // A hard ceiling keeps source files small enough to review and test.
      'max-lines': ['error', { max: 500, skipBlankLines: false, skipComments: false }],
      // Keep complexity and copy-paste regressions visible in the local gate.
      complexity: ['error', { max: 35 }],
      'sonarjs/cognitive-complexity': ['error', 35],
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicate-string': ['error', { threshold: 8 }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|_)' },
      ],
      'no-unused-vars': 'off',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Render untrusted text through React interpolation.' },
        { property: 'outerHTML', message: 'Render untrusted text through React interpolation.' },
      ],
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
  {
    files: REACT_FILES,
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/jsx-no-comment-textnodes': 'off',
      'react/no-danger': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/context/GameStateContext.jsx',
      'src/context/GameStateContext.testUtils.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
