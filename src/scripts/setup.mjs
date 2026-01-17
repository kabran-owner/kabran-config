#!/usr/bin/env node

/**
 * Project Setup CLI Script
 *
 * Automates the setup of new projects with Kabran quality standards.
 * Copies workflow templates, husky hooks, and creates config files.
 *
 * Usage:
 *   npx kabran-setup [options]
 *
 * Options:
 *   --type=<node|react|base>  Project type (default: node)
 *   --runner=<github|self-hosted>  Runner type (default: github)
 *   --skip-husky              Don't copy husky hooks
 *   --skip-workflows          Don't copy workflow files
 *   --sync-workflows          Overwrite existing workflow files
 *   --sync-husky              Overwrite existing husky hooks
 *   --force                   Overwrite all existing files
 *   --dry-run                 Preview changes without modifying files
 *   --help                    Show this help message
 *
 * Exit codes:
 *   0 - Setup completed successfully
 *   1 - Error occurred
 */

import {existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, chmodSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Log functions for colored output
 */
export function logInfo(message) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

export function logSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

export function logWarn(message) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`);
}

export function logError(message) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

export function logSkip(message) {
  console.log(`${colors.dim}[SKIP]${colors.reset} ${message}`);
}

export function logDry(message) {
  console.log(`${colors.cyan}[DRY-RUN]${colors.reset} ${message}`);
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed options
 */
export function parseArgs(args) {
  const options = {
    type: 'node',
    runner: 'self-hosted',
    skipHusky: false,
    skipWorkflows: false,
    skipQualityStandard: false,
    syncWorkflows: false,
    syncHusky: false,
    force: false,
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--skip-husky') {
      options.skipHusky = true;
    } else if (arg === '--skip-workflows') {
      options.skipWorkflows = true;
    } else if (arg === '--skip-quality-standard') {
      options.skipQualityStandard = true;
    } else if (arg === '--sync-workflows') {
      options.syncWorkflows = true;
    } else if (arg === '--sync-husky') {
      options.syncHusky = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--type=')) {
      const type = arg.split('=')[1];
      if (['node', 'react', 'base'].includes(type)) {
        options.type = type;
      } else {
        logError(`Invalid type: ${type}. Valid options: node, react, base`);
        process.exit(1);
      }
    } else if (arg.startsWith('--runner=')) {
      const runner = arg.split('=')[1];
      if (['github', 'self-hosted'].includes(runner)) {
        options.runner = runner;
      } else {
        logError(`Invalid runner: ${runner}. Valid options: github, self-hosted`);
        process.exit(1);
      }
    }
  }

  return options;
}

/**
 * Print help message
 */
export function printHelp() {
  console.log(`
${colors.cyan}kabran-setup${colors.reset} - Setup Kabran project standards

${colors.yellow}USAGE:${colors.reset}
  npx kabran-setup [options]

${colors.yellow}OPTIONS:${colors.reset}
  --type=<type>           Project type: node, react, base (default: node)
  --runner=<runner>       Runner type: github, self-hosted (default: github)
  --skip-husky            Don't copy husky hooks
  --skip-workflows        Don't copy GitHub workflow files
  --skip-quality-standard Don't create quality-standard.md
  --sync-workflows        Overwrite existing workflow files
  --sync-husky            Overwrite existing husky hooks
  --force                 Overwrite all existing files
  --dry-run               Preview changes without modifying files
  --help, -h              Show this help message

${colors.yellow}EXAMPLES:${colors.reset}
  # Setup Node.js project (default)
  npx kabran-setup

  # Setup React project
  npx kabran-setup --type=react

  # Setup with self-hosted runners (Kosmos CI)
  npx kabran-setup --runner=self-hosted

  # Update workflows only
  npx kabran-setup --sync-workflows

  # Update to self-hosted workflows
  npx kabran-setup --sync-workflows --runner=self-hosted

  # Preview changes without modifying
  npx kabran-setup --dry-run

${colors.yellow}UPDATE STRATEGY:${colors.reset}
  - Config files:   Re-export from kabran-config (auto-update via npm update)
  - Workflows:      Copied once, update with --sync-workflows
  - Husky hooks:    Copied once, update with --sync-husky

${colors.yellow}RUNNER TYPES:${colors.reset}
  - self-hosted:  Kosmos self-hosted runners [self-hosted, linux, x64, docker] (default)
  - github:       Standard GitHub-hosted runners (ubuntu-latest)
`);
}

/**
 * Get the templates directory path
 * @returns {string} Path to templates directory
 */
export function getTemplatesDir() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..', '..', 'templates');
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 * @param {boolean} dryRun - Whether in dry-run mode
 */
export function ensureDir(dirPath, dryRun = false) {
  if (!existsSync(dirPath)) {
    if (dryRun) {
      logDry(`Would create directory: ${dirPath}`);
    } else {
      mkdirSync(dirPath, {recursive: true});
    }
  }
}

/**
 * Copy a file with existence checking
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @param {object} options - Copy options
 * @returns {string} Status: 'created', 'overwritten', 'skipped'
 */
export function copyFile(src, dest, options = {}) {
  const {overwrite = false, dryRun = false, executable = false} = options;
  const exists = existsSync(dest);

  if (exists && !overwrite) {
    if (dryRun) {
      logDry(`Would skip (exists): ${dest}`);
    } else {
      logSkip(`${dest} (already exists)`);
    }
    return 'skipped';
  }

  if (dryRun) {
    if (exists) {
      logDry(`Would overwrite: ${dest}`);
    } else {
      logDry(`Would create: ${dest}`);
    }
    return exists ? 'would_overwrite' : 'would_create';
  }

  ensureDir(dirname(dest), dryRun);
  copyFileSync(src, dest);

  if (executable) {
    chmodSync(dest, 0o755);
  }

  if (exists) {
    logSuccess(`Overwritten: ${dest}`);
    return 'overwritten';
  } else {
    logSuccess(`Created: ${dest}`);
    return 'created';
  }
}

/**
 * Write content to a file with existence checking
 * @param {string} dest - Destination file path
 * @param {string} content - File content
 * @param {object} options - Write options
 * @returns {string} Status: 'created', 'overwritten', 'skipped'
 */
export function writeFile(dest, content, options = {}) {
  const {overwrite = false, dryRun = false} = options;
  const exists = existsSync(dest);

  if (exists && !overwrite) {
    if (dryRun) {
      logDry(`Would skip (exists): ${dest}`);
    } else {
      logSkip(`${dest} (already exists)`);
    }
    return 'skipped';
  }

  if (dryRun) {
    if (exists) {
      logDry(`Would overwrite: ${dest}`);
    } else {
      logDry(`Would create: ${dest}`);
    }
    return exists ? 'would_overwrite' : 'would_create';
  }

  ensureDir(dirname(dest), dryRun);
  writeFileSync(dest, content, 'utf-8');

  if (exists) {
    logSuccess(`Overwritten: ${dest}`);
    return 'overwritten';
  } else {
    logSuccess(`Created: ${dest}`);
    return 'created';
  }
}

/**
 * Setup workflows
 * @param {string} projectDir - Project directory
 * @param {string} templatesDir - Templates directory
 * @param {object} options - Setup options
 * @returns {object} Results
 */
export function setupWorkflows(projectDir, templatesDir, options) {
  const {force = false, dryRun = false, syncWorkflows = false, runner = 'github'} = options;
  const overwrite = force || syncWorkflows;

  const results = {
    created: 0,
    overwritten: 0,
    skipped: 0,
  };

  // CI workflow (always use self-hosted since standard ci.yml was removed)
  const ciWorkflowSrc = 'ci-self-hosted.yml';

  // Map of source file -> destination file
  const workflowFiles = [
    {src: ciWorkflowSrc, dest: 'ci.yml'},
    {src: 'commitlint.yml', dest: 'commitlint.yml'},
    {src: 'validate-pr-source.yml', dest: 'validate-pr-source.yml'},
  ];

  const runnerLabel = runner === 'self-hosted' ? 'self-hosted' : 'GitHub-hosted';
  logInfo(`Setting up GitHub workflows (${runnerLabel} runners)...`);

  for (const file of workflowFiles) {
    const src = join(templatesDir, '.github', 'workflows', file.src);
    const dest = join(projectDir, '.github', 'workflows', file.dest);

    const status = copyFile(src, dest, {overwrite, dryRun});

    if (status === 'created' || status === 'would_create') {
      results.created++;
    } else if (status === 'overwritten' || status === 'would_overwrite') {
      results.overwritten++;
    } else {
      results.skipped++;
    }
  }

  return results;
}

/**
 * Setup husky hooks
 * @param {string} projectDir - Project directory
 * @param {string} templatesDir - Templates directory
 * @param {object} options - Setup options
 * @returns {object} Results
 */
export function setupHusky(projectDir, templatesDir, options) {
  const {force = false, dryRun = false, syncHusky = false} = options;
  const overwrite = force || syncHusky;

  const results = {
    created: 0,
    overwritten: 0,
    skipped: 0,
  };

  const huskyFiles = ['pre-commit', 'commit-msg', 'pre-push'];

  logInfo('Setting up husky hooks...');

  for (const file of huskyFiles) {
    const src = join(templatesDir, '.husky', file);
    const dest = join(projectDir, '.husky', file);

    const status = copyFile(src, dest, {overwrite, dryRun, executable: true});

    if (status === 'created' || status === 'would_create') {
      results.created++;
    } else if (status === 'overwritten' || status === 'would_overwrite') {
      results.overwritten++;
    } else {
      results.skipped++;
    }
  }

  return results;
}

/**
 * Get ESLint config content for project type
 * @param {string} type - Project type (node, react, base)
 * @returns {string} ESLint config content
 */
export function getEslintConfig(type) {
  const configMap = {
    base: `import kabranConfig from '@kabran-tecnologia/kabran-config/eslint';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
];
`,
    node: `import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/node';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
];
`,
    react: `import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/react';

