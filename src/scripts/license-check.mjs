#!/usr/bin/env node

/**
 * License Compliance Check Script
 *
 * Scans project dependencies for prohibited licenses (GPL, AGPL, etc.)
 * to ensure legal compliance.
 *
 * Usage:
 *   node license-check.mjs [--strict]
 *
 * Exit codes:
 *   0 - All licenses are compliant
 *   1 - Prohibited licenses found
 */

import {exec} from 'node:child_process';
import {promisify} from 'node:util';

const execAsync = promisify(exec);

// Prohibited licenses (viral copyleft)
export const PROHIBITED_LICENSES = [
  'GPL',
  'GPL-1.0',
  'GPL-1.0-only',
  'GPL-1.0-or-later',
  'GPL-2.0',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL',
  'AGPL-1.0',
  'AGPL-1.0-only',
  'AGPL-1.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'LGPL-2.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'EUPL-1.0',
  'EUPL-1.1',
  'EUPL-1.2',
];

// Warning licenses (require review but don't block)
export const WARNING_LICENSES = [
  'CC-BY-NC',
  'CC-BY-NC-SA',
  'SSPL',
  'OSL-3.0',
];

/**
 * Check if license-checker is available
 */
async function checkLicenseCheckerAvailable() {
  try {
    await execAsync('npx license-checker --version');
    return true;
  } catch {
    console.error('❌ Error: license-checker not found');
    console.error('Install it with: npm install --save-dev license-checker');
    return false;
  }
}

/**
 * Parse license string to check against prohibited list
 * @param {string|null|undefined} license - License string to check
 * @returns {boolean}
 */
export function isProhibited(license) {
  if (!license) return false;

  const normalizedLicense = license.toUpperCase();

  return PROHIBITED_LICENSES.some(prohibited => {
    const normalizedProhibited = prohibited.toUpperCase();
    // Exact match or contains (e.g., "GPL-2.0-only" contains "GPL")
    return normalizedLicense === normalizedProhibited ||
           normalizedLicense.includes(normalizedProhibited);
  });
}

/**
 * Parse license string to check against warning list
 * @param {string|null|undefined} license - License string to check
 * @returns {boolean}
 */
export function isWarning(license) {
  if (!license) return false;

  const normalizedLicense = license.toUpperCase();

  return WARNING_LICENSES.some(warning => {
    const normalizedWarning = warning.toUpperCase();
    return normalizedLicense === normalizedWarning ||
           normalizedLicense.includes(normalizedWarning);
  });
}

/**
 * Run license check
 */
async function checkLicenses() {
  console.log('🔍 Scanning dependencies for license compliance...\n');

  try {
    // Run license-checker with JSON output
    const { stdout } = await execAsync(
      'npx license-checker --json --production --excludePrivatePackages'
    );

    const packages = JSON.parse(stdout);
    const violations = [];
    const warnings = [];

    // Check each package
    Object.entries(packages).forEach(([packageName, info]) => {
      const license = info.licenses;

      if (isProhibited(license)) {
        violations.push({
          package: packageName,
          license,
          repository: info.repository || 'N/A',
        });
      } else if (isWarning(license)) {
        warnings.push({
          package: packageName,
          license,
          repository: info.repository || 'N/A',
        });
      }
    });

    // Report results
    const totalPackages = Object.keys(packages).length;

    if (violations.length === 0 && warnings.length === 0) {
      console.log(`✅ All ${totalPackages} dependencies are compliant`);
      console.log('   No prohibited licenses found\n');
      return true;
    }

    // Show violations
    if (violations.length > 0) {
      console.error(`\n❌ Found ${violations.length} prohibited license(s):\n`);
      violations.forEach(({ package: pkg, license, repository }) => {
        console.error(`   Package:    ${pkg}`);
        console.error(`   License:    ${license}`);
        console.error(`   Repository: ${repository}`);
        console.error('');
      });
      console.error('⚠️  These licenses are prohibited due to viral copyleft terms.');
      console.error('   Remove these dependencies or find alternatives.\n');
    }

    // Show warnings
    if (warnings.length > 0) {
      console.warn(`\n⚠️  Found ${warnings.length} license(s) requiring review:\n`);
      warnings.forEach(({ package: pkg, license, repository }) => {
        console.warn(`   Package:    ${pkg}`);
        console.warn(`   License:    ${license}`);
        console.warn(`   Repository: ${repository}`);
        console.warn('');
      });
      console.warn('   These licenses may have restrictions. Review before production use.\n');
    }

    return violations.length === 0;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ Error: license-checker not found in node_modules');
      console.error('   Run: npm install --save-dev license-checker\n');
    } else {
      console.error('❌ Error checking licenses:', error.message);
    }
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const isAvailable = await checkLicenseCheckerAvailable();
  if (!isAvailable) {
    process.exit(1);
  }

  const success = await checkLicenses();
  process.exit(success ? 0 : 1);
}

main();
