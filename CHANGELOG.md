# Changelog

## [2.2.1](https://github.com/kabran-owner/kabran-config/compare/v2.2.0...v2.2.1) (2026-01-15)


### Bug Fixes

* **hooks:** make pre-push hook lightweight by design ([#31](https://github.com/kabran-owner/kabran-config/issues/31)) ([284397a](https://github.com/kabran-owner/kabran-config/commit/284397a37326ab1e633bd15f25a5a9378e570f0d))

## [2.2.0](https://github.com/kabran-owner/kabran-config/compare/v2.1.1...v2.2.0) (2026-01-15)


### Features

* **cli:** add native support for Turbo monorepos ([#29](https://github.com/kabran-owner/kabran-config/issues/29)) ([9ac16ba](https://github.com/kabran-owner/kabran-config/commit/9ac16ba7182fb19cd44e04711d95c3cb852f947d))

## [2.1.1](https://github.com/kabran-owner/kabran-config/compare/v2.1.0...v2.1.1) (2026-01-15)

### Bug Fixes

* **cli:** improve Doppler auto-detection for all configuration methods ([#27](https://github.com/kabran-owner/kabran-config/issues/27)) ([45d28d4](https://github.com/kabran-owner/kabran-config/commit/45d28d458513eb1aa919840caaa98cbfcd6fc9ab))
* **docs:** remove erroneous frontmatter from CHANGELOG ([#26](https://github.com/kabran-owner/kabran-config/issues/26)) ([701afd7](https://github.com/kabran-owner/kabran-config/commit/701afd78a796937f0bf1716bdcab220462e13953))

## [Unreleased]

### Features

* **cli:** add native support for Turbo monorepos ([AGT-1117](https://linear.app/kabran/issue/AGT-1117))
  * Auto-detects `turbo.json` in project root
  * Uses `turbo run` commands for lint, type-check, format, test, and build
  * Integrates with Doppler for secrets injection in Turbo test commands
  * Exposes `turbo` flag in config for consumers to check detection status

### Bug Fixes

* **cli:** improve Doppler auto-detection to support DOPPLER_TOKEN env var and doppler.yaml ([AGT-1116](https://linear.app/kabran/issue/AGT-1116))

## [2.1.0](https://github.com/kabran-owner/kabran-config/compare/v2.0.0...v2.1.0) (2026-01-14)

### Features

* **cli:** add smart tool detection and Doppler integration ([#24](https://github.com/kabran-owner/kabran-config/issues/24)) ([068a1e7](https://github.com/kabran-owner/kabran-config/commit/068a1e7e79f1a0cf1d0e2f29a21d5aced1185240))

## [2.0.0](https://github.com/kabran-owner/kabran-config/compare/v1.12.0...v2.0.0) (2026-01-14)

### ⚠ BREAKING CHANGES

* **security:** Telemetry configuration now requires explicit endpoint setup

### Bug Fixes

* **security:** remove hardcoded internal URLs from public repository ([#22](https://github.com/kabran-owner/kabran-config/issues/22)) ([8cf4aaa](https://github.com/kabran-owner/kabran-config/commit/8cf4aaa089b003508fb89a952c73ae42daf2cf5d))

## [1.12.0](https://github.com/kabran-owner/kabran-config/compare/v1.11.0...v1.12.0) (2026-01-14)

### Features

* **cli:** add unified kabran CLI with quality pyramid levels ([#20](https://github.com/kabran-owner/kabran-config/issues/20)) ([647091c](https://github.com/kabran-owner/kabran-config/commit/647091c1cccfdb5887f6c2bfdb9f534fa590554a))

## [1.11.0](https://github.com/kabran-owner/kabran-config/compare/v1.10.0...v1.11.0) (2026-01-14)

### Features

* **config:** add config-loader and refactor validators to use project config ([#17](https://github.com/kabran-owner/kabran-config/issues/17)) ([915a24d](https://github.com/kabran-owner/kabran-config/commit/915a24d580a6ecf142ec2dca20f8a29e2aa628d4))

## [1.10.0](https://github.com/kabran-owner/kabran-config/compare/v1.9.0...v1.10.0) (2026-01-14)

### Features

* **ci:** export CI metrics to OTel Collector (AGT-1097) ([#15](https://github.com/kabran-owner/kabran-config/issues/15)) ([86527e9](https://github.com/kabran-owner/kabran-config/commit/86527e9e81625c8889e903653d0515384a5a4e40))

## [1.9.0](https://github.com/kabran-owner/kabran-config/compare/v1.8.0...v1.9.0) (2026-01-13)

### Features

* **docs:** add PROP-006 JSDoc traceability tags standard ([#13](https://github.com/kabran-owner/kabran-config/issues/13)) ([0e0e137](https://github.com/kabran-owner/kabran-config/commit/0e0e137ecd526f3fe6f0dfd3f1a68351bcfe49be))

## [1.8.0](https://github.com/kabran-owner/kabran-config/compare/v1.7.0...v1.8.0) (2026-01-13)

### Features

* **ci:** add trace_id generation and telemetry improvements ([#11](https://github.com/kabran-owner/kabran-config/issues/11)) ([8101d1c](https://github.com/kabran-owner/kabran-config/commit/8101d1cae62d1a2bb6d7f5718c6543ee9099da06))

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

## [1.4.0](https://github.com/kabran-owner/kabran-config/compare/v1.3.0...v1.4.0) (2026-01-13)

### Features

* **ci:** add unified ci-result.json v2 schema with timing and quality metrics ([45034f6](https://github.com/kabran-owner/kabran-config/commit/45034f6fa95ab9b14ab4bed8d64101b09ad28ecb))

## [1.3.0] - 2026-01-13

### Added

* **Quality Standard Validator** (PROP-002)
* **Automated Releases with semantic-release**

## [1.2.0] - 2026-01-13

### Added

* **Project Templates & Setup CLI** (PROP-001)

## [1.1.1] - 2026-01-13

### Fixed

* `license:check` false negative when license-checker is installed

## [1.1.0] - 2026-01-13

### Fixed

* Test alignment and critical bug fixes

## [1.0.0] - 2026-01-13

### Added

* Initial public release on npm registry
