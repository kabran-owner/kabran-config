/**
 * CI Command - Full Pipeline Execution
 *
 * Runs the complete CI pipeline with configurable steps.
 * Default steps: check → test:unit → test:integration → build
 *
 * @module cli/commands/ci
 */

import {runCheck} from './check.mjs';
import {runTest} from './test.mjs';
import {runBuild} from './build.mjs';

/**
 * Run the full CI pipeline
 * @param {object} config - Project configuration from kabran.config.mjs
 * @param {string[]} args - CLI arguments
 * @returns {Promise<number>} Exit code (0 = success, 1 = failure)
 */
export async function runCI(config, args) {
  // Get pipeline steps from config or use defaults
  const steps = config.ci?.steps || ['check', 'test:unit', 'build'];

  console.log('╔' + '═'.repeat(50) + '╗');
  console.log('║' + '         KABRAN CI PIPELINE'.padEnd(50) + '║');
  console.log('╚' + '═'.repeat(50) + '╝');
  console.log();
  console.log(`Steps: ${steps.join(' → ')}`);
  console.log();

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNum = i + 1;

    console.log();
    console.log('┌' + '─'.repeat(50) + '┐');
    console.log(`│ Step ${stepNum}/${steps.length}: ${step.padEnd(42)}│`);
    console.log('└' + '─'.repeat(50) + '┘');

    const stepStart = Date.now();
    let code = 0;

    try {
      if (step === 'check') {
        code = await runCheck(config, []);
      } else if (step.startsWith('test:')) {
        const level = step.replace('test:', '');
        code = await runTest(level, config, []);
      } else if (step === 'test') {
        code = await runTest('all', config, []);
      } else if (step === 'build') {
        code = await runBuild(config, []);
      } else {
        console.error(`Unknown step: ${step}`);
        code = 1;
      }
    } catch (error) {
      console.error(`Step "${step}" threw error: ${error.message}`);
      code = 1;
    }

    const stepDuration = ((Date.now() - stepStart) / 1000).toFixed(2);
    results.push({step, code, duration: stepDuration});

    if (code !== 0) {
      console.log();
      console.log('╔' + '═'.repeat(50) + '╗');
      console.log('║' + `  PIPELINE FAILED at step: ${step}`.padEnd(50) + '║');
      console.log('╚' + '═'.repeat(50) + '╝');
      console.log();
      printSummary(results, startTime);
      return 1;
    }
  }

  // Success
  console.log();
  console.log('╔' + '═'.repeat(50) + '╗');
  console.log('║' + '  PIPELINE COMPLETED SUCCESSFULLY'.padEnd(50) + '║');
  console.log('╚' + '═'.repeat(50) + '╝');
  console.log();
  printSummary(results, startTime);

  return 0;
}

/**
 * Print pipeline execution summary
 * @param {Array<{step: string, code: number, duration: string}>} results - Step results
 * @param {number} startTime - Pipeline start timestamp
 */
function printSummary(results, startTime) {
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('Summary:');
  console.log('─'.repeat(50));

  for (const {step, code, duration} of results) {
    const status = code === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status}  ${step.padEnd(25)} ${duration}s`);
  }

  console.log('─'.repeat(50));
  console.log(`  Total time: ${totalDuration}s`);
  console.log();
}
