#!/usr/bin/env node

/**
 * Kabran CLI - Unified command runner organized by quality pyramid levels
 *
 * L1 (Base): Static analysis - lint, types, format, validators
 * L2: Unit tests
 * L3: Integration tests
 * L4: E2E tests
 *
 * Usage:
 *   kabran <command> [options]
 *
 * Commands:
 *   check              Run L1 checks (lint, types, format, validators)
 *   test:unit          Run L2 unit tests
 *   test:integration   Run L3 integration tests
 *   test:e2e           Run L4 E2E tests
 *   test               Run L2 + L3 tests
 *   ci                 Run full CI pipeline
 *   build              Run build
 */

import {loadConfig} from '../core/config-loader.mjs';
import {runCheck} from './commands/check.mjs';
import {runTest} from './commands/test.mjs';
import {runCI} from './commands/ci.mjs';
import {runBuild} from './commands/build.mjs';

const VERSION = '1.0.0';

/**
 * Show help message
 */
function showHelp() {
  console.log(`
kabran - Unified quality CLI for Kabran projects

Usage: kabran <command> [options]

Commands:
  check              Run L1 checks (lint, types, format, validators)
  test:unit          Run L2 unit tests
  test:integration   Run L3 integration tests
  test:e2e           Run L4 E2E tests
  test               Run L2 + L3 tests
  ci                 Run full CI pipeline
  build              Run build

Options:
  --fix              Auto-fix issues (check command)
  --watch            Watch mode (test commands)
  --coverage         Generate coverage report
  --help, -h         Show this help
  --version, -v      Show version

Quality Pyramid:
                  /\\
                 /  \\
                / L4  \\          kabran test:e2e
               /       \\
              /__________\\
             /            \\
            /      L3      \\     kabran test:integration
           /                \\
          /__________________\\
         /                    \\
        /         L2           \\   kabran test:unit
       /                        \\
      /__________________________\\
     /                            \\
    /            L1                \\  kabran check
   /                                \\
  /__________________________________\\

Examples:
  kabran check              # Run lint, types, format, validators
  kabran check --fix        # Run checks with auto-fix
  kabran test:unit          # Run unit tests
  kabran test --coverage    # Run all tests with coverage
  kabran ci                 # Run full CI pipeline
`);
}

/**
 * Show version
 */
function showVersion() {
  console.log(`kabran v${VERSION}`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const [command, ...args] = process.argv.slice(2);

  // Handle help and version flags
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    showVersion();
    process.exit(0);
  }

  // Load project configuration
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error(`Failed to load config: ${error.message}`);
    process.exit(1);
  }

  // Command routing
  const commands = {
    check: () => runCheck(config, args),
    'test:unit': () => runTest('unit', config, args),
    'test:integration': () => runTest('integration', config, args),
    'test:e2e': () => runTest('e2e', config, args),
    test: () => runTest('all', config, args),
    ci: () => runCI(config, args),
    build: () => runBuild(config, args),
  };

  if (commands[command]) {
    try {
      const exitCode = await commands[command]();
      process.exit(exitCode);
    } catch (error) {
      console.error(`Command failed: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "kabran --help" for available commands.');
    process.exit(1);
  }
}

main();