export default [
  ...kabranConfig,
  {
    ignores: ['dist', 'build', 'coverage', 'node_modules'],
  },
];
`,
  };

  return configMap[type] || configMap.node;
}

/**
 * Setup config files
 * @param {string} projectDir - Project directory
 * @param {string} templatesDir - Templates directory
 * @param {object} options - Setup options
 * @returns {object} Results
 */
export function setupConfigs(projectDir, templatesDir, options) {
  const {force = false, dryRun = false, type = 'node'} = options;

  const results = {
    created: 0,
    overwritten: 0,
    skipped: 0,
  };

  logInfo(`Setting up config files (type: ${type})...`);

  // ESLint config (type-specific)
  const eslintContent = getEslintConfig(type);
  const eslintStatus = writeFile(join(projectDir, 'eslint.config.mjs'), eslintContent, {
    overwrite: force,
    dryRun,
  });

  if (eslintStatus === 'created' || eslintStatus === 'would_create') {
    results.created++;
  } else if (eslintStatus === 'overwritten' || eslintStatus === 'would_overwrite') {
    results.overwritten++;
  } else {
    results.skipped++;
  }

  // Other configs (same for all types)
  const otherConfigs = [
    {name: 'prettier.config.mjs', src: 'prettier.config.mjs'},
    {name: '.prettierignore', src: '.prettierignore'},
    {name: 'commitlint.config.mjs', src: 'commitlint.config.mjs'},
    {name: 'lint-staged.config.mjs', src: 'lint-staged.config.mjs'},
  ];

  for (const config of otherConfigs) {
    const src = join(templatesDir, 'config', config.src);
    const dest = join(projectDir, config.name);

    const status = copyFile(src, dest, {overwrite: force, dryRun});

    if (status === 'created' || status === 'would_create') {
      results.created++;
    } else if (status === 'overwritten' || status === 'would_overwrite') {
      results.overwritten++;
    } else {
      results.skipped++;
    }
  }

  return results;
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
export function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get kabran-config version from package.json
 * @returns {string} Package version
 */
export function getPackageVersion() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, '..', '..', 'package.json');

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Setup quality-standard.md
 * @param {string} projectDir - Project directory
 * @param {string} templatesDir - Templates directory
 * @param {object} options - Setup options
 * @returns {object} Results
 */
export function setupQualityStandard(projectDir, templatesDir, options) {
  const {force = false, dryRun = false, type = 'node'} = options;

  const results = {
    created: 0,
    overwritten: 0,
    skipped: 0,
  };

  logInfo('Setting up quality-standard.md...');

  const src = join(templatesDir, 'docs', 'quality', '001-quality-standard.md');
  const dest = join(projectDir, 'docs', 'quality', '001-quality-standard.md');

  // Check if source template exists
  if (!existsSync(src)) {
    logWarn('Template not found: templates/docs/quality/001-quality-standard.md');
    return results;
  }

  // Check if destination exists
  const destExists = existsSync(dest);

  if (destExists && !force) {
    if (dryRun) {
      logDry(`Would skip (exists): ${dest}`);
    } else {
      logSkip(`docs/quality/001-quality-standard.md (already exists)`);
    }
    results.skipped = 1;
    return results;
  }

  if (dryRun) {
    if (destExists) {
      logDry(`Would overwrite: docs/quality/001-quality-standard.md`);
      results.overwritten = 1;
    } else {
      logDry(`Would create: docs/quality/001-quality-standard.md`);
      results.created = 1;
    }
    return results;
  }

  // Read template and replace placeholders
  let content = readFileSync(src, 'utf-8');
  const currentDate = getCurrentDate();
  const version = getPackageVersion();

  // Replace placeholders
  content = content.replace(/YYYY-MM-DD/g, currentDate);
  content = content.replace(/X\.Y\.Z/g, version);
  content = content.replace(/node \/ react \/ base/g, type);

  // Ensure directory exists and write file
  ensureDir(dirname(dest), dryRun);
  writeFileSync(dest, content, 'utf-8');

  if (destExists) {
    logSuccess(`Overwritten: docs/quality/001-quality-standard.md`);
    results.overwritten = 1;
  } else {
    logSuccess(`Created: docs/quality/001-quality-standard.md`);
    results.created = 1;
  }

  return results;
}


/**
 * Run setup
 * @param {string} projectDir - Project directory
 * @param {object} options - Setup options
 * @returns {object} Results summary
 */
export function runSetup(projectDir, options) {
  const templatesDir = getTemplatesDir();

  const summary = {
    workflows: {created: 0, overwritten: 0, skipped: 0},
    husky: {created: 0, overwritten: 0, skipped: 0},
    configs: {created: 0, overwritten: 0, skipped: 0},
    qualityStandard: {created: 0, overwritten: 0, skipped: 0},
  };

  console.log('');
  logInfo(`Setting up project at: ${projectDir}`);
  logInfo(`Project type: ${options.type}`);
  logInfo(`Runner type: ${options.runner}`);
  if (options.dryRun) {
    logWarn('DRY-RUN MODE - No files will be modified');
  }
  console.log('');

  // Setup workflows (unless skipped or in sync mode for other things)
  const isSyncMode = options.syncWorkflows || options.syncHusky;

  if (!options.skipWorkflows && (!isSyncMode || options.syncWorkflows)) {
    summary.workflows = setupWorkflows(projectDir, templatesDir, options);
    console.log('');
  }

  // Setup husky (unless skipped or in sync mode for other things)
  if (!options.skipHusky && (!isSyncMode || options.syncHusky)) {
    summary.husky = setupHusky(projectDir, templatesDir, options);
    console.log('');
  }

  // Setup configs (unless in sync mode)
  if (!isSyncMode) {
    summary.configs = setupConfigs(projectDir, templatesDir, options);
    console.log('');
  }

  // Setup quality-standard.md (unless skipped or in sync mode)
  if (!options.skipQualityStandard && !isSyncMode) {
    summary.qualityStandard = setupQualityStandard(projectDir, templatesDir, options);
    console.log('');
  }

  return summary;
}

/**
 * Print summary
 * @param {object} summary - Results summary
 */
export function printSummary(summary) {
  console.log('');
  console.log(`${colors.cyan}=== Setup Summary ===${colors.reset}`);

  const total = {
    created: summary.workflows.created + summary.husky.created + summary.configs.created + summary.qualityStandard.created,
    overwritten:
      summary.workflows.overwritten + summary.husky.overwritten + summary.configs.overwritten + summary.qualityStandard.overwritten,
    skipped: summary.workflows.skipped + summary.husky.skipped + summary.configs.skipped + summary.qualityStandard.skipped,
  };

  if (total.created > 0) {
    console.log(`  ${colors.green}Created:${colors.reset} ${total.created} files`);
  }
  if (total.overwritten > 0) {
    console.log(`  ${colors.yellow}Overwritten:${colors.reset} ${total.overwritten} files`);
  }
  if (total.skipped > 0) {
    console.log(`  ${colors.dim}Skipped:${colors.reset} ${total.skipped} files`);
  }

  console.log('');
}

/**
 * Main execution
 */
export async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const projectDir = process.cwd();

  try {
    const summary = runSetup(projectDir, options);
    printSummary(summary);

    if (!options.dryRun) {
      logSuccess('Setup complete!');
      console.log('');
      console.log(`${colors.yellow}Next steps:${colors.reset}`);
      console.log('  1. Run: npm install');
      console.log('  2. Run: npx husky init (if not already initialized)');
      console.log('  3. Commit your changes');
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Only run main() when script is executed directly (not when imported as module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
