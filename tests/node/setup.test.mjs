import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {existsSync, mkdirSync, rmSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

import {
  parseArgs,
  getTemplatesDir,
  ensureDir,
  copyFile,
  writeFile,
  setupWorkflows,
  setupHusky,
  setupConfigs,
  setupQualityStandard,
  getCurrentDate,
  getPackageVersion,
  runSetup,
  getEslintConfig,
} from '../../src/scripts/setup.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = join(__dirname, '..', 'fixtures');
const tempDir = join(__dirname, '..', 'temp-setup-test');

describe('setup CLI', () => {
  // Clean up temp directory before/after tests
  beforeEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, {recursive: true});
    }
    mkdirSync(tempDir, {recursive: true});
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, {recursive: true});
    }
  });

  describe('parseArgs', () => {
    it('should return default options when no args', () => {
      const options = parseArgs([]);
      expect(options.type).toBe('node');
      expect(options.skipHusky).toBe(false);
      expect(options.skipWorkflows).toBe(false);
      expect(options.syncWorkflows).toBe(false);
      expect(options.syncHusky).toBe(false);
      expect(options.force).toBe(false);
      expect(options.dryRun).toBe(false);
      expect(options.help).toBe(false);
    });

    it('should parse --type=react', () => {
      const options = parseArgs(['--type=react']);
      expect(options.type).toBe('react');
    });

    it('should parse --type=node', () => {
      const options = parseArgs(['--type=node']);
      expect(options.type).toBe('node');
    });

    it('should parse --type=base', () => {
      const options = parseArgs(['--type=base']);
      expect(options.type).toBe('base');
    });

    it('should parse --skip-husky', () => {
      const options = parseArgs(['--skip-husky']);
      expect(options.skipHusky).toBe(true);
    });

    it('should parse --skip-workflows', () => {
      const options = parseArgs(['--skip-workflows']);
      expect(options.skipWorkflows).toBe(true);
    });

    it('should parse --sync-workflows', () => {
      const options = parseArgs(['--sync-workflows']);
      expect(options.syncWorkflows).toBe(true);
    });

    it('should parse --sync-husky', () => {
      const options = parseArgs(['--sync-husky']);
      expect(options.syncHusky).toBe(true);
    });

    it('should parse --force', () => {
      const options = parseArgs(['--force']);
      expect(options.force).toBe(true);
    });

    it('should parse --dry-run', () => {
      const options = parseArgs(['--dry-run']);
      expect(options.dryRun).toBe(true);
    });

    it('should parse --help', () => {
      const options = parseArgs(['--help']);
      expect(options.help).toBe(true);
    });

    it('should parse -h as help', () => {
      const options = parseArgs(['-h']);
      expect(options.help).toBe(true);
    });

    it('should parse multiple options', () => {
      const options = parseArgs(['--type=react', '--skip-husky', '--dry-run']);
      expect(options.type).toBe('react');
      expect(options.skipHusky).toBe(true);
      expect(options.dryRun).toBe(true);
    });
  });

  describe('getTemplatesDir', () => {
    it('should return valid templates directory', () => {
      const templatesDir = getTemplatesDir();
      expect(existsSync(templatesDir)).toBe(true);
    });

    it('should contain workflow templates', () => {
      const templatesDir = getTemplatesDir();
      expect(existsSync(join(templatesDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    });

    it('should contain husky templates', () => {
      const templatesDir = getTemplatesDir();
      expect(existsSync(join(templatesDir, '.husky', 'pre-commit'))).toBe(true);
    });

    it('should contain config templates', () => {
      const templatesDir = getTemplatesDir();
      expect(existsSync(join(templatesDir, 'config', 'prettier.config.mjs'))).toBe(true);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if not exists', () => {
      const testDir = join(tempDir, 'new-dir');
      expect(existsSync(testDir)).toBe(false);
      ensureDir(testDir);
      expect(existsSync(testDir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      const testDir = join(tempDir, 'existing-dir');
      mkdirSync(testDir, {recursive: true});
      expect(() => ensureDir(testDir)).not.toThrow();
    });

    it('should not create directory in dry-run mode', () => {
      const testDir = join(tempDir, 'dry-run-dir');
      ensureDir(testDir, true);
      expect(existsSync(testDir)).toBe(false);
    });
  });

  describe('copyFile', () => {
    const srcFile = join(tempDir, 'source.txt');
    const destFile = join(tempDir, 'dest.txt');

    beforeEach(() => {
      writeFileSync(srcFile, 'test content');
    });

    it('should copy file to destination', () => {
      const status = copyFile(srcFile, destFile);
      expect(status).toBe('created');
      expect(existsSync(destFile)).toBe(true);
      expect(readFileSync(destFile, 'utf-8')).toBe('test content');
    });

    it('should skip existing file without overwrite', () => {
      writeFileSync(destFile, 'existing content');
      const status = copyFile(srcFile, destFile);
      expect(status).toBe('skipped');
      expect(readFileSync(destFile, 'utf-8')).toBe('existing content');
    });

    it('should overwrite existing file with overwrite option', () => {
      writeFileSync(destFile, 'existing content');
      const status = copyFile(srcFile, destFile, {overwrite: true});
      expect(status).toBe('overwritten');
      expect(readFileSync(destFile, 'utf-8')).toBe('test content');
    });

    it('should not copy in dry-run mode', () => {
      const status = copyFile(srcFile, destFile, {dryRun: true});
      expect(status).toBe('would_create');
      expect(existsSync(destFile)).toBe(false);
    });

    it('should return would_overwrite in dry-run mode for existing file', () => {
      writeFileSync(destFile, 'existing content');
      const status = copyFile(srcFile, destFile, {dryRun: true, overwrite: true});
      expect(status).toBe('would_overwrite');
    });

    it('should create parent directories', () => {
      const nestedDest = join(tempDir, 'nested', 'dir', 'file.txt');
      copyFile(srcFile, nestedDest);
      expect(existsSync(nestedDest)).toBe(true);
    });
  });

  describe('writeFile', () => {
    const destFile = join(tempDir, 'write-dest.txt');
    const content = 'written content';

    it('should write content to file', () => {
      const status = writeFile(destFile, content);
      expect(status).toBe('created');
      expect(existsSync(destFile)).toBe(true);
      expect(readFileSync(destFile, 'utf-8')).toBe(content);
    });

    it('should skip existing file without overwrite', () => {
      writeFileSync(destFile, 'existing');
      const status = writeFile(destFile, content);
      expect(status).toBe('skipped');
      expect(readFileSync(destFile, 'utf-8')).toBe('existing');
    });

    it('should overwrite existing file with overwrite option', () => {
      writeFileSync(destFile, 'existing');
      const status = writeFile(destFile, content, {overwrite: true});
      expect(status).toBe('overwritten');
      expect(readFileSync(destFile, 'utf-8')).toBe(content);
    });

    it('should not write in dry-run mode', () => {
      const status = writeFile(destFile, content, {dryRun: true});
      expect(status).toBe('would_create');
      expect(existsSync(destFile)).toBe(false);
    });
  });

  describe('getEslintConfig', () => {
    it('should return node config for type=node', () => {
      const config = getEslintConfig('node');
      expect(config).toContain("@kabran-tecnologia/kabran-config/eslint/node");
    });

    it('should return react config for type=react', () => {
      const config = getEslintConfig('react');
      expect(config).toContain("@kabran-tecnologia/kabran-config/eslint/react");
    });

    it('should return base config for type=base', () => {
      const config = getEslintConfig('base');
      expect(config).toContain("@kabran-tecnologia/kabran-config/eslint'");
      expect(config).not.toContain('/node');
      expect(config).not.toContain('/react');
    });

    it('should default to node config for unknown type', () => {
      const config = getEslintConfig('unknown');
      expect(config).toContain("@kabran-tecnologia/kabran-config/eslint/node");
    });
  });

  describe('setupWorkflows', () => {
    const templatesDir = getTemplatesDir();

    it('should create all workflow files', () => {
      const results = setupWorkflows(tempDir, templatesDir, {});

      expect(results.created).toBe(3);
      expect(existsSync(join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
      expect(existsSync(join(tempDir, '.github', 'workflows', 'commitlint.yml'))).toBe(true);
      expect(existsSync(join(tempDir, '.github', 'workflows', 'validate-pr-source.yml'))).toBe(
        true
      );
    });

    it('should skip existing workflow files', () => {
      // Create existing workflow
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');

      const results = setupWorkflows(tempDir, templatesDir, {});

      expect(results.skipped).toBe(1);
      expect(results.created).toBe(2);
      expect(readFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'utf-8')).toBe(
        'existing'
      );
    });

    it('should overwrite with --sync-workflows', () => {
      // Create existing workflow
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');

      const results = setupWorkflows(tempDir, templatesDir, {syncWorkflows: true});

      expect(results.overwritten).toBe(1);
      expect(results.created).toBe(2);
      expect(readFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'utf-8')).not.toBe(
        'existing'
      );
    });

    it('should overwrite with --force', () => {
      // Create existing workflow
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');

      const results = setupWorkflows(tempDir, templatesDir, {force: true});

      expect(results.overwritten).toBe(1);
      expect(results.created).toBe(2);
    });

    it('should not modify files in dry-run mode', () => {
      const results = setupWorkflows(tempDir, templatesDir, {dryRun: true});

      expect(results.created).toBe(3);
      expect(existsSync(join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(false);
    });
  });

  describe('setupHusky', () => {
    const templatesDir = getTemplatesDir();

    it('should create all husky files', () => {
      const results = setupHusky(tempDir, templatesDir, {});

      expect(results.created).toBe(3);
      expect(existsSync(join(tempDir, '.husky', 'pre-commit'))).toBe(true);
      expect(existsSync(join(tempDir, '.husky', 'commit-msg'))).toBe(true);
      expect(existsSync(join(tempDir, '.husky', 'pre-push'))).toBe(true);
    });

    it('should skip existing husky files', () => {
      // Create existing hook
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');

      const results = setupHusky(tempDir, templatesDir, {});

      expect(results.skipped).toBe(1);
      expect(results.created).toBe(2);
      expect(readFileSync(join(tempDir, '.husky', 'pre-commit'), 'utf-8')).toBe('existing');
    });

    it('should overwrite with --sync-husky', () => {
      // Create existing hook
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');

      const results = setupHusky(tempDir, templatesDir, {syncHusky: true});

      expect(results.overwritten).toBe(1);
      expect(results.created).toBe(2);
      expect(readFileSync(join(tempDir, '.husky', 'pre-commit'), 'utf-8')).not.toBe('existing');
    });

    it('should overwrite with --force', () => {
      // Create existing hook
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');

      const results = setupHusky(tempDir, templatesDir, {force: true});

      expect(results.overwritten).toBe(1);
      expect(results.created).toBe(2);
    });

    it('should not modify files in dry-run mode', () => {
      const results = setupHusky(tempDir, templatesDir, {dryRun: true});

      expect(results.created).toBe(3);
      expect(existsSync(join(tempDir, '.husky', 'pre-commit'))).toBe(false);
    });
  });

  describe('setupConfigs', () => {
    const templatesDir = getTemplatesDir();

    it('should create all config files', () => {
      const results = setupConfigs(tempDir, templatesDir, {type: 'node'});

      expect(results.created).toBe(5);
      expect(existsSync(join(tempDir, 'eslint.config.mjs'))).toBe(true);
      expect(existsSync(join(tempDir, 'prettier.config.mjs'))).toBe(true);
      expect(existsSync(join(tempDir, '.prettierignore'))).toBe(true);
      expect(existsSync(join(tempDir, 'commitlint.config.mjs'))).toBe(true);
      expect(existsSync(join(tempDir, 'lint-staged.config.mjs'))).toBe(true);
    });

    it('should use node eslint config for type=node', () => {
      setupConfigs(tempDir, templatesDir, {type: 'node'});

      const content = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');
      expect(content).toContain('@kabran-tecnologia/kabran-config/eslint/node');
    });

    it('should use react eslint config for type=react', () => {
      setupConfigs(tempDir, templatesDir, {type: 'react'});

      const content = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');
      expect(content).toContain('@kabran-tecnologia/kabran-config/eslint/react');
    });

    it('should use base eslint config for type=base', () => {
      setupConfigs(tempDir, templatesDir, {type: 'base'});

      const content = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');
      expect(content).toContain("@kabran-tecnologia/kabran-config/eslint'");
      expect(content).not.toContain('/node');
      expect(content).not.toContain('/react');
    });

    it('should skip existing config files', () => {
      writeFileSync(join(tempDir, 'eslint.config.mjs'), 'existing');

      const results = setupConfigs(tempDir, templatesDir, {type: 'node'});

      expect(results.skipped).toBe(1);
      expect(results.created).toBe(4);
      expect(readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8')).toBe('existing');
    });

    it('should overwrite with --force', () => {
      writeFileSync(join(tempDir, 'eslint.config.mjs'), 'existing');

      const results = setupConfigs(tempDir, templatesDir, {type: 'node', force: true});

      expect(results.overwritten).toBe(1);
      expect(results.created).toBe(4);
      expect(readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8')).not.toBe('existing');
    });

    it('should not modify files in dry-run mode', () => {
      const results = setupConfigs(tempDir, templatesDir, {type: 'node', dryRun: true});

      expect(results.created).toBe(5);
      expect(existsSync(join(tempDir, 'eslint.config.mjs'))).toBe(false);
    });
  });

  describe('runSetup', () => {
    it('should setup complete project in empty directory', () => {
      const summary = runSetup(tempDir, {type: 'node'});

      expect(summary.workflows.created).toBe(3);
      expect(summary.husky.created).toBe(3);
      expect(summary.configs.created).toBe(5);
    });

    it('should skip existing files by default', () => {
      // Create existing files
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');
      writeFileSync(join(tempDir, 'eslint.config.mjs'), 'existing');

      const summary = runSetup(tempDir, {type: 'node'});

      expect(summary.workflows.skipped).toBe(1);
      expect(summary.husky.skipped).toBe(1);
      expect(summary.configs.skipped).toBe(1);
    });

    it('should skip husky with --skip-husky', () => {
      const summary = runSetup(tempDir, {type: 'node', skipHusky: true});

      expect(summary.workflows.created).toBe(3);
      expect(summary.husky.created).toBe(0);
      expect(summary.configs.created).toBe(5);
    });

    it('should skip workflows with --skip-workflows', () => {
      const summary = runSetup(tempDir, {type: 'node', skipWorkflows: true});

      expect(summary.workflows.created).toBe(0);
      expect(summary.husky.created).toBe(3);
      expect(summary.configs.created).toBe(5);
    });

    it('should only sync workflows with --sync-workflows', () => {
      // Create existing files
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');

      const summary = runSetup(tempDir, {type: 'node', syncWorkflows: true});

      // Workflows should be synced
      expect(summary.workflows.overwritten).toBe(1);
      expect(summary.workflows.created).toBe(2);
      // Husky and configs should be skipped in sync mode
      expect(summary.husky.created).toBe(0);
      expect(summary.configs.created).toBe(0);
    });

    it('should only sync husky with --sync-husky', () => {
      // Create existing files
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');

      const summary = runSetup(tempDir, {type: 'node', syncHusky: true});

      // Husky should be synced
      expect(summary.husky.overwritten).toBe(1);
      expect(summary.husky.created).toBe(2);
      // Workflows and configs should be skipped in sync mode
      expect(summary.workflows.created).toBe(0);
      expect(summary.configs.created).toBe(0);
    });

    it('should overwrite all with --force', () => {
      // Create existing files
      mkdirSync(join(tempDir, '.github', 'workflows'), {recursive: true});
      writeFileSync(join(tempDir, '.github', 'workflows', 'ci.yml'), 'existing');
      mkdirSync(join(tempDir, '.husky'), {recursive: true});
      writeFileSync(join(tempDir, '.husky', 'pre-commit'), 'existing');
      writeFileSync(join(tempDir, 'eslint.config.mjs'), 'existing');

      const summary = runSetup(tempDir, {type: 'node', force: true});

      expect(summary.workflows.overwritten).toBe(1);
      expect(summary.husky.overwritten).toBe(1);
      expect(summary.configs.overwritten).toBe(1);
    });

    it('should not modify files with --dry-run', () => {
      const summary = runSetup(tempDir, {type: 'node', dryRun: true});

      expect(summary.workflows.created).toBe(3);
      expect(summary.husky.created).toBe(3);
      expect(summary.configs.created).toBe(5);

      // No files should be created
      expect(existsSync(join(tempDir, '.github'))).toBe(false);
      expect(existsSync(join(tempDir, '.husky'))).toBe(false);
      expect(existsSync(join(tempDir, 'eslint.config.mjs'))).toBe(false);
    });

    it('should use correct template for --type=react', () => {
      runSetup(tempDir, {type: 'react'});

      const content = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');
      expect(content).toContain('@kabran-tecnologia/kabran-config/eslint/react');
    });

    it('should use correct template for --type=node', () => {
      runSetup(tempDir, {type: 'node'});

      const content = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');
      expect(content).toContain('@kabran-tecnologia/kabran-config/eslint/node');
    });

    it('should be idempotent (running twice produces same result)', () => {
      // First run
      runSetup(tempDir, {type: 'node'});
      const firstContent = readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8');

      // Second run
      const summary = runSetup(tempDir, {type: 'node'});

      // Should skip everything
      expect(summary.workflows.skipped).toBe(3);
      expect(summary.husky.skipped).toBe(3);
      expect(summary.configs.skipped).toBe(5);
      expect(summary.qualityStandard.skipped).toBe(1);

      // Content should be the same
      expect(readFileSync(join(tempDir, 'eslint.config.mjs'), 'utf-8')).toBe(firstContent);
    });

    it('should create quality-standard.md by default', () => {
      const summary = runSetup(tempDir, {type: 'node'});

      expect(summary.qualityStandard.created).toBe(1);
      expect(existsSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'))).toBe(true);
    });

    it('should skip quality-standard with --skip-quality-standard', () => {
      const summary = runSetup(tempDir, {type: 'node', skipQualityStandard: true});

      expect(summary.qualityStandard.created).toBe(0);
      expect(summary.qualityStandard.skipped).toBe(0);
      expect(existsSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'))).toBe(false);
    });
  });

  describe('parseArgs with --skip-quality-standard', () => {
    it('should parse --skip-quality-standard', () => {
      const options = parseArgs(['--skip-quality-standard']);
      expect(options.skipQualityStandard).toBe(true);
    });

    it('should default skipQualityStandard to false', () => {
      const options = parseArgs([]);
      expect(options.skipQualityStandard).toBe(false);
    });
  });

  describe('getCurrentDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = getCurrentDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getPackageVersion', () => {
    it('should return a valid version string', () => {
      const version = getPackageVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('setupQualityStandard', () => {
    const templatesDir = getTemplatesDir();

    it('should create quality-standard.md', () => {
      const results = setupQualityStandard(tempDir, templatesDir, {type: 'node'});

      expect(results.created).toBe(1);
      expect(existsSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'))).toBe(true);
    });

    it('should replace YYYY-MM-DD placeholder with actual date', () => {
      setupQualityStandard(tempDir, templatesDir, {type: 'node'});

      const content = readFileSync(
        join(tempDir, 'docs', 'quality', '001-quality-standard.md'),
        'utf-8'
      );
      expect(content).not.toContain('YYYY-MM-DD');
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should replace X.Y.Z placeholder with version', () => {
      setupQualityStandard(tempDir, templatesDir, {type: 'node'});

      const content = readFileSync(
        join(tempDir, 'docs', 'quality', '001-quality-standard.md'),
        'utf-8'
      );
      expect(content).not.toContain('X.Y.Z');
    });

    it('should replace preset placeholder with type', () => {
      setupQualityStandard(tempDir, templatesDir, {type: 'react'});

      const content = readFileSync(
        join(tempDir, 'docs', 'quality', '001-quality-standard.md'),
        'utf-8'
      );
      expect(content).toContain('react');
      expect(content).not.toContain('node / react / base');
    });

    it('should skip existing file without force', () => {
      // Create existing file
      mkdirSync(join(tempDir, 'docs', 'quality'), {recursive: true});
      writeFileSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'), 'existing');

      const results = setupQualityStandard(tempDir, templatesDir, {type: 'node'});

      expect(results.skipped).toBe(1);
      expect(
        readFileSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'), 'utf-8')
      ).toBe('existing');
    });

    it('should overwrite with --force', () => {
      // Create existing file
      mkdirSync(join(tempDir, 'docs', 'quality'), {recursive: true});
      writeFileSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'), 'existing');

      const results = setupQualityStandard(tempDir, templatesDir, {type: 'node', force: true});

      expect(results.overwritten).toBe(1);
      expect(
        readFileSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'), 'utf-8')
      ).not.toBe('existing');
    });

    it('should not create file in dry-run mode', () => {
      const results = setupQualityStandard(tempDir, templatesDir, {type: 'node', dryRun: true});

      expect(results.created).toBe(1);
      expect(existsSync(join(tempDir, 'docs', 'quality', '001-quality-standard.md'))).toBe(false);
    });
  });

});
