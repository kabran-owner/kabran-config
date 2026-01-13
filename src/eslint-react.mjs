/**
 * Kabran ESLint Configuration for React projects
 *
 * Decisions based on: qst-006-s21-quality-standards-decisions.md
 *
 * Usage in your project:
 *
 * // eslint.config.mjs
 * import kabranConfig from 'kabran-config/eslint/react';
 * export default [...kabranConfig];
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

// Optional JSDoc plugin (peer dependency)
let jsdocPlugin;
try {
  jsdocPlugin = (await import('eslint-plugin-jsdoc')).default;
} catch {
  // JSDoc plugin not installed - will skip JSDoc rules
}

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/*.min.js',
      '**/*.d.ts',
      '**/storybook-static/**',
    ],
  },

  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Browser globals
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
    },
  },

  // Import plugin (no order rule - Q6: handled by Prettier)
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Q6: import/order OFF - auto-fix silencioso via Prettier
      'import/no-duplicates': 'error',
      'import/no-extraneous-dependencies': 'error', // Seguranca: previne alucinacao de pacotes
    },
  },

  // React plugins
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Refresh (HMR)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Accessibility (all as errors for strict compliance)
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },

  // General rules
  {
    rules: {
      // TypeScript - AI-Native optimized
      '@typescript-eslint/no-explicit-any': 'error', // Research: Force explicit types
      // Q11: no-unused-vars OFF - validar apenas no build (tsconfig)
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {prefer: 'type-imports'},
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-require-imports': 'off', // Compatibilidade
      '@typescript-eslint/no-empty-object-type': 'off', // Permite {} em tipos

      // Best practices
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', {allow: ['warn', 'error']}],
      'no-empty': ['error', {allowEmptyCatch: true}], // Permite catch vazio
      eqeqeq: ['error', 'always', {null: 'ignore'}], // Research: reduz ambiguidade logica
      curly: ['error', 'all'],
      'no-eval': 'error', // Q9: Seguranca - bloqueia code injection
      'no-implied-eval': 'error', // Q9: Seguranca
      'no-new-func': 'error', // Q9: Seguranca
    },
  },

  // JSDoc plugin (optional - only if installed)
  ...(jsdocPlugin ? [
    {
      plugins: {
        jsdoc: jsdocPlugin,
      },
      rules: {
        // Q2.3: JSDoc seletivo - apenas funcoes complexas
        'jsdoc/require-jsdoc': 'off', // Q1.1: Seletivo - apenas complexas (decisao do dev)
        'jsdoc/require-param': 'off',
        'jsdoc/require-returns': 'off',
        'jsdoc/require-param-type': 'off', // TypeScript ja tem tipos
        'jsdoc/require-returns-type': 'off', // TypeScript ja tem tipos
        'jsdoc/check-param-names': 'error',
        'jsdoc/check-tag-names': 'error',
        'jsdoc/check-types': 'off', // TypeScript eh source of truth
        'jsdoc/no-undefined-types': 'off', // TypeScript valida tipos
      },
    },
  ] : []),

  // Prettier (must be last)
  prettier,
];

export default config;
