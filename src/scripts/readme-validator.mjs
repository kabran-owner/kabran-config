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
const REQUIRED_SECTIONS = [
  { pattern: /^#\s+.+/m, name: 'Project Title (# Heading)' },
  { pattern: /^##\s+Installation/mi, name: 'Installation' },
  { pattern: /^##\s+Usage/mi, name: 'Usage' },
  { pattern: /^##\s+License/mi, name: 'License' },
];

// Recommended sections (warnings only)
const RECOMMENDED_SECTIONS = [
  { pattern: /^##\s+Development/mi, name: 'Development' },
  { pattern: /^##\s+Contributing/mi, name: 'Contributing' },
  { pattern: /^##\s+Testing/mi, name: 'Testing' },
];

/**
 * Find README.md in project root
 */
function findReadme() {
  const cwd = process.cwd();
  const possibleNames = ['README.md', 'readme.md', 'Readme.md'];

  for (const name of possibleNames) {
    const readmePath = path.join(cwd, name);
    if (fs.existsSync(readmePath)) {
      return { path: readmePath, content: fs.readFileSync(readmePath, 'utf-8') };
    }
  }

  return null;
}

/**
 * Check if section exists in content
 */
function checkSection(content, section) {
  return section.pattern.test(content);
}

/**
 * Main validation function
 */
function validateReadme() {
  console.log('📄 Validating README.md...\n');

  // Check if README exists
  const readme = findReadme();
  if (!readme) {
    console.error('❌ Error: README.md not found in project root');
    console.error('   Create a README.md file with project documentation\n');
    return false;
  }

  console.log(`✅ Found: ${path.basename(readme.path)}\n`);

  const { content } = readme;
  let hasErrors = false;
  const warnings = [];

  // Check required sections
  console.log('📋 Checking required sections:');
  for (const section of REQUIRED_SECTIONS) {
    const exists = checkSection(content, section);
    if (exists) {
      console.log(`  ✅ ${section.name}`);
    } else {
      console.error(`  ❌ Missing: ${section.name}`);
      hasErrors = true;
    }
  }

  // Check recommended sections
  console.log('\n📋 Checking recommended sections:');
  for (const section of RECOMMENDED_SECTIONS) {
    const exists = checkSection(content, section);
    if (exists) {
      console.log(`  ✅ ${section.name}`);
    } else {
      console.log(`  ⚠️  Missing: ${section.name} (recommended)`);
      warnings.push(section.name);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.error('\n❌ README validation failed');
    console.error('   Add missing required sections to README.md\n');
    return false;
  }

  if (warnings.length > 0) {
    console.log('\n✅ README validation passed');
    console.log(`⚠️  ${warnings.length} recommended section(s) missing`);
    console.log('   Consider adding: ' + warnings.join(', ') + '\n');
  } else {
    console.log('\n✅ README validation passed - all sections present!\n');
  }

  return true;
}

/**
 * Run validation
 */
try {
  const success = validateReadme();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}
