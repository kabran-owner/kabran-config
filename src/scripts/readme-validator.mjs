#!/usr/bin/env node

/**
 * README Validation Script
 *
 * Validates that README.md exists and contains required sections
 * for proper project documentation.
 *
 * Usage:
 *   node readme-validator.mjs [--strict]
 *
 * Exit codes:
 *   0 - README is valid (warnings allowed)
 *   1 - README is missing or missing required sections
 */

import fs from 'node:fs';
import path from 'node:path';

// Required sections (blocking if missing)
export const REQUIRED_SECTIONS = [
  {pattern: /^#\s+.+/m, name: 'Project Title (# Heading)'},
  {pattern: /^##\s+Installation/mi, name: 'Installation'},
  {pattern: /^##\s+Usage/mi, name: 'Usage'},
  {pattern: /^##\s+License/mi, name: 'License'},
];

// Recommended sections (warnings only)
export const RECOMMENDED_SECTIONS = [
  {pattern: /^##\s+Development/mi, name: 'Development'},
  {pattern: /^##\s+Contributing/mi, name: 'Contributing'},
  {pattern: /^##\s+Testing/mi, name: 'Testing'},
];

/**
 * Find README.md in directory
 * @param {string} [cwd] - Directory to search in (defaults to process.cwd())
 * @returns {{path: string, content: string} | null}
 */
export function findReadme(cwd = process.cwd()) {
  const possibleNames = ['README.md', 'readme.md', 'Readme.md'];

  for (const name of possibleNames) {
    const readmePath = path.join(cwd, name);
    if (fs.existsSync(readmePath)) {
      return {path: readmePath, content: fs.readFileSync(readmePath, 'utf-8')};
    }
  }

  return null;
}

/**
 * Check if section exists in content
 * @param {string} content - README content
 * @param {{pattern: RegExp, name: string}} section - Section to check
 * @returns {boolean}
 */
export function checkSection(content, section) {
  return section.pattern.test(content);
}

/**
 * Main validation function
 * @param {string} [cwd] - Directory to validate (defaults to process.cwd())
 * @param {boolean} [silent] - Suppress console output
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateReadme(cwd = process.cwd(), silent = false) {
  const log = silent ? () => {} : console.log.bind(console);
  const error = silent ? () => {} : console.error.bind(console);

  log('Validating README.md...\n');

  const errors = [];
  const warnings = [];

  // Check if README exists
  const readme = findReadme(cwd);
  if (!readme) {
    errors.push('README.md not found in project root');
    error('Error: README.md not found in project root');
    error('   Create a README.md file with project documentation\n');
    return {valid: false, errors, warnings};
  }

  log(`Found: ${path.basename(readme.path)}\n`);

  const {content} = readme;

  // Check required sections
  log('Checking required sections:');
  for (const section of REQUIRED_SECTIONS) {
    const exists = checkSection(content, section);
    if (exists) {
      log(`  OK ${section.name}`);
    } else {
      error(`  Missing: ${section.name}`);
      errors.push(`Missing required section: ${section.name}`);
    }
  }

  // Check recommended sections
  log('\nChecking recommended sections:');
  for (const section of RECOMMENDED_SECTIONS) {
    const exists = checkSection(content, section);
    if (exists) {
      log(`  OK ${section.name}`);
    } else {
      log(`  Warning: ${section.name} (recommended)`);
      warnings.push(section.name);
    }
  }

  // Summary
  log('\n' + '='.repeat(50));
  if (errors.length > 0) {
    error('\nREADME validation failed');
    error('   Add missing required sections to README.md\n');
    return {valid: false, errors, warnings};
  }

  if (warnings.length > 0) {
    log('\nREADME validation passed');
    log(`Warning: ${warnings.length} recommended section(s) missing`);
    log('   Consider adding: ' + warnings.join(', ') + '\n');
  } else {
    log('\nREADME validation passed - all sections present!\n');
  }

  return {valid: true, errors, warnings};
}

/**
 * Get README validation result in ci-result.json format
 * @param {string} [cwd] - Directory to validate (defaults to process.cwd())
 * @returns {Object} Check result for ci-result.json
 */
export function getReadmeCheckResult(cwd = process.cwd()) {
  const result = validateReadme(cwd, true);

  // Determine status
  let status = 'pass';
  if (!result.valid) {
    status = 'fail';
  } else if (result.warnings.length > 0) {
    status = 'warn';
  }

  return {
    status,
    found: result.errors.length === 0 || !result.errors.some(e => e.includes('not found')),
    missing_required: result.errors
      .filter(e => e.includes('Missing required section'))
      .map(e => e.replace('Missing required section: ', '')),
    missing_recommended: result.warnings,
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
      const result = getReadmeCheckResult(cwd);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'fail' ? 1 : 0);
    } else {
      const result = validateReadme(cwd);
      process.exit(result.valid ? 0 : 1);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}
