import {describe, it, expect} from 'vitest';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

import {
  REQUIRED_SECTIONS,
  REQUIRED_FRONTMATTER,
  findQualityStandard,
  parseFrontmatter,
  checkRequiredSections,
  detectCodeOverrides,
  parseDocumentedOverrides,
  compareOverrides,
  validate,
  getQualityStandardCheckResult,
} from '../../src/scripts/quality-standard-validator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = join(__dirname, '..', 'fixtures', 'mock-quality-standard');
const validFixture = join(fixturesDir, 'valid');
const missingFileFixture = join(fixturesDir, 'missing-file');
const missingSectionsFixture = join(fixturesDir, 'missing-sections');
const undocumentedOverrideFixture = join(fixturesDir, 'undocumented-override');
const documentedButMissingFixture = join(fixturesDir, 'documented-but-missing');

describe('quality-standard-validator', () => {
  describe('REQUIRED_SECTIONS', () => {
    it('should have 2 required sections', () => {
      expect(REQUIRED_SECTIONS).toHaveLength(2);
    });

    it('should require Configuracao Base section', () => {
      const section = REQUIRED_SECTIONS.find(s => s.name === 'Configuracao Base');
      expect(section).toBeDefined();
      expect(section.pattern.test('## Configuracao Base')).toBe(true);
    });

    it('should require Overrides Aplicados section', () => {
      const section = REQUIRED_SECTIONS.find(s => s.name === 'Overrides Aplicados');
      expect(section).toBeDefined();
      expect(section.pattern.test('## Overrides Aplicados')).toBe(true);
    });
  });

  describe('REQUIRED_FRONTMATTER', () => {
    it('should have 3 required fields', () => {
      expect(REQUIRED_FRONTMATTER).toHaveLength(3);
    });

    it('should require title, type, and status', () => {
      expect(REQUIRED_FRONTMATTER).toContain('title');
      expect(REQUIRED_FRONTMATTER).toContain('type');
      expect(REQUIRED_FRONTMATTER).toContain('status');
    });
  });

  describe('findQualityStandard', () => {
    it('should find quality-standard.md when it exists', () => {
      const result = findQualityStandard(validFixture);
      expect(result).not.toBeNull();
      expect(result.exists).toBe(true);
      expect(result.path).toContain('001-quality-standard.md');
    });

    it('should return null when file is missing', () => {
      const result = findQualityStandard(missingFileFixture);
      expect(result).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const result = findQualityStandard('/non/existent/path');
      expect(result).toBeNull();
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
title: Quality Standard
type: quality
status: active
---

# Content`;

      const result = parseFrontmatter(content);
      expect(result).not.toBeNull();
      expect(result.title).toBe('Quality Standard');
      expect(result.type).toBe('quality');
      expect(result.status).toBe('active');
    });

    it('should handle quoted values', () => {
      const content = `---
title: "Quality Standard"
type: 'quality'
---

# Content`;

      const result = parseFrontmatter(content);
      expect(result).not.toBeNull();
      expect(result.title).toBe('Quality Standard');
      expect(result.type).toBe('quality');
    });

    it('should return null for missing frontmatter', () => {
      const content = `# No frontmatter here`;
      const result = parseFrontmatter(content);
      expect(result).toBeNull();
    });

    it('should return null for invalid frontmatter', () => {
      const content = `---
---

# Empty frontmatter`;

      const result = parseFrontmatter(content);
      expect(result).toBeNull();
    });
  });

  describe('checkRequiredSections', () => {
    it('should find all sections in valid content', () => {
      const content = `
## Configuracao Base

Some content

## Overrides Aplicados

More content
`;

      const result = checkRequiredSections(content);
      expect(result.present).toHaveLength(2);
      expect(result.missing).toHaveLength(0);
      expect(result.present).toContain('Configuracao Base');
      expect(result.present).toContain('Overrides Aplicados');
    });

    it('should detect missing sections', () => {
      const content = `
## Configuracao Base

Some content
`;

      const result = checkRequiredSections(content);
      expect(result.present).toHaveLength(1);
      expect(result.missing).toHaveLength(1);
      expect(result.missing).toContain('Overrides Aplicados');
    });

    it('should handle case-insensitive matching', () => {
      const content = `
## CONFIGURACAO BASE

Some content

## overrides aplicados

More content
`;

      const result = checkRequiredSections(content);
      expect(result.present).toHaveLength(2);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('detectCodeOverrides', () => {
    it('should return empty array when no eslint config', () => {
      const result = detectCodeOverrides('/non/existent/path');
      expect(result).toEqual([]);
    });

    it('should return empty array when no overrides', () => {
      const result = detectCodeOverrides(validFixture);
      expect(result).toEqual([]);
    });

    it('should detect overrides in eslint config', () => {
      const result = detectCodeOverrides(undocumentedOverrideFixture);
      expect(result).toContain('no-console');
      expect(result).toContain('@typescript-eslint/no-explicit-any');
    });
  });

  describe('parseDocumentedOverrides', () => {
    it('should return empty array when no overrides documented', () => {
      const content = `
## Overrides Aplicados

### Nenhum override aplicado

Este projeto segue 100% dos padroes.
`;

      const result = parseDocumentedOverrides(content);
      expect(result).toEqual([]);
    });

    it('should extract documented rule names', () => {
      const content = `
## Overrides Aplicados

### OVR-001: no-console

| Campo | Valor |
|-------|-------|
| **Regra** | \`no-console\` |
| **Severidade Original** | error |

### OVR-002: explicit-any

| Campo | Valor |
|-------|-------|
| **Regra** | \`@typescript-eslint/no-explicit-any\` |
| **Severidade Original** | error |
`;

      const result = parseDocumentedOverrides(content);
      expect(result).toHaveLength(2);
      expect(result).toContain('no-console');
      expect(result).toContain('@typescript-eslint/no-explicit-any');
    });
  });

  describe('compareOverrides', () => {
    it('should return empty arrays when no differences', () => {
      const documented = ['no-console', 'no-unused-vars'];
      const code = ['no-console', 'no-unused-vars'];

      const result = compareOverrides(documented, code);
      expect(result.undocumented).toHaveLength(0);
      expect(result.orphaned).toHaveLength(0);
    });

    it('should detect undocumented overrides', () => {
      const documented = [];
      const code = ['no-console'];

      const result = compareOverrides(documented, code);
      expect(result.undocumented).toContain('no-console');
      expect(result.orphaned).toHaveLength(0);
    });

    it('should detect orphaned documented overrides', () => {
      const documented = ['no-console'];
      const code = [];

      const result = compareOverrides(documented, code);
      expect(result.undocumented).toHaveLength(0);
      expect(result.orphaned).toContain('no-console');
    });

    it('should detect both undocumented and orphaned', () => {
      const documented = ['no-console'];
      const code = ['no-unused-vars'];

      const result = compareOverrides(documented, code);
      expect(result.undocumented).toContain('no-unused-vars');
      expect(result.orphaned).toContain('no-console');
    });
  });

  describe('validate', () => {
    it('should pass for valid project', async () => {
      const result = await validate(validFixture, true);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when file is missing', async () => {
      const result = await validate(missingFileFixture, true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing required file');
    });

    it('should fail when required sections are missing', async () => {
      const result = await validate(missingSectionsFixture, true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Missing required section'))).toBe(true);
    });

    it('should warn for undocumented overrides but still be valid', async () => {
      const result = await validate(undocumentedOverrideFixture, true);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Undocumented override'))).toBe(true);
    });

    it('should warn for documented but missing overrides', async () => {
      const result = await validate(documentedButMissingFixture, true);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Documented override not found'))).toBe(true);
    });

    it('should return proper structure', async () => {
      const result = await validate(validFixture, true);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('getQualityStandardCheckResult', () => {
    it('returns pass status for valid project', async () => {
      const result = await getQualityStandardCheckResult(validFixture);
      expect(result.status).toBe('pass');
      expect(result.file_exists).toBe(true);
      expect(result.undocumented_overrides).toHaveLength(0);
    });

    it('returns fail status when file is missing', async () => {
      const result = await getQualityStandardCheckResult(missingFileFixture);
      expect(result.status).toBe('fail');
      expect(result.file_exists).toBe(false);
    });

    it('returns fail status for missing sections', async () => {
      const result = await getQualityStandardCheckResult(missingSectionsFixture);
      expect(result.status).toBe('fail');
      expect(result.missing_sections).toBeDefined();
    });

    it('returns warn status for undocumented overrides', async () => {
      const result = await getQualityStandardCheckResult(undocumentedOverrideFixture);
      expect(result.status).toBe('warn');
      expect(result.undocumented_overrides.length).toBeGreaterThan(0);
    });

    it('returns warn status for orphaned overrides', async () => {
      const result = await getQualityStandardCheckResult(documentedButMissingFixture);
      expect(result.status).toBe('warn');
      expect(result.orphaned_overrides.length).toBeGreaterThan(0);
    });

    it('has correct structure for ci-result.json', async () => {
      const result = await getQualityStandardCheckResult(validFixture);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('file_exists');
      expect(result).toHaveProperty('undocumented_overrides');
      expect(result).toHaveProperty('orphaned_overrides');
      expect(Array.isArray(result.undocumented_overrides)).toBe(true);
      expect(Array.isArray(result.orphaned_overrides)).toBe(true);
    });
  });
});
