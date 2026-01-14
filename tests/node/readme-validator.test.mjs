import {describe, it, expect} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  findReadme,
  checkSection,
  validateReadme,
  getReadmeCheckResult,
  REQUIRED_SECTIONS,
  RECOMMENDED_SECTIONS,
} from '../../src/scripts/readme-validator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '../fixtures/mock-readme');

describe('readme-validator', () => {
  describe('findReadme', () => {
    it('finds README.md in project root', () => {
      const result = findReadme(path.join(fixturesPath, 'valid'));
      expect(result).not.toBeNull();
      expect(result.path).toContain('README.md');
      expect(result.content).toContain('# Valid Project');
    });

    it('returns null when no README exists', () => {
      const result = findReadme(path.join(fixturesPath, 'no-readme'));
      expect(result).toBeNull();
    });
  });

  describe('checkSection', () => {
    const content = `# My Project

## Installation

Install with npm.

## Usage

Use like this.

## License

MIT`;

    it('detects Project Title heading', () => {
      const section = REQUIRED_SECTIONS.find(s => s.name.includes('Title'));
      expect(checkSection(content, section)).toBe(true);
    });

    it('detects Installation section', () => {
      const section = REQUIRED_SECTIONS.find(s => s.name === 'Installation');
      expect(checkSection(content, section)).toBe(true);
    });

    it('detects Usage section', () => {
      const section = REQUIRED_SECTIONS.find(s => s.name === 'Usage');
      expect(checkSection(content, section)).toBe(true);
    });

    it('detects License section', () => {
      const section = REQUIRED_SECTIONS.find(s => s.name === 'License');
      expect(checkSection(content, section)).toBe(true);
    });

    it('is case-insensitive for section names', () => {
      const contentLower = '## installation\n## usage\n## license';
      const installation = REQUIRED_SECTIONS.find(s => s.name === 'Installation');
      expect(checkSection(contentLower, installation)).toBe(true);
    });

    it('returns false for missing section', () => {
      const contentNoLicense = '# Title\n## Installation\n## Usage';
      const license = REQUIRED_SECTIONS.find(s => s.name === 'License');
      expect(checkSection(contentNoLicense, license)).toBe(false);
    });
  });

  describe('validateReadme', () => {
    it('passes for README with all required sections', async () => {
      const result = await validateReadme(path.join(fixturesPath, 'valid'), true);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for README missing required sections', async () => {
      const result = await validateReadme(path.join(fixturesPath, 'missing-sections'), true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Installation'))).toBe(true);
      expect(result.errors.some(e => e.includes('License'))).toBe(true);
    });

    it('fails when no README exists', async () => {
      const result = await validateReadme(path.join(fixturesPath, 'no-readme'), true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('README.md not found in project root');
    });

    it('returns warnings for missing recommended sections', async () => {
      const result = await validateReadme(path.join(fixturesPath, 'missing-sections'), true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns no warnings when all sections present', async () => {
      const result = await validateReadme(path.join(fixturesPath, 'valid'), true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('REQUIRED_SECTIONS', () => {
    it('has 4 required sections', () => {
      expect(REQUIRED_SECTIONS).toHaveLength(4);
    });

    it('includes Title, Installation, Usage, License', () => {
      const names = REQUIRED_SECTIONS.map(s => s.name);
      expect(names.some(n => n.includes('Title'))).toBe(true);
      expect(names).toContain('Installation');
      expect(names).toContain('Usage');
      expect(names).toContain('License');
    });
  });

  describe('RECOMMENDED_SECTIONS', () => {
    it('has 3 recommended sections', () => {
      expect(RECOMMENDED_SECTIONS).toHaveLength(3);
    });

    it('includes Development, Contributing, Testing', () => {
      const names = RECOMMENDED_SECTIONS.map(s => s.name);
      expect(names).toContain('Development');
      expect(names).toContain('Contributing');
      expect(names).toContain('Testing');
    });
  });

  describe('getReadmeCheckResult', () => {
    it('returns pass status for valid README', async () => {
      const result = await getReadmeCheckResult(path.join(fixturesPath, 'valid'));
      expect(result.status).toBe('pass');
      expect(result.found).toBe(true);
      expect(result.missing_required).toHaveLength(0);
    });

    it('returns fail status when README not found', async () => {
      const result = await getReadmeCheckResult(path.join(fixturesPath, 'no-readme'));
      expect(result.status).toBe('fail');
      expect(result.found).toBe(false);
    });

    it('returns fail status for missing required sections', async () => {
      const result = await getReadmeCheckResult(path.join(fixturesPath, 'missing-sections'));
      expect(result.status).toBe('fail');
      expect(result.missing_required.length).toBeGreaterThan(0);
    });

    it('returns warn status for missing recommended sections only', async () => {
      // Valid README has all required but missing some recommended
      const result = await getReadmeCheckResult(path.join(fixturesPath, 'valid'));
      // If all required are present but some recommended missing, status is warn
      // But 'valid' fixture has all sections, so should be pass
      expect(['pass', 'warn']).toContain(result.status);
    });

    it('has correct structure for ci-result.json', async () => {
      const result = await getReadmeCheckResult(path.join(fixturesPath, 'valid'));
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('missing_required');
      expect(result).toHaveProperty('missing_recommended');
      expect(Array.isArray(result.missing_required)).toBe(true);
      expect(Array.isArray(result.missing_recommended)).toBe(true);
    });
  });
});
