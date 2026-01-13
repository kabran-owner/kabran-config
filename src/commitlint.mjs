/**
 * Kabran Commitlint Configuration
 *
 * Usage in your project:
 *
 * // commitlint.config.mjs
 * export { default } from 'kabran-config/commitlint';
 *
 * // Or with customizations:
 * import config from 'kabran-config/commitlint';
 * export default {
 *   ...config,
 *   rules: {
 *     ...config.rules,
 *     'scope-enum': [2, 'always', ['api', 'web', 'docs']],
 *   },
 * };
 */

/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of these
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, missing semicolons, etc
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'build',    // Changes to build system or dependencies
        'ci',       // CI configuration files and scripts
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
      ],
    ],

    // Subject rules
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],

    // Type rules
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Body rules
    'body-max-line-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],

    // Footer rules
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
};

export default config;
