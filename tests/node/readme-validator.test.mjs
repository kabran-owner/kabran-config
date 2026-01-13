import {describe, it, expect} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  findReadme,
  checkSection,
  validateReadme,
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
    it('passes for README with all required sections', () => {
      const result = validateReadme(path.join(fixturesPath, 'valid'), true);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for README missing required sections', () => {
      const result = validateReadme(path.join(fixturesPath, 'missing-sections'), true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Installation'))).toBe(true);
      expect(result.errors.some(e => e.includes('License'))).toBe(true);
    });

    it('fails when no README exists', () => {
      const result = validateReadme(path.join(fixturesPath, 'no-readme'), true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('README.md not found in project root');
    });

    it('returns warnings for missing recommended sections', () => {
      const result = validateReadme(path.join(fixturesPath, 'missing-sections'), true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns no warnings when all sections present', () => {
      const result = validateReadme(path.join(fixturesPath, 'valid'), true);
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
});
