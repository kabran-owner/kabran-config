import {describe, it, expect} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  checkEnvExampleExists,
  validateEnvExample,
  parseEnvContent,
} from '../../src/scripts/env-validator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/mock-env');

describe('env-validator', () => {
  describe('checkEnvExampleExists', () => {
    it('finds .env.example when it exists', () => {
      const result = checkEnvExampleExists(path.join(fixturesPath, 'with-example'));
      expect(result.exists).toBe(true);
      expect(result.name).toBe('.env.example');
      expect(result.path).toContain('.env.example');
    });

    it('returns exists=false when no .env.example', () => {
      const result = checkEnvExampleExists(path.join(fixturesPath, 'missing-example'));
      expect(result.exists).toBe(false);
    });
  });

  describe('validateEnvExample', () => {
    it('returns empty array for well-documented file', () => {
      const envPath = path.join(fixturesPath, 'with-example/.env.example');
      const undocumented = validateEnvExample(envPath);
      expect(undocumented).toHaveLength(0);
    });

    it('returns undocumented variable names', () => {
      const envPath = path.join(fixturesPath, 'undocumented/.env.example');
      const undocumented = validateEnvExample(envPath);
      expect(undocumented.length).toBeGreaterThan(0);
      expect(undocumented).toContain('DATABASE_URL');
      expect(undocumented).toContain('API_KEY');
      expect(undocumented).toContain('DEBUG');
    });
  });

  describe('parseEnvContent', () => {
    it('returns empty array for content with all documented variables', () => {
      const content = `# Database URL
DATABASE_URL=postgres://localhost/db

# API Key
API_KEY=secret`;
      expect(parseEnvContent(content)).toHaveLength(0);
    });

    it('returns undocumented variables', () => {
      const content = `DATABASE_URL=postgres://localhost/db
API_KEY=secret`;
      const result = parseEnvContent(content);
      expect(result).toContain('DATABASE_URL');
      expect(result).toContain('API_KEY');
    });

    it('considers comment above variable as documentation', () => {
      const content = `# This is the database URL
DATABASE_URL=postgres://localhost/db
UNDOCUMENTED_VAR=value`;
      const result = parseEnvContent(content);
      expect(result).not.toContain('DATABASE_URL');
      expect(result).toContain('UNDOCUMENTED_VAR');
    });

    it('handles empty content', () => {
      expect(parseEnvContent('')).toHaveLength(0);
    });

    it('handles content with only comments', () => {
      const content = `# Comment 1
# Comment 2
# Comment 3`;
      expect(parseEnvContent(content)).toHaveLength(0);
    });

    it('handles content with empty lines between comments and variables', () => {
      const content = `# This comment is not above the variable

DATABASE_URL=postgres://localhost/db`;
      const result = parseEnvContent(content);
      expect(result).toContain('DATABASE_URL');
    });

    it('handles variables without values', () => {
      const content = `DATABASE_URL=`;
      const result = parseEnvContent(content);
      expect(result).toContain('DATABASE_URL');
    });

    it('ignores lines without equals sign', () => {
      const content = `This is not a variable
DATABASE_URL=value`;
      const result = parseEnvContent(content);
      expect(result).toHaveLength(1);
      expect(result).toContain('DATABASE_URL');
    });
  });

  describe('env content patterns', () => {
    it('handles quoted values', () => {
      const content = `API_KEY="secret-with-spaces"`;
      const result = parseEnvContent(content);
      expect(result).toContain('API_KEY');
    });

    it('handles values with equals signs', () => {
      const content = `# Connection string with = in value
DATABASE_URL=postgres://user:pass=word@localhost/db`;
      const result = parseEnvContent(content);
      expect(result).toHaveLength(0);
    });

    it('handles inline comments (still marks as undocumented)', () => {
      const content = `DATABASE_URL=value # This is an inline comment`;
      const result = parseEnvContent(content);
      expect(result).toContain('DATABASE_URL');
    });
  });
});
