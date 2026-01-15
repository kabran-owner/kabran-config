/**
 * Kabran Config Loader
 *
 * Loads project configuration from kabran.config.mjs/js/json with fallback to defaults.
 * Enables projects to customize validator behavior without modifying kabran-config.
 *
 * Features:
 * - Smart detection of tools (ESLint, TypeScript, Prettier, Vitest, Playwright, Turbo)
 * - Automatic Doppler integration for secrets injection in tests
 * - Native support for Turbo monorepos (auto-detects turbo.json)
 * - Convention over configuration - works out of the box
 *
 * @module config-loader
 */

import {existsSync, readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execSync} from 'node:child_process';

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
 * Config file patterns for each tool.
 */
const TOOL_CONFIGS = {
  eslint: ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs'],
  typescript: ['tsconfig.json'],
  prettier: ['prettier.config.mjs', 'prettier.config.js', '.prettierrc', '.prettierrc.json', '.prettierrc.js'],
  vitest: ['vitest.config.ts', 'vitest.config.mts', 'vitest.config.js', 'vitest.config.mjs'],
  playwright: ['playwright.config.ts', 'playwright.config.js'],
  turbo: ['turbo.json'],
};

/**
 * Check if any of the config files exist for a tool.
 * @param {string} cwd - Working directory
 * @param {string[]} configFiles - List of possible config file names
 * @returns {boolean} True if any config file exists
 */
function hasToolConfig(cwd, configFiles) {
  return configFiles.some(file => existsSync(join(cwd, file)));
}

/**
 * Check if Doppler is configured for the current directory.
 *
 * Detection methods (in order of reliability):
 * 1. DOPPLER_TOKEN environment variable is set
 * 2. doppler.yaml exists in the project
 * 3. doppler configure get token returns a value (CLI-level config)
 *
 * @param {string} cwd - Working directory
 * @returns {boolean} True if Doppler is available
 */
