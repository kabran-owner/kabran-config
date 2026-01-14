import {describe, it, expect} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig, findConfigFile, DEFAULTS} from '../../src/core/config-loader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/mock-config');

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
      const config = await loadConfig(path.join(fixturesPath, 'no-config'));
      expect(config).toEqual(DEFAULTS);
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
});
