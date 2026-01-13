---
title: [1.8.0](https://github.com/kabran-owner/kabran-config/compare/v1.7.0...v1.8.0) (2026-01-13)
id: 01KEWPJKYF92BGEA9FHQB7BNYN
type: guide
status: active
tags: [documentation, guide]
version: 0.1.0
created_at: 2026-01-13
updated_at: 2026-01-13
---

## [1.9.0](https://github.com/kabran-owner/kabran-config/compare/v1.8.0...v1.9.0) (2026-01-13)


### Features

* **docs:** add PROP-006 JSDoc traceability tags standard ([#13](https://github.com/kabran-owner/kabran-config/issues/13)) ([0e0e137](https://github.com/kabran-owner/kabran-config/commit/0e0e137ecd526f3fe6f0dfd3f1a68351bcfe49be))

## [1.8.0](https://github.com/kabran-owner/kabran-config/compare/v1.7.0...v1.8.0) (2026-01-13)


### Features

* **ci:** add trace_id generation and telemetry improvements ([#11](https://github.com/kabran-owner/kabran-config/issues/11)) ([8101d1c](https://github.com/kabran-owner/kabran-config/commit/8101d1cae62d1a2bb6d7f5718c6543ee9099da06))

## [1.8.0](https://github.com/kabran-owner/kabran-config/compare/v1.7.0...v1.8.0) (2026-01-13)

### Features

* **ci:** add automatic trace_id generation for local CI runs (GAP-001)
  * Generate W3C-compliant trace_id when TRACEPARENT is not set
  * Support for OTEL_TRACE_ID and GITHUB_RUN_ID as fallback sources
  * Export TRACEPARENT for subprocess propagation
  * Include trace source in ci-result.json (local/github/otel_env/external)

* **ci:** populate errors_recorded in telemetry extension (GAP-002)
  * Count failed steps as errors_recorded in ci-result.json
  * spans_exported documented as 0 until OTel export is implemented

### Documentation

* **telemetry:** add comprehensive README for telemetry package (GAP-003)
  * Quick start guides for Node.js, Frontend, and Edge runtimes
  * Configuration reference with all environment variables
  * Module reference for all exports
  * Best practices and troubleshooting guide

## [1.7.0](https://github.com/kabran-owner/kabran-config/compare/v1.6.0...v1.7.0) (2026-01-13)

### Features

* **ci:** migrate from semantic-release to release-please ([#9](https://github.com/kabran-owner/kabran-config/issues/9)) ([a676c4d](https://github.com/kabran-owner/kabran-config/commit/a676c4d79fd2a0ccae4b2765df93121a833a1621))
* **telemetry:** add unified telemetry package with OTel integration ([#8](https://github.com/kabran-owner/kabran-config/issues/8)) ([80b0f05](https://github.com/kabran-owner/kabran-config/commit/80b0f05241c88530dee23efcc038ec87b07eaf27))

## [1.6.0](https://github.com/kabran-owner/kabran-config/compare/v1.5.0...v1.6.0) (2026-01-13)

### Features

* **ci:** add scope filtering, coverage aggregation, and PR comment support ([2dbad9c](https://github.com/kabran-owner/kabran-config/commit/2dbad9c0edc0622490c22226b8232a87453ff872))

## [1.5.0](https://github.com/kabran-owner/kabran-config/compare/v1.4.0...v1.5.0) (2026-01-13)

### Features

* **validators:** add JSON output support for all validators ([44165c9](https://github.com/kabran-owner/kabran-config/commit/44165c969b4059a15a05560cad3193aae0781c42))

### Documentation

* add PROP-004 unified CI schema to roadmap ([a7d4762](https://github.com/kabran-owner/kabran-config/commit/a7d4762efb6b891c76f1ae5371da340419679465))

## [1.4.0](https://github.com/kabran-owner/kabran-config/compare/v1.3.0...v1.4.0) (2026-01-13)

### Features

* **ci:** add unified ci-result.json v2 schema with timing and quality metrics ([45034f6](https://github.com/kabran-owner/kabran-config/commit/45034f6fa95ab9b14ab4bed8d64101b09ad28ecb))

### Documentation

* fix CHANGELOG.md formatting after semantic-release ([c51209a](https://github.com/kabran-owner/kabran-config/commit/c51209a9179fffdb13fa13ca91de86d648cf3a9f))
* remove frontmatter from CHANGELOG.md ([af0b668](https://github.com/kabran-owner/kabran-config/commit/af0b6683f9099f14cc8e1766733fbffc83c087b8))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-01-13

### Added

* **Quality Standard Validator** (PROP-002)
  * New `quality-standard-validator.mjs` script to validate `docs/quality/001-quality-standard.md`
  * Validates required sections: Frontmatter, ESLint Rules, Prettier Rules, TypeScript Rules
  * Detects undocumented overrides in ESLint config
  * Detects documented overrides missing from code
  * Integrated with `kabran-setup` CLI - automatically creates quality-standard.md

* **Automated Releases with semantic-release**
  * GitHub Actions workflow for automated npm publishing
  * Automatic version bumping based on conventional commits
  * Automatic CHANGELOG generation
  * GitHub releases created automatically

### Fixed

* Corrected bin path format in package.json

## [1.2.0] - 2026-01-13

### Added

* **Project Templates & Setup CLI** (PROP-001)
  * New `npx kabran-setup` CLI for automated project configuration
  * Templates for GitHub Actions workflows (CI, commitlint, PR validation)
  * Templates for Husky hooks (pre-commit, commit-msg, pre-push)
  * Config file templates using re-export pattern for automatic updates
  * Support for Node.js (`--type=node`), React (`--type=react`), and base projects
  * Sync modes (`--sync-workflows`, `--sync-husky`) for updating existing projects
  * Dry-run mode (`--dry-run`) for previewing changes
  * Force mode (`--force`) for overwriting existing files

* Quality tooling roadmap (`docs/ROADMAP.md`)

## [1.1.1] - 2026-01-13

### Fixed

* `license:check` false negative when license-checker is installed (BUG-001)
  * `license-checker --version` returns exit code 1 even when successful
  * Changed availability check to use `--summary` instead

## [1.1.0] - 2026-01-13

### Fixed

* Test alignment and critical bug fixes
* npm compatibility in monorepo fixture for CI
* package-lock.json sync with peerDependencies

## [1.0.0] - 2026-01-13

### Added

* Initial public release on npm registry
* Base ESLint configuration with flat config support
* Node.js ESLint configuration
* React ESLint configuration
* Prettier configuration
* TypeScript configurations (base, node, react)
* Commitlint configuration
* Lint-staged configuration
* Environment validator script
* README validator script
* License check script
* Dependency report script
* CI/CD standardization scripts (ci-core.sh, ci-runner.sh)
* Deploy scripts (deploy-core.sh, deploy-runner.sh)

### Notes

This package was extracted from the private Kabran monorepo and released as a standalone public package. Version numbering was reset to 1.0.0 for the public release.
