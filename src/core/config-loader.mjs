/**
 * Kabran Config Loader
 *
 * Loads project configuration from kabran.config.mjs/js/json with fallback to defaults.
 * Enables projects to customize validator behavior without modifying kabran-config.
 *
 * @module config-loader
 */

import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

/**
 * Default configuration values.
 * These match the current hardcoded values in validators to ensure backwards compatibility.
 */
export const DEFAULTS = {
  readme: {
    required: ['Installation', 'Usage', 'License'],
    recommended: ['Development', 'Testing', 'Contributing'],
  },
  env: {
    requireExample: true,
    detectPatterns: ['process.env', 'import.meta.env', 'Deno.env', 'os.getenv', '$_ENV'],
  },
  quality: {
    standardPath: 'docs/quality/001-quality-standard.md',
  },
};

/**
 * Configuration file names to search for, in priority order.
 */
const CONFIG_FILES = ['kabran.config.mjs', 'kabran.config.js', 'kabran.config.json'];

/**
 * Deep merge two objects. Arrays are replaced, not merged.
 * @param {object} target - Base object
 * @param {object} source - Object to merge in
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = {...target};

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    if (
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Load JSON configuration file.
 * @param {string} configPath - Path to JSON config file
 * @returns {Promise<object>} Parsed configuration
 */
async function loadJsonConfig(configPath) {
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load JavaScript/ESM configuration file.
 * @param {string} configPath - Path to JS/MJS config file
 * @returns {Promise<object>} Parsed configuration
 */
async function loadJsConfig(configPath) {
  const configUrl = pathToFileURL(configPath).href;
  const module = await import(configUrl);
  return module.default || module;
}

/**
 * Load project configuration with fallback to defaults.
 *
 * Searches for configuration files in order:
 * 1. kabran.config.mjs
 * 2. kabran.config.js
 * 3. kabran.config.json
 *
 * If no config file is found, returns DEFAULTS.
 *
 * @param {string} [cwd=process.cwd()] - Directory to search for config
 * @returns {Promise<object>} Merged configuration
 *
 * @example
 * const config = await loadConfig();
 * console.log(config.readme.required); // ['Installation', 'Usage', 'License']
 *
 * @example
 * // With custom config in kabran.config.mjs:
 * // export default { readme: { required: ['Setup', 'API'] } }
 * const config = await loadConfig('/path/to/project');
 * console.log(config.readme.required); // ['Setup', 'API']
 */
export async function loadConfig(cwd = process.cwd()) {
  for (const fileName of CONFIG_FILES) {
    const configPath = join(cwd, fileName);

    if (existsSync(configPath)) {
      try {
        let projectConfig;

        if (fileName.endsWith('.json')) {
          projectConfig = await loadJsonConfig(configPath);
        } else {
          projectConfig = await loadJsConfig(configPath);
        }

        return deepMerge(DEFAULTS, projectConfig);
      } catch (error) {
        // Log warning but continue with defaults
        console.warn(`Warning: Failed to load ${fileName}: ${error.message}`);
      }
    }
  }

  return DEFAULTS;
}

/**
 * Check if a config file exists in the given directory.
 * @param {string} [cwd=process.cwd()] - Directory to check
 * @returns {{exists: boolean, path?: string, name?: string}} Config file info
 */
export function findConfigFile(cwd = process.cwd()) {
  for (const fileName of CONFIG_FILES) {
    const configPath = join(cwd, fileName);

    if (existsSync(configPath)) {
      return {exists: true, path: configPath, name: fileName};
    }
  }

  return {exists: false};
}
