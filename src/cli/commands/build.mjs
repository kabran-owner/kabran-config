/**
 * Build Command
 *
 * Runs the project build process.
 *
 * @module cli/commands/build
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
 * Run the build process
 * @param {object} config - Project configuration from kabran.config.mjs
 * @param {string[]} _args - CLI arguments (unused for now)
 * @returns {Promise<number>} Exit code (0 = success, 1 = failure)
 */
export async function runBuild(config, _args) {
  const buildConfig = config.build;

  if (!buildConfig?.command) {
    console.log('\n[Build] Skipped (not configured)');
    console.log('   Add build.command to kabran.config.mjs to enable');
    return 0;
  }

  console.log('='.repeat(50));
  console.log('Running build');
  console.log('='.repeat(50));

  console.log(`\n[Build] ${buildConfig.command}`);
  const code = await runCommand(buildConfig.command);

  console.log('\n' + '-'.repeat(50));
  if (code === 0) {
    console.log('Build: PASSED');
  } else {
    console.log('Build: FAILED');
  }

  return code;
}
