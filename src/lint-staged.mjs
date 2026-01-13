/**
 * Kabran Lint-Staged Configuration
 *
 * Usage in your project's package.json:
 *
 * {
 *   "lint-staged": {
 *     "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
 *     "*.{js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
 *     "*.{json,md,css,scss}": ["prettier --write"],
 *     "*.py": ["black"]
 *   }
 * }
 *
 * Or import programmatically:
 *
 * // lint-staged.config.mjs
 * export { default } from 'kabran-config/lint-staged';
 */

/** @type {import('lint-staged').Config} */
const config = {
  // TypeScript/JavaScript files: lint + format
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],

  // Data/Config/Style files: format only
  '*.{json,md,css,scss,yaml,yml}': ['prettier --write'],

  // Python files: format with Black
  '*.py': ['black'],
};

export default config;
