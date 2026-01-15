import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {loadConfig, findConfigFile, DEFAULTS, detectToolDefaults, wrapWithDoppler} from '../../src/core/config-loader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/mock-config');
const tempFixturesPath = path.join(__dirname, '../fixtures/temp-tool-detection');

describe('config-loader', () => {
  describe('DEFAULTS', () => {
    it('has readme defaults', () => {
      expect(DEFAULTS.readme).toBeDefined();
      expect(DEFAULTS.readme.required).toContain('Installation');
      expect(DEFAULTS.readme.required).toContain('Usage');
      expect(DEFAULTS.readme.required).toContain('License');
      expect(DEFAULTS.readme.recommended).toContain('Development');
      expect(DEFAULTS.readme.recommended).toContain('Testing');
    });

    it('has env defaults', () => {
      expect(DEFAULTS.env).toBeDefined();
      expect(DEFAULTS.env.requireExample).toBe(true);
      expect(DEFAULTS.env.detectPatterns).toContain('process.env');
      expect(DEFAULTS.env.detectPatterns).toContain('import.meta.env');
    });

    it('has quality defaults', () => {
      expect(DEFAULTS.quality).toBeDefined();
      expect(DEFAULTS.quality.standardPath).toBe('docs/quality/001-quality-standard.md');
    });
  });

  describe('findConfigFile', () => {
    it('finds kabran.config.mjs', () => {
      const result = findConfigFile(path.join(fixturesPath, 'with-mjs-config'));
      expect(result.exists).toBe(true);
      expect(result.name).toBe('kabran.config.mjs');
    });

    it('finds kabran.config.json', () => {
      const result = findConfigFile(path.join(fixturesPath, 'with-json-config'));
      expect(result.exists).toBe(true);
      expect(result.name).toBe('kabran.config.json');
    });

    it('returns exists: false when no config', () => {
      const result = findConfigFile(path.join(fixturesPath, 'no-config'));
      expect(result.exists).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('returns defaults when no config file exists', async () => {
      const testDir = path.join(fixturesPath, 'no-config');
      const config = await loadConfig(testDir);

      // Should include static DEFAULTS
      expect(config.readme).toEqual(DEFAULTS.readme);
      expect(config.env).toEqual(DEFAULTS.env);
      expect(config.quality).toEqual(DEFAULTS.quality);

      // Should also include detected tool defaults (empty for no-config fixture)
      expect(config).toHaveProperty('check');
      expect(config).toHaveProperty('test');
      expect(config).toHaveProperty('build');
      expect(config).toHaveProperty('ci');
    });

    it('loads and merges kabran.config.mjs', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'with-mjs-config'));

      // Custom values from config
      expect(config.readme.required).toContain('Setup');
      expect(config.readme.required).toContain('API');
      expect(config.readme.recommended).toContain('Examples');
      expect(config.quality.standardPath).toBe('custom/path/quality.md');
      expect(config.env.detectPatterns).toContain('MY_CUSTOM_ENV');
    });

    it('loads and merges kabran.config.json', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'with-json-config'));

      // Custom values from JSON config
      expect(config.readme.required).toContain('Quick Start');
      expect(config.readme.required).toContain('Usage');
      expect(config.readme.recommended).toContain('FAQ');
      expect(config.quality.standardPath).toBe('docs/standards/quality.md');
    });

    it('preserves defaults for missing config sections', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'with-json-config'));

      // env section not in JSON config, should use defaults
      expect(config.env.requireExample).toBe(true);
      expect(config.env.detectPatterns).toContain('process.env');
    });

    it('deep merges nested objects', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'with-mjs-config'));

      // env.requireExample not in mjs config, should use default
      expect(config.env.requireExample).toBe(true);
      // env.detectPatterns is in config, should use custom value
      expect(config.env.detectPatterns).toContain('MY_CUSTOM_ENV');
    });
  });

  describe('wrapWithDoppler', () => {
    it('wraps command with doppler run when enabled', () => {
      const result = wrapWithDoppler('npx vitest run', true);
      expect(result).toBe('doppler run -- npx vitest run');
    });

    it('returns command unchanged when disabled', () => {
      const result = wrapWithDoppler('npx vitest run', false);
      expect(result).toBe('npx vitest run');
    });
  });

  describe('Doppler detection', () => {
    const dopplerDir = path.join(tempFixturesPath, 'doppler-detection');

    beforeAll(() => {
      mkdirSync(dopplerDir, {recursive: true});
    });

    afterAll(() => {
      // Restore env
      delete process.env.DOPPLER_TOKEN;
    });

    it('detects Doppler via DOPPLER_TOKEN env var', () => {
      const testDir = path.join(dopplerDir, 'env-token');
      mkdirSync(testDir, {recursive: true});
      writeFileSync(path.join(testDir, 'vitest.config.ts'), 'export default {}');

      // Set env var
      process.env.DOPPLER_TOKEN = 'dp.st.test_token_123';

      const defaults = detectToolDefaults(testDir);

      expect(defaults.test.unit.doppler).toBe(true);
      expect(defaults.test.unit.command).toContain('doppler run --');

      // Cleanup
      delete process.env.DOPPLER_TOKEN;
    });

    it('detects Doppler via doppler.yaml file', () => {
      const testDir = path.join(dopplerDir, 'yaml-config');
      mkdirSync(testDir, {recursive: true});
      writeFileSync(path.join(testDir, 'vitest.config.ts'), 'export default {}');
      writeFileSync(
        path.join(testDir, 'doppler.yaml'),
        'setup:\n  project: test-project\n  config: dev'
      );

      const defaults = detectToolDefaults(testDir);

      expect(defaults.test.unit.doppler).toBe(true);
      expect(defaults.test.unit.command).toContain('doppler run --');
    });

    it('wraps with Doppler only when configured (no env var or yaml)', () => {
      const testDir = path.join(dopplerDir, 'no-env-or-yaml');
      mkdirSync(testDir, {recursive: true});
      writeFileSync(path.join(testDir, 'vitest.config.ts'), 'export default {}');

      // Ensure no env var
      delete process.env.DOPPLER_TOKEN;

      const defaults = detectToolDefaults(testDir);

      // The test verifies consistent behavior:
      // - If doppler flag is true, command MUST be wrapped
      // - If doppler flag is false, command MUST NOT be wrapped
      if (defaults.test.unit.doppler) {
        // Doppler was detected via CLI config or secrets command (machine has Doppler setup)
        expect(defaults.test.unit.command).toContain('doppler run --');
      } else {
        // No Doppler detected
        expect(defaults.test.unit.command).toBe('npx vitest run');
      }
    });
  });

  describe('detectToolDefaults', () => {
    const testDir = path.join(tempFixturesPath, 'with-tools');

    beforeAll(() => {
      // Create temp directory with tool configs
      mkdirSync(testDir, {recursive: true});
    });

    afterAll(() => {
      // Cleanup
      rmSync(tempFixturesPath, {recursive: true, force: true});
    });

    it('returns empty defaults for directory without tool configs', () => {
      const emptyDir = path.join(tempFixturesPath, 'empty');
      mkdirSync(emptyDir, {recursive: true});

      const defaults = detectToolDefaults(emptyDir);

      expect(defaults.check).toEqual({});
      expect(defaults.test).toEqual({});
      expect(defaults.ci.steps).toEqual([]);
    });

    it('detects ESLint config', () => {
      const eslintDir = path.join(tempFixturesPath, 'with-eslint');
      mkdirSync(eslintDir, {recursive: true});
      writeFileSync(path.join(eslintDir, 'eslint.config.mjs'), 'export default {}');

      const defaults = detectToolDefaults(eslintDir);

      expect(defaults.check.lint).toBe('npx eslint .');
      expect(defaults.ci.steps).toContain('check');
    });

    it('detects TypeScript config', () => {
      const tsDir = path.join(tempFixturesPath, 'with-typescript');
      mkdirSync(tsDir, {recursive: true});
      writeFileSync(path.join(tsDir, 'tsconfig.json'), '{}');

      const defaults = detectToolDefaults(tsDir);

      expect(defaults.check.types).toBe('npx tsc --noEmit');
    });

    it('detects Prettier config', () => {
      const prettierDir = path.join(tempFixturesPath, 'with-prettier');
      mkdirSync(prettierDir, {recursive: true});
      writeFileSync(path.join(prettierDir, '.prettierrc'), '{}');

      const defaults = detectToolDefaults(prettierDir);

      expect(defaults.check.format).toBe('npx prettier --check .');
    });

    it('detects Vitest config', () => {
      const vitestDir = path.join(tempFixturesPath, 'with-vitest');
      mkdirSync(vitestDir, {recursive: true});
      writeFileSync(path.join(vitestDir, 'vitest.config.ts'), 'export default {}');

      const defaults = detectToolDefaults(vitestDir);

      expect(defaults.test.unit).toBeDefined();
      expect(defaults.test.unit.command).toContain('vitest run');
      expect(defaults.ci.steps).toContain('test:unit');
    });

    it('detects Playwright config', () => {
      const playwrightDir = path.join(tempFixturesPath, 'with-playwright');
      mkdirSync(playwrightDir, {recursive: true});
      writeFileSync(path.join(playwrightDir, 'playwright.config.ts'), 'export default {}');

      const defaults = detectToolDefaults(playwrightDir);

      expect(defaults.test.e2e).toBeDefined();
      expect(defaults.test.e2e.command).toContain('playwright test');
    });

    it('detects build script from package.json', () => {
      const buildDir = path.join(tempFixturesPath, 'with-build');
      mkdirSync(buildDir, {recursive: true});
      writeFileSync(
        path.join(buildDir, 'package.json'),
        JSON.stringify({scripts: {build: 'tsc'}})
      );

      const defaults = detectToolDefaults(buildDir);

      expect(defaults.build.command).toBe('npm run build');
      expect(defaults.ci.steps).toContain('build');
    });

    it('detects all tools and builds correct CI steps', () => {
      const fullDir = path.join(tempFixturesPath, 'full-project');
      mkdirSync(fullDir, {recursive: true});
      writeFileSync(path.join(fullDir, 'eslint.config.mjs'), 'export default {}');
      writeFileSync(path.join(fullDir, 'tsconfig.json'), '{}');
      writeFileSync(path.join(fullDir, 'vitest.config.ts'), 'export default {}');
      writeFileSync(
        path.join(fullDir, 'package.json'),
        JSON.stringify({scripts: {build: 'tsc'}})
      );

      const defaults = detectToolDefaults(fullDir);

      expect(defaults.check.lint).toBeDefined();
      expect(defaults.check.types).toBeDefined();
      expect(defaults.test.unit).toBeDefined();
      expect(defaults.build.command).toBeDefined();
      expect(defaults.ci.steps).toEqual(['check', 'test:unit', 'build']);
    });
  });

  describe('Turbo monorepo detection', () => {
    const turboTempPath = path.join(tempFixturesPath, 'turbo-detection');

    beforeAll(() => {
      mkdirSync(turboTempPath, {recursive: true});
    });

    afterAll(() => {
      // Restore env
      delete process.env.DOPPLER_TOKEN;
    });

    it('detects turbo.json and sets turbo flag to true', () => {
      const turboDir = path.join(turboTempPath, 'basic-turbo');
      mkdirSync(turboDir, {recursive: true});
      writeFileSync(
        path.join(turboDir, 'turbo.json'),
        JSON.stringify({
          "$schema": "https://turbo.build/schema.json",
          "tasks": {
            "build": {},
            "lint": {},
            "type-check": {},
            "test": {}
          }
        })
      );

      const defaults = detectToolDefaults(turboDir);

      expect(defaults.turbo).toBe(true);
    });

    it('uses turbo run commands when turbo.json is detected', () => {
      const turboDir = path.join(turboTempPath, 'turbo-commands');
      mkdirSync(turboDir, {recursive: true});
      writeFileSync(
        path.join(turboDir, 'turbo.json'),
        JSON.stringify({"$schema": "https://turbo.build/schema.json"})
      );

      const defaults = detectToolDefaults(turboDir);

      expect(defaults.check.lint).toBe('turbo run lint');
      expect(defaults.check.types).toBe('turbo run type-check');
      expect(defaults.check.format).toBe('turbo run format:check');
      expect(defaults.build.command).toBe('turbo run build');
    });

    it('uses turbo run for tests when turbo.json is detected', () => {
      const turboDir = path.join(turboTempPath, 'turbo-tests');
      mkdirSync(turboDir, {recursive: true});
      writeFileSync(
        path.join(turboDir, 'turbo.json'),
        JSON.stringify({"$schema": "https://turbo.build/schema.json"})
      );

      const defaults = detectToolDefaults(turboDir);

      // Commands may be wrapped with Doppler if configured globally on the machine
      expect(defaults.test.unit.command).toContain('turbo run test');
      expect(defaults.test.integration.command).toContain('turbo run test:integration');
      expect(defaults.test.e2e.command).toContain('turbo run test:e2e');
    });

    it('sets correct CI steps for Turbo projects', () => {
      const turboDir = path.join(turboTempPath, 'turbo-ci-steps');
      mkdirSync(turboDir, {recursive: true});
      writeFileSync(
        path.join(turboDir, 'turbo.json'),
        JSON.stringify({"$schema": "https://turbo.build/schema.json"})
      );

      const defaults = detectToolDefaults(turboDir);

      expect(defaults.ci.steps).toEqual(['check', 'test:unit', 'build']);
    });

    it('wraps Turbo test commands with Doppler when configured', () => {
      const turboDir = path.join(turboTempPath, 'turbo-with-doppler');
      mkdirSync(turboDir, {recursive: true});
      writeFileSync(
        path.join(turboDir, 'turbo.json'),
        JSON.stringify({"$schema": "https://turbo.build/schema.json"})
      );
      writeFileSync(
        path.join(turboDir, 'doppler.yaml'),
        'setup:\n  project: test\n  config: dev'
      );

      const defaults = detectToolDefaults(turboDir);

      expect(defaults.test.unit.doppler).toBe(true);
      expect(defaults.test.unit.command).toBe('doppler run -- turbo run test');
      expect(defaults.test.integration.command).toBe('doppler run -- turbo run test:integration');
      expect(defaults.test.e2e.command).toBe('doppler run -- turbo run test:e2e');
    });

    it('sets turbo flag to false when turbo.json is NOT present', () => {
      const nonTurboDir = path.join(turboTempPath, 'non-turbo');
      mkdirSync(nonTurboDir, {recursive: true});
      writeFileSync(path.join(nonTurboDir, 'package.json'), '{}');

      const defaults = detectToolDefaults(nonTurboDir);

      expect(defaults.turbo).toBe(false);
    });

    it('uses standard commands when turbo.json is NOT present', () => {
      const standardDir = path.join(turboTempPath, 'standard-project');
      mkdirSync(standardDir, {recursive: true});
      writeFileSync(path.join(standardDir, 'eslint.config.mjs'), 'export default {}');
      writeFileSync(path.join(standardDir, 'tsconfig.json'), '{}');
      writeFileSync(path.join(standardDir, 'vitest.config.ts'), 'export default {}');

      const defaults = detectToolDefaults(standardDir);

      expect(defaults.turbo).toBe(false);
      expect(defaults.check.lint).toBe('npx eslint .');
      expect(defaults.check.types).toBe('npx tsc --noEmit');
      expect(defaults.test.unit.command).toContain('vitest run');
    });

    it('prioritizes Turbo detection over individual tool configs', () => {
      // Even if ESLint/TS configs exist, Turbo mode takes precedence
      const turboWithTools = path.join(turboTempPath, 'turbo-with-individual-configs');
      mkdirSync(turboWithTools, {recursive: true});
      writeFileSync(
        path.join(turboWithTools, 'turbo.json'),
        JSON.stringify({"$schema": "https://turbo.build/schema.json"})
      );
      writeFileSync(path.join(turboWithTools, 'eslint.config.mjs'), 'export default {}');
      writeFileSync(path.join(turboWithTools, 'tsconfig.json'), '{}');
      writeFileSync(path.join(turboWithTools, 'vitest.config.ts'), 'export default {}');

      const defaults = detectToolDefaults(turboWithTools);

      // Should use turbo run, not direct npx commands
      expect(defaults.turbo).toBe(true);
      expect(defaults.check.lint).toBe('turbo run lint');
      expect(defaults.check.types).toBe('turbo run type-check');
      expect(defaults.test.unit.command).toContain('turbo run test');
    });
  });
});
