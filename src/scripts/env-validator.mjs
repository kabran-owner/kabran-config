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

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);

/**
 * Check if .env file is tracked in git (CRITICAL SECURITY ISSUE)
 */
async function checkEnvInGit() {
  try {
    // Check if .env is in git index
    const { stdout } = await execAsync('git ls-files .env 2>/dev/null || true');
    return stdout.trim().length > 0;
  } catch {
    // If git command fails, assume not in repo or .env not tracked
    return false;
  }
}

/**
 * Detect if project uses environment variables
 */
async function detectEnvUsage() {
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

    const { stdout } = await execAsync(command);
    const files = stdout.trim().split('\n').filter(Boolean);

    return {
      usesEnv: files.length > 0,
      files: files,
    };
  } catch {
    // If grep fails, assume no env usage
    return { usesEnv: false, files: [] };
  }
}

/**
 * Check if .env.example exists
 */
function checkEnvExampleExists() {
  const cwd = process.cwd();
  const possibleNames = ['.env.example', '.env.sample', 'env.example'];

  for (const name of possibleNames) {
    const envPath = path.join(cwd, name);
    if (fs.existsSync(envPath)) {
      return { exists: true, path: envPath, name };
    }
  }

  return { exists: false };
}

/**
 * Parse .env.example and check for documentation
 */
function validateEnvExample(envPath) {
  const content = fs.readFileSync(envPath, 'utf-8');
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
 */
async function validateEnv() {
  console.log('🔐 Validating environment variables...\n');

  let hasErrors = false;
  const warnings = [];

  // CRITICAL: Check if .env is committed to git
  console.log('🚨 Checking for .env in git...');
  const envInGit = await checkEnvInGit();
  if (envInGit) {
    console.error('  ❌ CRITICAL: .env file is tracked in git!');
    console.error('     This is a SECURITY RISK - secrets should never be committed');
    console.error('     Run: git rm --cached .env && echo ".env" >> .gitignore\n');
    hasErrors = true;
  } else {
    console.log('  ✅ .env is not tracked in git\n');
  }

  // Detect if project uses environment variables
  console.log('🔍 Detecting environment variable usage...');
  const { usesEnv, files } = await detectEnvUsage();

  if (!usesEnv) {
    console.log('  ℹ️  No environment variable usage detected');
    console.log('     .env.example not required\n');
    console.log('✅ Environment validation passed\n');
    return !hasErrors;
  }

  console.log(`  ✅ Found env usage in ${files.length} file(s):`);
  files.forEach(file => console.log(`     - ${file}`));
  console.log();

  // Check if .env.example exists
  console.log('📄 Checking for .env.example...');
  const envExample = checkEnvExampleExists();

  if (!envExample.exists) {
    console.error('  ❌ .env.example not found');
    console.error('     Project uses environment variables but .env.example is missing');
    console.error('     Create .env.example to document required variables\n');
    hasErrors = true;
  } else {
    console.log(`  ✅ Found: ${envExample.name}\n`);

    // Validate documentation in .env.example
    console.log('📋 Checking variable documentation...');
    const undocumented = validateEnvExample(envExample.path);

    if (undocumented.length > 0) {
      console.log(`  ⚠️  ${undocumented.length} variable(s) without comments:`);
      undocumented.forEach(varName => {
        console.log(`     - ${varName} (add comment above)`);
        warnings.push(varName);
      });
      console.log();
    } else {
      console.log('  ✅ All variables are documented\n');
    }
  }

  // Summary
  console.log('='.repeat(50));
  if (hasErrors) {
    console.error('\n❌ Environment validation failed');
    console.error('   Fix critical issues listed above\n');
    return false;
  }

  if (warnings.length > 0) {
    console.log('\n✅ Environment validation passed');
    console.log(`⚠️  Consider documenting ${warnings.length} variable(s) in ${envExample.name}\n`);
  } else {
    console.log('\n✅ Environment validation passed - all checks OK!\n');
  }

  return true;
}

/**
 * Run validation
 */
try {
  const success = await validateEnv();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
