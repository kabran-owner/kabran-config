/**
 * Kabran Prettier Configuration
 *
 * Decisions based on: qst-006-s21-quality-standards-decisions.md
 *
 * Usage in your project:
 *
 * // prettier.config.mjs
 * export { default } from 'kabran-config/prettier';
 *
 * // Or with customizations:
 * import config from 'kabran-config/prettier';
 * export default { ...config, printWidth: 100 }; // override if needed
 */

/** @type {import('prettier').Config} */
const config = {
  // Strings
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',

  // Punctuation
  semi: true,
  trailingComma: 'all', // Q5: Diffs limpos, menos erros de sintaxe

  // Spacing
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: false, // Q4: AI-First, economia de tokens

  // Line handling
  printWidth: 120, // Q3: Equilibrio densidade/legibilidade para IA
  endOfLine: 'lf',

  // JSX
  bracketSameLine: false,

  // Functions
  arrowParens: 'always',

  // Plugins (optional - only loaded if installed)
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['clsx', 'cn', 'cva', 'twMerge'],
};

export default config;
