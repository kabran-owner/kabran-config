## [1.3.0](https://github.com/kabran-owner/kabran-config/compare/v1.2.0...v1.3.0) (2026-01-13)

### Features

* **ci:** add semantic-release for automated publishing ([f68544f](https://github.com/kabran-owner/kabran-config/commit/f68544f482b4a321c9a4318895ee7f3c7bc76813))
* **quality:** add quality-standard validator and setup integration ([e5d47c8](https://github.com/kabran-owner/kabran-config/commit/e5d47c8a926c1a1fc5f1854ae0198da1ebaa0984))

### Bug Fixes

* **package:** correct bin path format ([9896540](https://github.com/kabran-owner/kabran-config/commit/9896540922888b5785c07071b3e4261cd09518c1))

---
title: Changelog
id: 01KEVM0N6F3JRF4VSXFJ7AN9ST
type: guide
status: active
tags: [documentation, guide, react, typescript]
version: 0.1.0
created_at: 2026-01-13
updated_at: 2026-01-13
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-13

### Added

- **Project Templates & Setup CLI** (PROP-001)
  - New `npx kabran-setup` CLI for automated project configuration
  - Templates for GitHub Actions workflows (CI, commitlint, PR validation)
  - Templates for Husky hooks (pre-commit, commit-msg, pre-push)
  - Config file templates using re-export pattern for automatic updates
  - Support for Node.js (`--type=node`), React (`--type=react`), and base projects
  - Sync modes (`--sync-workflows`, `--sync-husky`) for updating existing projects
  - Dry-run mode (`--dry-run`) for previewing changes
  - Force mode (`--force`) for overwriting existing files

- Quality tooling roadmap (`docs/ROADMAP.md`)

## [1.1.1] - 2026-01-13

### Fixed

- `license:check` false negative when license-checker is installed (BUG-001)
  - `license-checker --version` returns exit code 1 even when successful
  - Changed availability check to use `--summary` instead

## [1.1.0] - 2026-01-13

### Fixed

- Test alignment and critical bug fixes
- npm compatibility in monorepo fixture for CI
- package-lock.json sync with peerDependencies

## [1.0.0] - 2026-01-13

### Added

- Initial public release on npm registry
- Base ESLint configuration with flat config support
- Node.js ESLint configuration
- React ESLint configuration
- Prettier configuration
- TypeScript configurations (base, node, react)
- Commitlint configuration
- Lint-staged configuration
- Environment validator script
- README validator script
- License check script
- Dependency report script
- CI/CD standardization scripts (ci-core.sh, ci-runner.sh)
- Deploy scripts (deploy-core.sh, deploy-runner.sh)

### Notes

This package was extracted from the private Kabran monorepo and released as a standalone public package. Version numbering was reset to 1.0.0 for the public release.
