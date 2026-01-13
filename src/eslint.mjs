/**
 * Kabran ESLint Base Configuration
 *
 * Decisions based on: qst-006-s21-quality-standards-decisions.md
 *
 * Key decisions:
 * - Q6: import/order OFF (auto-fix via Prettier, not ESLint)
 * - Q9: Security rules BLOCK any issue
 * - Q11: no-unused-vars OFF (validate in TypeScript build only)
 *
 * Usage in your project:
 *
 * // eslint.config.mjs
 * import kabranConfig from 'kabran-config/eslint';
 * export default [...kabranConfig];
 *
 * // Or with customizations:
 * import kabranConfig from 'kabran-config/eslint';
 * export default [
 *   ...kabranConfig,
 *   { rules: { 'no-console': 'off' } }
 * ];
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

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
    ],
  },

  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Import plugin (no order rule - Q6: handled by Prettier)
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Q6: import/order OFF - auto-fix silencioso via Prettier
      // Agentes nao devem gastar raciocinio decidindo ordem de imports
      'import/no-duplicates': 'error',
      'import/no-extraneous-dependencies': 'error', // Seguranca: previne alucinacao de pacotes
    },
  },

  // General rules
  {
    rules: {
      // TypeScript - AI-Native optimized
      '@typescript-eslint/no-explicit-any': 'error', // Research: Force explicit types
      // Q11: no-unused-vars OFF - validar apenas no build (tsconfig)
      // Evita "Sindrome do Loop de Refatoracao" onde agente apaga/readiciona imports
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {prefer: 'type-imports'},
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-require-imports': 'off', // Comum em projetos Node.js
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
        // Configuravel por projeto via complexity threshold
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
