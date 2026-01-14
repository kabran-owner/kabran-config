/**
 * Test Command (L2-L4 of Quality Pyramid)
 *
 * Runs tests at different levels:
 * - L2: Unit tests
 * - L3: Integration tests
 * - L4: E2E tests
 *
 * @module cli/commands/test
 */

import {spawn} from 'node:child_process';

/**
 * Run a shell command and return exit code
 * @param {string} cmd - Command to run
 * @returns {Promise<number>} Exit code
 */
function runCommand(cmd) {
  return new Promise(resolve => {
    const proc = spawn('sh', ['-c', cmd], {stdio: 'inherit'});
    proc.on('close', code => resolve(code ?? 0));
    proc.on('error', () => resolve(1));
  });
}

/**
 * Get pyramid level number from test type
 * @param {string} level - Test level (unit, integration, e2e)
 * @returns {string} Level number
 */
function levelNumber(level) {
  return {unit: '2', integration: '3', e2e: '4'}[level] || '?';
}

/**
 * Run tests at specified level
 * @param {string} level - Test level (unit, integration, e2e, all)
 * @param {object} config - Project configuration from kabran.config.mjs
 * @param {string[]} args - CLI arguments
 * @returns {Promise<number>} Exit code (0 = success, 1 = failure)
 */
export async function runTest(level, config, args) {
  const watch = args.includes('--watch');
  const coverage = args.includes('--coverage');

  // Run all tests (unit + integration)
  if (level === 'all') {
    console.log('='.repeat(50));
    console.log('Running all tests (L2 + L3)');
    console.log('='.repeat(50));

    let failed = 0;

    // Run unit tests
    const unitCode = await runTest('unit', config, args);
    if (unitCode !== 0) failed++;

    // Run integration tests
    const integrationCode = await runTest('integration', config, args);
    if (integrationCode !== 0) failed++;

    console.log('\n' + '='.repeat(50));
    if (failed === 0) {
      console.log('All tests: PASSED');
    } else {
      console.log(`All tests: FAILED (${failed} level${failed > 1 ? 's' : ''} failed)`);
    }
    console.log('='.repeat(50));

    return failed > 0 ? 1 : 0;
  }

  // Get test configuration for this level
  const testConfig = config.test?.[level];

  if (!testConfig) {
    console.log(`\n[test:${level}] Skipped (not configured)`);
    return 0;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Running L${levelNumber(level)} tests: ${level}`);
  if (testConfig.doppler) {
    console.log('[Doppler] Secrets injection enabled');
  }
  console.log('='.repeat(50));

  // Setup phase (if defined)
  if (testConfig.setup) {
    console.log(`\n[Setup] ${testConfig.setup}`);
    const setupCode = await runCommand(testConfig.setup);
    if (setupCode !== 0) {
      console.error('Setup failed');
      return 1;
    }
  }

  // Build test command with options
  let cmd = testConfig.command;

  if (watch && !cmd.includes('--watch')) {
    cmd += ' --watch';
  }

  if (coverage && !cmd.includes('--coverage')) {
    cmd += ' --coverage';

    // Add coverage threshold if configured
    if (testConfig.coverage?.threshold) {
      cmd += ` --coverage.thresholds.statements=${testConfig.coverage.threshold}`;
    }
  }

  console.log(`\n[Test] ${cmd}`);
  const testCode = await runCommand(cmd);

  // Teardown phase (if defined, always run even if tests fail)
  if (testConfig.teardown) {
    console.log(`\n[Teardown] ${testConfig.teardown}`);
    await runCommand(testConfig.teardown);
  }

  // Result
  console.log('\n' + '-'.repeat(50));
  if (testCode === 0) {
    console.log(`L${levelNumber(level)} tests (${level}): PASSED`);
  } else {
    console.log(`L${levelNumber(level)} tests (${level}): FAILED`);
  }

  return testCode;
}
