#!/usr/bin/env node

/**
 * Quality Standard Validator Script
 *
 * Validates that a project has a properly configured quality-standard.md file
 * and that documented overrides match the actual code configuration.
 *
 * Usage:
 *   node quality-standard-validator.mjs [cwd]
 *
 * Exit codes:
 *   0 - Valid (may have warnings)
 *   1 - Invalid (has errors)
 */

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Required sections that must be present in quality-standard.md
 */
export const REQUIRED_SECTIONS = [
  {pattern: /^## Configuracao Base/mi, name: 'Configuracao Base'},
  {pattern: /^## Overrides Aplicados/mi, name: 'Overrides Aplicados'},
];

/**
 * Required frontmatter fields
 */
export const REQUIRED_FRONTMATTER = ['title', 'type', 'status'];

/**
 * Find quality-standard.md file in the project
 * @param {string} cwd - Current working directory
 * @returns {{exists: boolean, path?: string} | null} File info or null
 */
export function findQualityStandard(cwd = process.cwd()) {
  const expectedPath = join(cwd, 'docs', 'quality', '001-quality-standard.md');

  if (existsSync(expectedPath)) {
    return {
      exists: true,
      path: expectedPath,
    };
  }

  return null;
}

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - File content
 * @returns {object | null} Parsed frontmatter or null if invalid
 */
export function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return null;
  }

  const frontmatterStr = frontmatterMatch[1];
  const result = {};

  // Simple YAML-like parsing for key: value pairs
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Check if all required sections are present
 * @param {string} content - File content
 * @returns {{present: string[], missing: string[]}} Section status
 */
export function checkRequiredSections(content) {
  const present = [];
  const missing = [];

  for (const section of REQUIRED_SECTIONS) {
    if (section.pattern.test(content)) {
      present.push(section.name);
    } else {
      missing.push(section.name);
    }
  }

  return {present, missing};
}

/**
 * Detect overrides in eslint.config.mjs
 * @param {string} cwd - Current working directory
 * @returns {string[]} List of rule names that are overridden
 */
export function detectCodeOverrides(cwd = process.cwd()) {
  const eslintConfigPath = join(cwd, 'eslint.config.mjs');

  if (!existsSync(eslintConfigPath)) {
    return [];
  }

  try {
    const content = readFileSync(eslintConfigPath, 'utf-8');
    const overrides = [];

    // Pattern to match rules object with overrides
    // Matches: 'rule-name': 'off' or "rule-name": "off" or 'rule-name': 'warn' etc.
    const rulesBlockMatch = content.match(/rules\s*:\s*\{([^}]+)\}/g);

    if (rulesBlockMatch) {
      for (const block of rulesBlockMatch) {
        // Extract individual rule overrides
        const ruleMatches = block.matchAll(/['"]([^'"]+)['"]\s*:\s*['"]?(off|warn|error|\d)['"]?/g);
        for (const match of ruleMatches) {
          const ruleName = match[1];
          // Skip if it's just ignores or other non-rule keys
          if (!ruleName.includes('/') && !ruleName.includes('-')) {
            continue;
          }
          overrides.push(ruleName);
        }
      }
    }

    return [...new Set(overrides)]; // Remove duplicates
  } catch {
    return [];
  }
}

/**
 * Parse documented overrides from quality-standard.md
 * @param {string} content - File content
 * @returns {string[]} List of documented rule names
 */
export function parseDocumentedOverrides(content) {
  const overrides = [];

  // Pattern to match: | **Regra** | `rule-name` |
  const ruleMatches = content.matchAll(/\*\*Regra\*\*\s*\|\s*`([^`]+)`/g);

  for (const match of ruleMatches) {
    overrides.push(match[1]);
  }

  return overrides;
}

/**
 * Compare documented overrides with code overrides
 * @param {string[]} documented - Overrides documented in quality-standard.md
 * @param {string[]} code - Overrides detected in code
 * @returns {{undocumented: string[], orphaned: string[]}} Comparison result
 */
export function compareOverrides(documented, code) {
  const documentedSet = new Set(documented);
  const codeSet = new Set(code);

  const undocumented = code.filter(rule => !documentedSet.has(rule));
  const orphaned = documented.filter(rule => !codeSet.has(rule));

  return {undocumented, orphaned};
}

/**
 * Validate quality-standard.md
 * @param {string} cwd - Current working directory
 * @param {boolean} silent - Suppress console output (for testing)
 * @returns {{valid: boolean, errors: string[], warnings: string[]}} Validation result
 */
export function validate(cwd = process.cwd(), silent = false) {
  const log = silent ? () => {} : console.log.bind(console);
  const error = silent ? () => {} : console.error.bind(console);

  const errors = [];
  const warnings = [];

  log('');
  log('Validating Quality Standard...');
  log('='.repeat(50));

  // 1. Check file exists
  const fileInfo = findQualityStandard(cwd);

  if (!fileInfo) {
    errors.push('Missing required file: docs/quality/001-quality-standard.md');
    error('');
    error('ERROR: Missing required file: docs/quality/001-quality-standard.md');
    error('');
    error('Run "npx kabran-setup" to create it, or create manually.');
    log('='.repeat(50));
    return {valid: false, errors, warnings};
  }

  log('');
  log('File: docs/quality/001-quality-standard.md');
  log('  Status: Found');

  // 2. Read and parse content
  const content = readFileSync(fileInfo.path, 'utf-8');

  // 3. Validate frontmatter
  log('');
  log('Frontmatter:');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) {
    errors.push('Invalid frontmatter in quality-standard.md');
    error('  Status: Invalid or missing');
  } else {
    const missingFields = REQUIRED_FRONTMATTER.filter(field => !frontmatter[field]);

    if (missingFields.length > 0) {
      errors.push(`Missing frontmatter fields: ${missingFields.join(', ')}`);
      error(`  Missing fields: ${missingFields.join(', ')}`);
    } else {
      log('  Status: Valid');
      log(`  Title: ${frontmatter.title}`);
      log(`  Type: ${frontmatter.type}`);
      log(`  Status: ${frontmatter.status}`);
    }
  }

  // 4. Validate required sections
  log('');
  log('Required Sections:');
  const sections = checkRequiredSections(content);

  for (const section of sections.present) {
    log(`  OK: ${section}`);
  }

  for (const section of sections.missing) {
    errors.push(`Missing required section: ${section}`);
    error(`  Missing: ${section}`);
  }

  // 5. Check overrides consistency (warnings only)
  log('');
  log('Override Consistency:');

  const documentedOverrides = parseDocumentedOverrides(content);
  const codeOverrides = detectCodeOverrides(cwd);
  const comparison = compareOverrides(documentedOverrides, codeOverrides);

  if (comparison.undocumented.length === 0 && comparison.orphaned.length === 0) {
    if (codeOverrides.length === 0 && documentedOverrides.length === 0) {
      log('  No overrides (clean configuration)');
    } else {
      log('  All overrides documented correctly');
    }
  } else {
    if (comparison.undocumented.length > 0) {
      for (const rule of comparison.undocumented) {
        warnings.push(`Undocumented override in code: ${rule}`);
        log(`  Warning: Undocumented override in code: ${rule}`);
      }
    }

    if (comparison.orphaned.length > 0) {
      for (const rule of comparison.orphaned) {
        warnings.push(`Documented override not found in code: ${rule}`);
        log(`  Warning: Documented override not found in code: ${rule}`);
      }
    }
  }

  // Summary
  log('');
  log('='.repeat(50));

  if (errors.length === 0) {
    log('');
    log('Result: VALID');

    if (warnings.length > 0) {
      log(`Warnings: ${warnings.length}`);
      log('');
      log('Consider documenting all overrides in the quality-standard.md file.');
    }
  } else {
    error('');
    error('Result: INVALID');
    error(`Errors: ${errors.length}`);

    if (warnings.length > 0) {
      log(`Warnings: ${warnings.length}`);
    }
  }

  log('');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get quality standard validation result in ci-result.json format
 * @param {string} [cwd] - Directory to validate (defaults to process.cwd())
 * @returns {Object} Check result for ci-result.json
 */
export function getQualityStandardCheckResult(cwd = process.cwd()) {
  const fileInfo = findQualityStandard(cwd);

  if (!fileInfo) {
    return {
      status: 'fail',
      file_exists: false,
      undocumented_overrides: [],
      orphaned_overrides: [],
    };
  }

  const content = readFileSync(fileInfo.path, 'utf-8');
  const documentedOverrides = parseDocumentedOverrides(content);
  const codeOverrides = detectCodeOverrides(cwd);
  const comparison = compareOverrides(documentedOverrides, codeOverrides);

  // Check frontmatter
  const frontmatter = parseFrontmatter(content);
  const hasFrontmatter = frontmatter &&
    REQUIRED_FRONTMATTER.every(field => frontmatter[field]);

  // Check sections
  const sections = checkRequiredSections(content);
  const hasSections = sections.missing.length === 0;

  // Determine status
  let status = 'pass';
  if (!hasFrontmatter || !hasSections) {
    status = 'fail';
  } else if (comparison.undocumented.length > 0 || comparison.orphaned.length > 0) {
    status = 'warn';
  }

  return {
    status,
    file_exists: true,
    undocumented_overrides: comparison.undocumented,
    orphaned_overrides: comparison.orphaned,
    ...(sections.missing.length > 0 && {missing_sections: sections.missing}),
  };
}

// Main execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  try {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');
    const cwd = args.find(a => !a.startsWith('--')) || process.cwd();

    if (jsonOutput) {
      const result = getQualityStandardCheckResult(cwd);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'fail' ? 1 : 0);
    } else {
      const result = validate(cwd);
      process.exit(result.valid ? 0 : 1);
    }
  } catch (err) {
    console.error('Unexpected error:', err.message);
    process.exit(1);
  }
}
