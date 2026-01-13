#!/usr/bin/env node

/**
 * Dependency Age Report Script
 *
 * Generates a report of outdated dependencies to identify packages
 * that may have security vulnerabilities or missing features.
 *
 * Usage:
 *   node dependency-report.mjs [--json] [--strict]
 *
 * Modes:
 *   Default: Non-blocking report (exits 0)
 *   --strict: Blocking mode - fails if packages > 2 years outdated (exits 1)
 *
 * Exit codes:
 *   0 - All checks passed (or non-strict mode)
 *   1 - Critical outdated dependencies found (strict mode only)
 */

import {exec} from 'node:child_process';
import {promisify} from 'node:util';

const execAsync = promisify(exec);

/**
 * Parse npm outdated output
 * @param {string} stdout - Output from npm outdated command
 * @returns {Array<{name: string, current: string, wanted: string, latest: string, location: string}>}
 */
export function parseOutdatedPackages(stdout) {
  if (!stdout.trim()) {
    return [];
  }

  const lines = stdout.trim().split('\n');
  const packages = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse: Package  Current  Wanted  Latest  Location  Depended by
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 4) {
      packages.push({
        name: parts[0],
        current: parts[1],
        wanted: parts[2],
        latest: parts[3],
        location: parts[4] || '',
      });
    }
  }

  return packages;
}

/**
 * Categorize outdated packages by severity
 * @param {Array<{name: string, current: string, wanted: string, latest: string}>} packages
 * @returns {{major: Array, minor: Array, patch: Array}}
 */
export function categorizePackages(packages) {
  const major = [];
  const minor = [];
  const patch = [];

  packages.forEach(pkg => {
    const currentParts = pkg.current.split('.');
    const latestParts = pkg.latest.split('.');

    if (currentParts[0] !== latestParts[0]) {
      major.push(pkg);
    } else if (currentParts[1] !== latestParts[1]) {
      minor.push(pkg);
    } else {
      patch.push(pkg);
    }
  });

  return { major, minor, patch };
}

/**
 * Get package publish date from npm registry
 */
async function getPackageAge(packageName, version) {
  try {
    const { stdout } = await execAsync(`npm view ${packageName}@${version} time --json`);
    const timeData = JSON.parse(stdout);
    const publishDate = new Date(timeData[version] || timeData.modified);
    const now = new Date();
    const ageInYears = (now - publishDate) / (1000 * 60 * 60 * 24 * 365);
    return ageInYears;
  } catch {
    // If we can't get age, assume it's not too old
    return 0;
  }
}

/**
 * Check for critically outdated packages (strict mode)
 */
async function checkCriticallyOutdated(packages, maxAgeYears = 2) {
  const critical = [];

  for (const pkg of packages) {
    // Check age of current version
    const age = await getPackageAge(pkg.name, pkg.current);

    if (age >= maxAgeYears) {
      critical.push({
        ...pkg,
        ageYears: age.toFixed(1),
      });
    }
  }

  return critical;
}

/**
 * Run dependency report
 */
async function generateReport(jsonOutput = false, strictMode = false) {
  console.log('📦 Checking for outdated dependencies...\n');

  if (strictMode) {
    console.log('⚠️  Running in STRICT mode - will fail if packages > 2 years old\n');
  }

  try {
    // Run npm outdated (exits with code 1 if outdated packages found)
    const { stdout } = await execAsync('npm outdated --long', {
      encoding: 'utf8',
    }).catch(error => {
      // npm outdated returns exit code 1 when outdated packages exist
      // We need to capture stdout anyway
      return { stdout: error.stdout || '' };
    });

    const outdatedPackages = parseOutdatedPackages(stdout);

    if (outdatedPackages.length === 0) {
      console.log('✅ All dependencies are up to date!\n');
      return { hasErrors: false };
    }

    if (jsonOutput) {
      console.log(JSON.stringify(outdatedPackages, null, 2));
      return { hasErrors: false };
    }

    // Categorize and display
    const { major, minor, patch } = categorizePackages(outdatedPackages);

    console.log(`⚠️  Found ${outdatedPackages.length} outdated package(s):\n`);

    // Strict mode: check for critically outdated packages
    let criticalPackages = [];
    if (strictMode && major.length > 0) {
      console.log('🔍 Checking package ages (this may take a moment)...\n');
      criticalPackages = await checkCriticallyOutdated(major);
    }

    if (major.length > 0) {
      console.log(`🔴 Major updates (${major.length}):`);
      major.forEach(pkg => {
        console.log(`   ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
      });
      console.log('');
    }

    if (minor.length > 0) {
      console.log(`🟡 Minor updates (${minor.length}):`);
      minor.forEach(pkg => {
        console.log(`   ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
      });
      console.log('');
    }

    if (patch.length > 0) {
      console.log(`🟢 Patch updates (${patch.length}):`);
      patch.forEach(pkg => {
        console.log(`   ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
      });
      console.log('');
    }

    console.log('💡 Recommendations:');
    if (major.length > 0) {
      console.log('   - Major updates may contain breaking changes. Review changelogs.');
    }
    if (minor.length > 0) {
      console.log('   - Minor updates add features. Generally safe to update.');
    }
    if (patch.length > 0) {
      console.log('   - Patch updates fix bugs. Recommended to update.');
    }
    console.log('   - Use Renovate/Dependabot for automated PRs.');
    console.log('');

    // Check for very old packages (major version difference > 2)
    const veryOld = major.filter(pkg => {
      const currentMajor = parseInt(pkg.current.split('.')[0], 10);
      const latestMajor = parseInt(pkg.latest.split('.')[0], 10);
      return latestMajor - currentMajor >= 2;
    });

    if (veryOld.length > 0) {
      console.log('⚠️  ATTENTION: These packages are significantly outdated:');
      veryOld.forEach(pkg => {
        console.log(`   ${pkg.name}: ${pkg.current} → ${pkg.latest}`);
      });
      console.log('   Consider prioritizing these updates for security reasons.\n');
    }

    // Strict mode: fail if critical packages found
    if (strictMode && criticalPackages.length > 0) {
      console.log('='.repeat(50));
      console.error('\n❌ STRICT MODE: Critical outdated dependencies found!\n');
      console.error(`   ${criticalPackages.length} package(s) are > 2 years old:\n`);
      criticalPackages.forEach(pkg => {
        console.error(`   ${pkg.name}: ${pkg.current} (${pkg.ageYears} years old) → ${pkg.latest}`);
      });
      console.error('\n   Update these packages or use --no-strict to skip check.\n');
      return { hasErrors: true };
    }

    return { hasErrors: false };
  } catch (error) {
    console.error('❌ Error generating dependency report:', error.message);
    console.error('   Make sure you are in a directory with package.json\n');
    return { hasErrors: false };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const strictMode = args.includes('--strict');

  const { hasErrors } = await generateReport(jsonOutput, strictMode);

  // Exit with error code in strict mode if issues found
  if (strictMode && hasErrors) {
    process.exit(1);
  }

  // Default: always exit 0 (non-blocking)
  process.exit(0);
}

main();
