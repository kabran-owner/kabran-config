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
 *
 * Note: Uses --summary instead of --version because license-checker --version
 * returns exit code 1 even when successful (upstream bug).
 * See: docs/bugs/BUG-001-license-check-false-negative.md
 */
async function checkLicenseCheckerAvailable() {
  try {
    await execAsync('npx license-checker --summary', {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
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
 * Run license check and return structured result
 * @param {Object} [options] - Options
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<{success: boolean, packages: number, violations: Array, warnings: Array, error?: string}>}
 */
export async function checkLicenses(options = {}) {
  const {silent = false} = options;
  const log = silent ? () => {} : console.log.bind(console);
  const error = silent ? () => {} : console.error.bind(console);
  const warn = silent ? () => {} : console.warn.bind(console);

  log('🔍 Scanning dependencies for license compliance...\n');

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
      log(`✅ All ${totalPackages} dependencies are compliant`);
      log('   No prohibited licenses found\n');
      return {success: true, packages: totalPackages, violations: [], warnings: []};
    }

    // Show violations
    if (violations.length > 0) {
      error(`\n❌ Found ${violations.length} prohibited license(s):\n`);
      violations.forEach(({ package: pkg, license, repository }) => {
        error(`   Package:    ${pkg}`);
        error(`   License:    ${license}`);
        error(`   Repository: ${repository}`);
        error('');
      });
      error('⚠️  These licenses are prohibited due to viral copyleft terms.');
      error('   Remove these dependencies or find alternatives.\n');
    }

    // Show warnings
    if (warnings.length > 0) {
      warn(`\n⚠️  Found ${warnings.length} license(s) requiring review:\n`);
      warnings.forEach(({ package: pkg, license, repository }) => {
        warn(`   Package:    ${pkg}`);
        warn(`   License:    ${license}`);
        warn(`   Repository: ${repository}`);
        warn('');
      });
      warn('   These licenses may have restrictions. Review before production use.\n');
    }

    return {
      success: violations.length === 0,
      packages: totalPackages,
      violations,
      warnings,
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('❌ Error: license-checker not found in node_modules');
      error('   Run: npm install --save-dev license-checker\n');
    } else {
      error('❌ Error checking licenses:', err.message);
    }
    return {success: false, packages: 0, violations: [], warnings: [], error: err.message};
  }
}

/**
 * Get license check result in ci-result.json format
 * @param {string} [cwd] - Working directory (unused, for API consistency)
 * @returns {Promise<Object>} Check result for ci-result.json
 */
export async function getLicenseCheckResult(cwd) {
  const result = await checkLicenses({silent: true});

  // Determine status
  let status = 'pass';
  if (!result.success || result.violations.length > 0) {
    status = 'fail';
  } else if (result.warnings.length > 0) {
    status = 'warn';
  }

  return {
    status,
    packages_scanned: result.packages,
    violations: result.violations.map(v => ({
      package: v.package,
      license: v.license,
      repository: v.repository,
    })),
    warnings: result.warnings.map(w => ({
      package: w.package,
      license: w.license,
      repository: w.repository,
    })),
    ...(result.error && {error: result.error}),
  };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const isAvailable = await checkLicenseCheckerAvailable();
  if (!isAvailable) {
    if (jsonOutput) {
      console.log(JSON.stringify({status: 'fail', error: 'license-checker not available'}));
    }
    process.exit(1);
  }

  if (jsonOutput) {
    const result = await getLicenseCheckResult();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'fail' ? 1 : 0);
  } else {
    const result = await checkLicenses();
    process.exit(result.success ? 0 : 1);
  }
}

main();
