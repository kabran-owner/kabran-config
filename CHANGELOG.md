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
