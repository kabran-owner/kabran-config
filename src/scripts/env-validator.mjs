#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 *
 * Validates .env.example exists and .env is not committed to git.
 * Ensures proper documentation of environment variables.
 *
 * Usage:
 *   node env-validator.mjs
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Critical failure (.env committed or missing .env.example)
 */

import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);

/**
 * Check if .env file is tracked in git (CRITICAL SECURITY ISSUE)
 * @param {string} [cwd] - Directory to check (defaults to process.cwd())
 * @returns {Promise<boolean>}
 */
export async function checkEnvInGit(cwd = process.cwd()) {
  try {
    // Check if .env is in git index
    const {stdout} = await execAsync('git ls-files .env 2>/dev/null || true', {cwd});
    return stdout.trim().length > 0;
  } catch {
    // If git command fails, assume not in repo or .env not tracked
    return false;
  }
}

/**
 * Detect if project uses environment variables
 * @param {string} [cwd] - Directory to check (defaults to process.cwd())
 * @returns {Promise<{usesEnv: boolean, files: string[]}>}
 */
export async function detectEnvUsage(cwd = process.cwd()) {
  const patterns = [
    'process.env',      // Node.js
    'os.getenv',        // Python
    'import.meta.env',  // Vite/ESM
    'Deno.env',         // Deno
    '$_ENV',            // PHP
  ];

  const extensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'py', 'php'];
  const extensionPattern = extensions.join(',');

  try {
    // Search for env var usage in source files
    const grepPattern = patterns.join('\\|');
    const command = `find . -type f \\( -name "*.{${extensionPattern}}" \\) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.next/*" ! -path "*/build/*" -exec grep -l "${grepPattern}" {} \\; 2>/dev/null | head -5`;

    const {stdout} = await execAsync(command, {cwd});
    const files = stdout.trim().split('\n').filter(Boolean);

    return {
      usesEnv: files.length > 0,
      files: files,
    };
  } catch {
    // If grep fails, assume no env usage
    return {usesEnv: false, files: []};
  }
}

/**
 * Check if .env.example exists
 * @param {string} [cwd] - Directory to check (defaults to process.cwd())
 * @returns {{exists: boolean, path?: string, name?: string}}
 */
export function checkEnvExampleExists(cwd = process.cwd()) {
  const possibleNames = ['.env.example', '.env.sample', 'env.example'];

  for (const name of possibleNames) {
    const envPath = path.join(cwd, name);
    if (fs.existsSync(envPath)) {
      return {exists: true, path: envPath, name};
    }
  }

  return {exists: false};
}

/**
 * Parse .env.example and check for documentation
 * @param {string} envPath - Path to .env.example file
 * @returns {string[]} - Array of undocumented variable names
 */
export function validateEnvExample(envPath) {
  const content = fs.readFileSync(envPath, 'utf-8');
  return parseEnvContent(content);
}

/**
 * Parse env content and return undocumented variables
 * @param {string} content - Content of .env file
 * @returns {string[]} - Array of undocumented variable names
 */
export function parseEnvContent(content) {
  const lines = content.split('\n');

  const undocumented = [];
  let previousLineWasComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      previousLineWasComment = false;
      continue;
    }

    // Check if line is a comment
    if (trimmed.startsWith('#')) {
      previousLineWasComment = true;
      continue;
    }

    // Check if line is a variable assignment
    if (trimmed.includes('=') && !trimmed.startsWith('#')) {
      const varName = trimmed.split('=')[0].trim();

      // If no comment above, it's undocumented
      if (!previousLineWasComment && varName) {
        undocumented.push(varName);
      }

      previousLineWasComment = false;
    }
  }

  return undocumented;
}

/**
 * Main validation function
 * @param {string} [cwd] - Directory to validate (defaults to process.cwd())
 * @param {boolean} [silent] - Suppress console output
 * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
 */
export async function validateEnv(cwd = process.cwd(), silent = false) {
  const log = silent ? () => {} : console.log.bind(console);
  const error = silent ? () => {} : console.error.bind(console);

  log('Validating environment variables...\n');

  const errors = [];
  const warnings = [];

  // CRITICAL: Check if .env is committed to git
  log('Checking for .env in git...');
  const envInGit = await checkEnvInGit(cwd);
  if (envInGit) {
    error('  CRITICAL: .env file is tracked in git!');
    error('     This is a SECURITY RISK - secrets should never be committed');
    error('     Run: git rm --cached .env && echo ".env" >> .gitignore\n');
    errors.push('.env file is tracked in git');
  } else {
    log('  OK .env is not tracked in git\n');
  }

  // Detect if project uses environment variables
  log('Detecting environment variable usage...');
  const {usesEnv, files} = await detectEnvUsage(cwd);

  if (!usesEnv) {
    log('  No environment variable usage detected');
    log('     .env.example not required\n');
    log('Environment validation passed\n');
    return {valid: errors.length === 0, errors, warnings};
  }

  log(`  Found env usage in ${files.length} file(s):`);
  files.forEach(file => log(`     - ${file}`));
  log('');

  // Check if .env.example exists
  log('Checking for .env.example...');
  const envExample = checkEnvExampleExists(cwd);

  if (!envExample.exists) {
    error('  .env.example not found');
    error('     Project uses environment variables but .env.example is missing');
    error('     Create .env.example to document required variables\n');
    errors.push('.env.example not found but project uses environment variables');
  } else {
    log(`  Found: ${envExample.name}\n`);

    // Validate documentation in .env.example
    log('Checking variable documentation...');
    const undocumented = validateEnvExample(envExample.path);

    if (undocumented.length > 0) {
      log(`  ${undocumented.length} variable(s) without comments:`);
      undocumented.forEach(varName => {
        log(`     - ${varName} (add comment above)`);
        warnings.push(varName);
      });
      log('');
    } else {
      log('  All variables are documented\n');
    }
  }

  // Summary
  log('='.repeat(50));
  if (errors.length > 0) {
    error('\nEnvironment validation failed');
    error('   Fix critical issues listed above\n');
    return {valid: false, errors, warnings};
  }

  if (warnings.length > 0) {
    log('\nEnvironment validation passed');
    log(`Consider documenting ${warnings.length} variable(s) in ${envExample.name}\n`);
  } else {
    log('\nEnvironment validation passed - all checks OK!\n');
  }

  return {valid: true, errors, warnings};
}

/**
 * Get env validation result in ci-result.json format
 * @param {string} [cwd] - Directory to validate (defaults to process.cwd())
 * @returns {Promise<Object>} Check result for ci-result.json
 */
export async function getEnvCheckResult(cwd = process.cwd()) {
  const envInGit = await checkEnvInGit(cwd);
  const envExample = checkEnvExampleExists(cwd);
  const {usesEnv} = await detectEnvUsage(cwd);

  let undocumented = [];
  if (envExample.exists) {
    undocumented = validateEnvExample(envExample.path);
  }

  // Determine status
  let status = 'pass';
  if (envInGit) {
    status = 'fail';
  } else if (usesEnv && !envExample.exists) {
    status = 'fail';
  } else if (undocumented.length > 0) {
    status = 'warn';
  }

  return {
    status,
    env_tracked: envInGit,
    example_exists: envExample.exists,
    uses_env_vars: usesEnv,
    undocumented,
  };
}

/**
 * Run validation when executed directly
 */
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  try {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');
    const cwd = args.find(a => !a.startsWith('--')) || process.cwd();

    if (jsonOutput) {
      const result = await getEnvCheckResult(cwd);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'fail' ? 1 : 0);
    } else {
      const result = await validateEnv(cwd);
      process.exit(result.valid ? 0 : 1);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}
