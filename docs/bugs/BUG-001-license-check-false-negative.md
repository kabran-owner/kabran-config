---
title: "BUG-001: license:check reports 'not found' when license-checker is installed"
id: 01KEVRMXN4QJKP8GHTWZ2YDSAB
type: bug
status: open
tags: [javascript]
version: 0.1.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# BUG-001: license:check reports 'not found' when license-checker is installed

## Summary

The `license:check` script incorrectly reports that `license-checker` is not installed even when it is properly installed and functional. This is a false negative that blocks the quality check from running.

## Affected Component

- **File:** `src/scripts/license-check.mjs`
- **Function:** `checkLicenseCheckerAvailable()`
- **Line:** ~60-68

## Root Cause

The script uses `npx license-checker --version` to verify installation:

```javascript
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
```

**The problem:** `license-checker --version` returns **exit code 1** even when it works correctly.

## Evidence

```bash
$ npx license-checker --version
25.0.1
$ echo $?
1
```

The version is printed correctly (25.0.1), but the exit code is 1 instead of 0. This causes `execAsync` to throw an exception, which the catch block interprets as "not installed".

## Comparison with Other Commands

| Command | Output | Exit Code |
|---------|--------|-----------|
| `--version` | 25.0.1 | 1 (BUG) |
| `--summary` | license counts | 0 |
| `--help` | help text | 0 |
| `--json` | JSON output | 0 |

## Impact

- Projects with `license-checker` installed cannot run `npm run license:check`
- Quality gates fail incorrectly
- Users must run manual license checks
- CI/CD pipelines may fail unnecessarily

## Workaround

Run license check manually:

```bash
npx license-checker --summary
```

Or with full validation:

```bash
npx license-checker --json --excludePrivatePackages | \
  node -e "..." # custom validation script
```

## Proposed Fix

Change the availability check to use `--summary` instead of `--version`:

```javascript
async function checkLicenseCheckerAvailable() {
  try {
    // Use --summary instead of --version because --version returns exit code 1
    await execAsync('npx license-checker --summary', {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });
    return true;
  } catch {
    console.error('❌ Error: license-checker not found');
    console.error('Install it with: npm install --save-dev license-checker');
    return false;
  }
}
```

**Alternative fix:** Ignore the exit code and check stdout instead:

```javascript
async function checkLicenseCheckerAvailable() {
  try {
    const { stdout } = await execAsync('npx license-checker --version 2>&1');
    // If we get version output, it's installed (ignore exit code)
    if (/^\d+\.\d+\.\d+/.test(stdout.trim())) {
      return true;
    }
    throw new Error('Invalid version output');
  } catch {
    console.error('❌ Error: license-checker not found');
    console.error('Install it with: npm install --save-dev license-checker');
    return false;
  }
}
```

## Upstream Issue

This appears to be a bug in `license-checker` itself. The `--version` flag should return exit code 0 when successful.

- **Package:** license-checker
- **Version:** 25.0.1
- **Repository:** <https://github.com/davglass/license-checker>

Consider opening an issue upstream as well.

## Reproduction Steps

1. Install license-checker: `npm install -D license-checker`
2. Verify it works: `npx license-checker --summary` (returns exit 0)
3. Run the script: `npm run license:check`
4. Observe: "license-checker not found" error despite being installed

## Environment

- Node.js: 22.x
- npm: 11.x
- license-checker: 25.0.1
- kabran-config: 1.1.0
- OS: Linux (also reproduced on macOS)

## References

- Discovered in: kabran-app quality audit (2026-01-13)
- Documented in: `kabran-app/docs/quality/002-quality-status.md` (ISS-001)