function hasDopplerConfigured(cwd) {
  // Method 1: Environment variable (most common in CI/CD and scoped setups)
  if (process.env.DOPPLER_TOKEN) {
    return true;
  }

  // Method 2: doppler.yaml in project (common for project-level config)
  if (existsSync(join(cwd, 'doppler.yaml'))) {
    return true;
  }

  // Method 3: CLI-level configuration (doppler setup was run)
  try {
    const result = execSync('doppler configure get token', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim().length > 0;
  } catch {
    // Method 4: Try doppler secrets as last resort (validates full setup)
    try {
      execSync('doppler secrets --only-names', {
        cwd,
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Wrap command with Doppler if configured.
 * @param {string} cmd - Command to wrap
 * @param {boolean} useDoppler - Whether to use Doppler
 * @returns {string} Wrapped command
 */
export function wrapWithDoppler(cmd, useDoppler) {
  return useDoppler ? `doppler run -- ${cmd}` : cmd;
}

/**
 * Detect available tools and generate smart defaults.
 * Only configures commands for tools that are actually set up in the project.
 *
 * Turbo monorepo support:
 * - When turbo.json is detected, commands delegate to `turbo run` for:
 *   - Lint: `turbo run lint`
 *   - Types: `turbo run type-check`
 *   - Tests: `turbo run test`
 *   - Build: `turbo run build`
 * - This ensures proper monorepo handling with caching and workspace orchestration.
 *
 * @param {string} cwd - Working directory
 * @returns {object} Detected defaults for CLI commands
 */
export function detectToolDefaults(cwd) {
  const defaults = {
    check: {},
    test: {},
    build: {},
    ci: { steps: [] },
    turbo: false,
  };

  const hasDoppler = hasDopplerConfigured(cwd);
  const hasTurbo = hasToolConfig(cwd, TOOL_CONFIGS.turbo);

  // Store turbo detection result for consumers
  defaults.turbo = hasTurbo;

  // Turbo monorepo mode: delegate to turbo run commands
  if (hasTurbo) {
    return detectTurboDefaults(defaults, hasDoppler);
  }

  // Standard single-package mode: use direct tool commands
  return detectStandardDefaults(cwd, defaults, hasDoppler);
}

/**
 * Generate defaults for Turbo monorepo projects.
 * Uses `turbo run` commands for all operations.
 * @param {object} defaults - Base defaults object
 * @param {boolean} hasDoppler - Whether Doppler is configured
 * @returns {object} Turbo-specific defaults
 */
function detectTurboDefaults(defaults, hasDoppler) {
  // L1: Static Analysis via Turbo
  defaults.check.lint = 'turbo run lint';
  defaults.check.types = 'turbo run type-check';
  defaults.check.format = 'turbo run format:check';

  // L2: Unit Tests via Turbo (with Doppler support)
  const testCmd = 'turbo run test';
  defaults.test.unit = {
    command: wrapWithDoppler(testCmd, hasDoppler),
    doppler: hasDoppler,
  };

  // L3: Integration Tests via Turbo (with Doppler support)
  const integrationCmd = 'turbo run test:integration';
  defaults.test.integration = {
    command: wrapWithDoppler(integrationCmd, hasDoppler),
    doppler: hasDoppler,
  };

  // L4: E2E Tests via Turbo (with Doppler support)
  const e2eCmd = 'turbo run test:e2e';
  defaults.test.e2e = {
    command: wrapWithDoppler(e2eCmd, hasDoppler),
    doppler: hasDoppler,
  };

  // Build via Turbo
  defaults.build.command = 'turbo run build';

  // CI steps for Turbo projects
  defaults.ci.steps = ['check', 'test:unit', 'build'];

  return defaults;
}

/**
 * Generate defaults for standard single-package projects.
 * Uses direct tool commands (npx eslint, npx tsc, etc).
 * @param {string} cwd - Working directory
 * @param {object} defaults - Base defaults object
 * @param {boolean} hasDoppler - Whether Doppler is configured
 * @returns {object} Standard project defaults
 */
function detectStandardDefaults(cwd, defaults, hasDoppler) {
  // L1: Static Analysis
  if (hasToolConfig(cwd, TOOL_CONFIGS.eslint)) {
    defaults.check.lint = 'npx eslint .';
  }

  if (hasToolConfig(cwd, TOOL_CONFIGS.typescript)) {
    defaults.check.types = 'npx tsc --noEmit';
  }

  if (hasToolConfig(cwd, TOOL_CONFIGS.prettier)) {
    defaults.check.format = 'npx prettier --check .';
  }

  // L2: Unit Tests (with Doppler support)
  if (hasToolConfig(cwd, TOOL_CONFIGS.vitest)) {
    const cmd = 'npx vitest run';
    defaults.test.unit = {
      command: wrapWithDoppler(cmd, hasDoppler),
      doppler: hasDoppler,
    };
  }

  // L3: Integration Tests (with Doppler support)
  const integrationConfig = join(cwd, 'vitest.integration.config.ts');
  if (existsSync(integrationConfig)) {
    const cmd = 'npx vitest run --config vitest.integration.config.ts';
    defaults.test.integration = {
      command: wrapWithDoppler(cmd, hasDoppler),
      doppler: hasDoppler,
    };
  }

  // L4: E2E Tests (with Doppler support)
  if (hasToolConfig(cwd, TOOL_CONFIGS.playwright)) {
    const cmd = 'npx playwright test';
    defaults.test.e2e = {
      command: wrapWithDoppler(cmd, hasDoppler),
      doppler: hasDoppler,
    };
  }

  // Build - check if npm run build exists in package.json
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.scripts?.build) {
        defaults.build.command = 'npm run build';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // CI steps - add detected tools
  if (Object.keys(defaults.check).length > 0) {
    defaults.ci.steps.push('check');
  }
  if (defaults.test.unit) {
    defaults.ci.steps.push('test:unit');
  }
  if (defaults.build.command) {
    defaults.ci.steps.push('build');
  }

  return defaults;
}

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
 * Configuration priority (highest to lowest):
 * 1. Project config (kabran.config.mjs/js/json)
 * 2. Detected tool defaults (based on existing config files)
 * 3. Static defaults (validators)
 *
 * Features:
 * - Smart detection of ESLint, TypeScript, Prettier, Vitest, Playwright
 * - Automatic Doppler integration for secrets in tests
 * - Project-specific overrides take precedence
 *
 * @param {string} [cwd=process.cwd()] - Directory to search for config
 * @returns {Promise<object>} Merged configuration
 *
 * @example
 * // Zero-config: auto-detects tools in project
 * const config = await loadConfig();
 * // If project has vitest.config.ts, config.test.unit.command is set
 *
 * @example
 * // With custom config in kabran.config.mjs (overrides detected defaults):
 * // export default { test: { unit: { command: 'npm test' } } }
 * const config = await loadConfig('/path/to/project');
 */
export async function loadConfig(cwd = process.cwd()) {
  // 1. Start with static defaults (validators)
  let config = {...DEFAULTS};

  // 2. Merge detected tool defaults (CLI commands)
  const toolDefaults = detectToolDefaults(cwd);
  config = deepMerge(config, toolDefaults);

  // 3. Merge project-specific configuration (highest priority)
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

        return deepMerge(config, projectConfig);
      } catch (error) {
        // Log warning but continue with detected defaults
        console.warn(`Warning: Failed to load ${fileName}: ${error.message}`);
      }
    }
  }

  return config;
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
