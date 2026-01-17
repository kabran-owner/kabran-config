# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all tests (shell + node)
npm test

# Run only shell tests (BATS)
npm run test:shell

# Run only node tests (Vitest)
npm run test:node

# Run single shell test file
npx bats tests/shell/ci-core.bats

# Run single node test file
npx vitest run tests/node/license-check.test.mjs

# Watch mode for node tests
npm run test:watch
```

## Architecture

This package provides shared configurations and enforcement scripts for Kabran projects.

### Structure

```
src/
├── eslint.mjs          # Base ESLint config (TypeScript)
├── eslint-node.mjs     # Node.js ESLint (extends base, allows console)
├── eslint-react.mjs    # React ESLint (extends base, adds hooks/a11y)
├── prettier.mjs        # Prettier config
├── commitlint.mjs      # Conventional commits config
├── lint-staged.mjs     # Pre-commit lint config
├── tsconfig.*.json     # TypeScript configs (base, node, react)
├── schemas/            # JSON schemas (CI result format)
└── scripts/
    ├── license-check.mjs       # Scans for prohibited licenses (GPL/AGPL)
    ├── dependency-report.mjs   # Reports outdated dependencies
    ├── readme-validator.mjs    # Validates README structure
    ├── env-validator.mjs       # Validates .env.example exists
    ├── quality-standard-validator.mjs  # Validates quality doc
    ├── setup.mjs               # Project setup script
    ├── generate-ci-result.mjs  # Generates CI result JSON
    ├── ci-result-*.mjs         # CI result utilities
    ├── pr-quality-comment.mjs  # PR comment generator
    ├── ci/                     # CI pipeline runner (bash)
    │   ├── ci-core.sh          # Core functions (run_step, logging)
    │   └── ci-runner.sh        # Pipeline orchestrator
    ├── deploy/                 # Deploy orchestrator (bash)
    │   ├── deploy-core.sh      # Core deployment functions
    │   └── deploy-runner.sh    # Deployment orchestrator
    └── traceability/           # Traceability scripts
```

### Testing

Two test frameworks:

- **Vitest** - Tests Node.js scripts (`.mjs` files) in `tests/node/`
- **BATS** - Tests shell scripts (`.sh` files) in `tests/shell/`

Test fixtures are in `tests/fixtures/` with mock projects for different scenarios.

### Exports

Package exports are defined in `package.json` under `exports`. Consumers use paths like:

- `@kabran-tecnologia/kabran-config/eslint`
- `@kabran-tecnologia/kabran-config/eslint/node`
- `@kabran-tecnologia/kabran-config/tsconfig/react`

### CI/CD Scripts Pattern

The CI and deploy scripts follow a runner + config pattern:

1. **Core** (`ci-core.sh`, `deploy-core.sh`) - Reusable functions
2. **Runner** (`ci-runner.sh`, `deploy-runner.sh`) - Orchestration logic
3. **Config** (project-specific `ci-config.sh` or `deploy.json`) - Project defines steps

Projects create thin wrappers that set environment variables and call the runner.

## Release Process

**Always update CHANGELOG.md** when making changes that will be released. Follow [Keep a Changelog](https://keepachangelog.com/) format.

**Never publish without asking the user first.** After completing a fix or feature:

1. Update `CHANGELOG.md` with the new version entry
2. Update `package.json` version
3. Ask the user: "Quer que eu publique o release X.X.X no npm?"
4. Only run `npm publish` after explicit user confirmation
