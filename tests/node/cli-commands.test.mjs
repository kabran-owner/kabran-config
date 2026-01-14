import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures');

// Mock child_process spawn to avoid running actual commands
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        // Simulate successful command execution
        setTimeout(() => callback(0), 0);
      }
    }),
  })),
}));

// Mock validators to avoid side effects
vi.mock('../../src/scripts/readme-validator.mjs', () => ({
  validateReadme: vi.fn(async () => ({valid: true, errors: [], warnings: []})),
}));

vi.mock('../../src/scripts/env-validator.mjs', () => ({
  validateEnv: vi.fn(async () => ({valid: true, errors: [], warnings: []})),
}));

vi.mock('../../src/scripts/quality-standard-validator.mjs', () => ({
  validate: vi.fn(async () => ({valid: true, errors: [], warnings: []})),
}));

describe('CLI Commands', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  describe('check command', () => {
    it('exports runCheck function', async () => {
      const {runCheck} = await import('../../src/cli/commands/check.mjs');
      expect(typeof runCheck).toBe('function');
    });

    it('returns 0 when all checks pass', async () => {
      const {runCheck} = await import('../../src/cli/commands/check.mjs');

      const config = {
        check: {
          lint: 'echo "lint"',
          types: 'echo "types"',
          format: 'echo "format"',
        },
      };

      const exitCode = await runCheck(config, []);
      expect(exitCode).toBe(0);
    });

    it('skips unconfigured checks', async () => {
      const {runCheck} = await import('../../src/cli/commands/check.mjs');

      const config = {
        check: {
          lint: 'echo "lint"',
          // types and format not configured
        },
      };

      const exitCode = await runCheck(config, []);
      expect(exitCode).toBe(0);
    });

    it('handles empty config', async () => {
      const {runCheck} = await import('../../src/cli/commands/check.mjs');
      const config = {};
      const exitCode = await runCheck(config, []);
      expect(exitCode).toBe(0);
    });
  });

  describe('test command', () => {
    it('exports runTest function', async () => {
      const {runTest} = await import('../../src/cli/commands/test.mjs');
      expect(typeof runTest).toBe('function');
    });

    it('returns 0 when test level not configured', async () => {
      const {runTest} = await import('../../src/cli/commands/test.mjs');

      const config = {};
      const exitCode = await runTest('unit', config, []);
      expect(exitCode).toBe(0);
    });

    it('runs unit tests when configured', async () => {
      const {runTest} = await import('../../src/cli/commands/test.mjs');

      const config = {
        test: {
          unit: {
            command: 'echo "unit tests"',
          },
        },
      };

      const exitCode = await runTest('unit', config, []);
      expect(exitCode).toBe(0);
    });

    it('runs all tests (unit + integration)', async () => {
      const {runTest} = await import('../../src/cli/commands/test.mjs');

      const config = {
        test: {
          unit: {command: 'echo "unit"'},
          integration: {command: 'echo "integration"'},
        },
      };

      const exitCode = await runTest('all', config, []);
      expect(exitCode).toBe(0);
    });
  });

  describe('ci command', () => {
    it('exports runCI function', async () => {
      const {runCI} = await import('../../src/cli/commands/ci.mjs');
      expect(typeof runCI).toBe('function');
    });

    it('uses default steps when not configured', async () => {
      const {runCI} = await import('../../src/cli/commands/ci.mjs');

      const config = {};
      const exitCode = await runCI(config, []);
      expect(exitCode).toBe(0);
    });

    it('runs custom steps from config', async () => {
      const {runCI} = await import('../../src/cli/commands/ci.mjs');

      const config = {
        ci: {
          steps: ['check', 'build'],
        },
        check: {
          lint: 'echo "lint"',
        },
        build: {
          command: 'echo "build"',
        },
      };

      const exitCode = await runCI(config, []);
      expect(exitCode).toBe(0);
    });
  });

  describe('build command', () => {
    it('exports runBuild function', async () => {
      const {runBuild} = await import('../../src/cli/commands/build.mjs');
      expect(typeof runBuild).toBe('function');
    });

    it('returns 0 when build not configured', async () => {
      const {runBuild} = await import('../../src/cli/commands/build.mjs');

      const config = {};
      const exitCode = await runBuild(config, []);
      expect(exitCode).toBe(0);
    });

    it('runs build when configured', async () => {
      const {runBuild} = await import('../../src/cli/commands/build.mjs');

      const config = {
        build: {
          command: 'echo "building"',
        },
      };

      const exitCode = await runBuild(config, []);
      expect(exitCode).toBe(0);
    });
  });
});

describe('kabran CLI entry point', () => {
  it('exists and is executable', async () => {
    const fs = await import('node:fs');
    const cliPath = path.join(__dirname, '../../src/cli/kabran.mjs');
    expect(fs.existsSync(cliPath)).toBe(true);
  });
});
