/**
 * Check Command (L1 - Base of Quality Pyramid)
 *
 * Runs static analysis checks:
 * - Lint (ESLint)
 * - Types (TypeScript)
 * - Format (Prettier)
 * - Validators (README, ENV, Quality Standard)
 *
 * @module cli/commands/check
 */

import {spawn} from 'node:child_process';
import {validateReadme} from '../../scripts/readme-validator.mjs';
import {validateEnv} from '../../scripts/env-validator.mjs';
import {validate as validateQuality} from '../../scripts/quality-standard-validator.mjs';

/**
 * Run a shell command and return exit code
 * @param {string} name - Step name for display
 * @param {string} cmd - Command to run
 * @returns {Promise<number>} Exit code
 */
function runCommand(name, cmd) {
  return new Promise(resolve => {
    console.log(`\n[${name}] ${cmd}`);
    const proc = spawn('sh', ['-c', cmd], {stdio: 'inherit'});
    proc.on('close', code => resolve(code ?? 0));
    proc.on('error', () => resolve(1));
  });
}

/**
 * Run L1 checks (static analysis)
 * @param {object} config - Project configuration from kabran.config.mjs
 * @param {string[]} args - CLI arguments
 * @returns {Promise<number>} Exit code (0 = success, 1 = failure)
 */
export async function runCheck(config, args) {
  const fix = args.includes('--fix');
  let failed = 0;

  console.log('='.repeat(50));
  console.log('Running L1 checks (Static Analysis)');
  console.log('='.repeat(50));

  // 1. Lint
  if (config.check?.lint) {
    const cmd = fix ? `${config.check.lint} --fix` : config.check.lint;
    const code = await runCommand('Lint', cmd);
    if (code !== 0) failed++;
  } else {
    console.log('\n[Lint] Skipped (not configured)');
  }

  // 2. Types
  if (config.check?.types) {
    const code = await runCommand('Types', config.check.types);
    if (code !== 0) failed++;
  } else {
    console.log('\n[Types] Skipped (not configured)');
  }

  // 3. Format
  if (config.check?.format) {
    const cmd = fix ? config.check.format.replace('--check', '--write') : config.check.format;
    const code = await runCommand('Format', cmd);
    if (code !== 0) failed++;
  } else {
    console.log('\n[Format] Skipped (not configured)');
  }

  // 4. Validators
  console.log('\n' + '='.repeat(50));
  console.log('Running validators');
  console.log('='.repeat(50));

  // README validator
  console.log('\n--- README Validator ---');
  const readme = await validateReadme(process.cwd(), true);
  console.log(`Result: ${readme.valid ? 'PASS' : 'FAIL'}`);
  if (!readme.valid) failed++;

  // ENV validator
  console.log('\n--- ENV Validator ---');
  const env = await validateEnv(process.cwd(), true);
  console.log(`Result: ${env.valid ? 'PASS' : 'FAIL'}`);
  if (!env.valid) failed++;

  // Quality Standard validator
  console.log('\n--- Quality Standard Validator ---');
  const quality = await validateQuality(process.cwd(), true);
  console.log(`Result: ${quality.valid ? 'PASS' : 'FAIL'}`);
  if (!quality.valid) failed++;

  // Summary
  console.log('\n' + '='.repeat(50));
  if (failed === 0) {
    console.log('L1 checks: PASSED');
    console.log('='.repeat(50));
    return 0;
  } else {
    console.log(`L1 checks: FAILED (${failed} error${failed > 1 ? 's' : ''})`);
    console.log('='.repeat(50));
    return 1;
  }
}
