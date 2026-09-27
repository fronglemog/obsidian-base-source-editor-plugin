/* ========================= IMPORTS ========================= */
/* ESLINT */
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';

/* PLUGINS */
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import eslintPluginObsidianmd from 'eslint-plugin-obsidianmd';

/* ========================= ESLINT CONFIG ========================= */
export default defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/build/**',
    // 'eslint.config.mjs',
    // 'esbuild.config.mjs',
    // 'version-bump.mjs'
  ]),

  {
    files: [
      '**/*.{js,mjs,cjs,ts,mts,cts}',
      '**/*.{svelte,svelte.js,svelte.ts}'
    ],
    plugins: {
      js,
      '@typescript-eslint': tseslint.plugin,
      unicorn: eslintPluginUnicorn,
      obsidianmd: eslintPluginObsidianmd
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.eslintRecommended,
      tseslint.configs.recommended,
      tseslint.configs.recommendedTypeCheckedOnly,
      // eslintPluginUnicorn.configs.recommended,
      eslintPluginObsidianmd.configs.recommended
    ],
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.node,
        ...globals.browser
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions : {
        projectService: true,
      },
    },
    rules: {
      // ESLint
      'no-empty': 'warn',
      'no-prototype-builtins': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-var': 'error',
      'eslint-comments/require-description': 'off',
      'no-throw-literal': 'off',

      // TypeScript ESLint
      '@typescript-eslint/ban-ts-comment' : 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-empty-function' : 'off',
      '@typescript-eslint/no-empty-object-type' : 'off',
      '@typescript-eslint/no-explicit-any' : 'off',
      '@typescript-eslint/no-misused-promises' : 'off',
      '@typescript-eslint/no-namespace' : 'warn',
      '@typescript-eslint/no-redundant-type-constituents' : 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unsafe-assignment' : 'off',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unused-vars' : 'warn',
      '@typescript-eslint/only-throw-error': 'error',

      // eslint-plugin-unicorn
      'unicorn/no-array-callback-reference': 'error',
      'unicorn/no-for-each': 'error',
      'unicorn/no-array-reduce': 'warn',
      'unicorn/no-array-reverse': 'warn',
      'unicorn/no-array-sort': 'warn',
      'unicorn/no-for-loop': 'warn',
      'unicorn/no-immediate-mutation': 'warn',
      'unicorn/no-instanceof-builtins': 'warn',
      'unicorn/no-magic-array-flat-depth': 'warn',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/no-negation-in-equality-check': 'warn',
      'unicorn/no-static-only-class': 'warn',
      'unicorn/no-unnecessary-array-flat-depth': 'warn',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prefer-modern-dom-apis': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/prefer-object-from-entries': 'warn',

      // eslint-plugin-obsidianmd
      // 'obsidianmd/no-static-styles-assignment' : 'warn',
      // 'obsidianmd/ui/sentence-case' : 'off',
      // 'obsidianmd/validate-manifest' : 'off',
      // 'obsidianmd/no-global-this': 'off',
      // 'obsidianmd/no-nodejs-modules': 'off',
      // 'obsidianmd/no-console': 'off'
    },
  },

  /* SVELTE */
  {
    files: [
      '**/*.{svelte,svelte.js,svelte.ts}'
    ],
    plugins: {
      svelte: eslintPluginSvelte,
    },
    extends: [
      eslintPluginSvelte.configs.recommended
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: tseslint.parser
      }
    },
    rules: {
      // eslint-plugin-svelte

    }
  }
]);
