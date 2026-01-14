/**
 * Kabran Configuration File
 *
 * This file customizes the behavior of kabran-config validators and tools.
 * All settings are optional - defaults are applied for any missing values.
 *
 * @see https://github.com/kabran-owner/kabran-config
 */

/** @type {import('@kabran-tecnologia/kabran-config/core/config-loader').KabranConfig} */
export default {
  /**
   * README Validator Configuration
   *
   * Customize which sections are required and recommended in your README.md
   */
  readme: {
    // Sections that MUST be present (validation fails if missing)
    required: ['Installation', 'Usage', 'License'],

    // Sections that SHOULD be present (warning if missing)
    recommended: ['Development', 'Testing', 'Contributing'],
  },

  /**
   * Environment Validator Configuration
   *
   * Customize how environment variable usage is detected
   */
  env: {
    // Require .env.example file if env vars are detected
    requireExample: true,

    // Patterns to search for when detecting env var usage
    detectPatterns: [
      'process.env',      // Node.js
      'import.meta.env',  // Vite/ESM
      'Deno.env',         // Deno
      'os.getenv',        // Python
      '$_ENV',            // PHP
    ],
  },

  /**
   * Quality Standard Validator Configuration
   *
   * Customize the location of your quality standard documentation
   */
  quality: {
    // Path to quality standard file (relative to project root)
    standardPath: 'docs/quality/001-quality-standard.md',
  },
};
