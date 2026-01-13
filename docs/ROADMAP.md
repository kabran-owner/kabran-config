---
title: Roadmap: Quality Tooling
id: 01KEW1S1DY2Y6247E4B4D62PR8
type: standard
status: active
tags: [guidelines, standard]
version: 0.2.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# Roadmap: Quality Tooling

> Sequencia de implementacao das melhorias de qualidade do kabran-config.

## Overview

```
PROP-001 (v1.2.0)  →  PROP-002 (v1.3.0)  →  PROP-003/004 (v1.4.0-1.6.0)  →  PROP-005 (v1.7.0+)
┌─────────────┐       ┌─────────────┐       ┌─────────────────────┐         ┌─────────────────┐
│  Setup CLI  │  →    │  Quality    │  →    │  CI Observability   │    →    │   Telemetry     │
│  Templates  │       │  Standard   │       │  Unified Schema     │         │   Package       │
└─────────────┘       └─────────────┘       └─────────────────────┘         └─────────────────┘
     ✅                    ✅                        ✅                           Draft
```

---

## Phase 1: PROP-001 - Project Templates & Setup CLI ✅

**Target:** v1.2.0
**Status:** Completed
**Proposta:** [PROP-001-project-templates.md](./proposals/PROP-001-project-templates.md)

### Summary

- [x] Estrutura de templates (workflows, husky, configs)
- [x] Setup CLI com flags (`--type`, `--skip-*`, `--sync-*`, `--force`, `--dry-run`)
- [x] Package configuration (bin, exports, files)
- [x] Testes completos
- [x] Documentacao

---

## Phase 2: PROP-002 - Quality Standard Artifact ✅

**Target:** v1.3.0
**Status:** Completed
**Depende de:** PROP-001
**Proposta:** [PROP-002-quality-standard-artifact.md](./proposals/PROP-002-quality-standard-artifact.md)

### Summary

- [x] Template `templates/docs/quality/001-quality-standard.md`
- [x] Validator `quality-standard-validator.mjs`
- [x] Integracao com Setup CLI
- [x] Testes completos
- [x] Documentacao

---

## Phase 3: PROP-003/004 - Unified CI Result Schema ✅

**Target:** v1.4.0 → v1.6.0
**Status:** Completed (PR #7 pending merge for v1.6.0)
**Propostas:**

- [PROP-003-quality-status-automation.md](./proposals/PROP-003-quality-status-automation.md) (superseded)
- [PROP-004-ci-observability-metrics.md](./proposals/PROP-004-ci-observability-metrics.md)

> Unifica PROP-003 (Quality Status) e PROP-004 (CI Observability) em um schema unico e flexivel.

### 3.1 Schema & Core (v1.4.0) ✅

- [x] JSON Schema formal `ci-result.v2.schema.json`
- [x] `generate-ci-result.mjs` - gerador do JSON
- [x] `ci-result-utils.mjs` - score, status, formatters
- [x] `ci-core.sh` - timing por step
- [x] `ci-runner.sh` - geracao JSON via node script
- [x] Testes unitarios

### 3.2 Validators Integration (v1.5.0) ✅

- [x] `--json` em `license-check.mjs`
- [x] Export JSON em `readme-validator.mjs`
- [x] Export JSON em `env-validator.mjs`
- [x] Export JSON em `quality-standard-validator.mjs`
- [x] Integracao validators no `generate-ci-result.mjs`
- [x] Testes unitarios para JSON outputs

### 3.3 CI Integration (v1.6.0) ✅

- [x] Scope filtering (`CI_SCOPE` env var)
- [x] Coverage aggregation (`aggregateCoverage()`)
- [x] PR comment generation (`pr-quality-comment.mjs`)
- [x] GitHub Action template (`ci-quality.yml`)
- [x] `compareCiResults()` para trend detection
- [x] Bin entries: `kabran-ci`, `kabran-pr-comment`

---

## Phase 4: PROP-005 - Telemetry Package

**Target:** v1.7.0 → v1.9.0
**Status:** Draft
**Depende de:** PROP-003, PROP-004
**Proposta:** [PROP-005-observability-reference-implementation.md](./proposals/PROP-005-observability-reference-implementation.md)

> Empacotar infraestrutura OpenTelemetry no kabran-config, conectando CI metrics com runtime traces.

### 4.1 Core & Config (v1.7.0)

- [ ] Estrutura `src/telemetry/`
- [ ] Config schema e defaults
- [ ] Shared utilities (context, attributes)
- [ ] TypeScript types
- [ ] Testes para config

### 4.2 Frontend Module (v1.7.0)

- [ ] Extrair telemetria frontend do CIE
- [ ] Modulo configuravel
- [ ] Opcoes de instrumentacao
- [ ] Testes com OTel mockado
- [ ] Documentacao

### 4.3 Edge Module (v1.8.0)

- [ ] Extrair telemetria edge do CIE
- [ ] `withTelemetry` wrapper
- [ ] `traceSupabaseQuery` helper
- [ ] Compatibilidade Deno
- [ ] Documentacao

### 4.4 Node Module (v1.8.0)

- [ ] Node.js provider
- [ ] Express/Fastify middleware
- [ ] Batch processor config
- [ ] Testes
- [ ] Documentacao

### 4.5 CI Integration (v1.9.0)

- [ ] `trace_id` no ci-result.json
- [ ] PR comment com trace links
- [ ] CI step instrumentation
- [ ] E2E testing com OTel collector

### 4.6 Logger Module (v1.9.0)

- [ ] Logger com trace correlation
- [ ] Multiple output formats
- [ ] Log level configuration
- [ ] Integration tests

---

## Progress Tracking

| Phase | Proposal | Version | Status |
|-------|----------|---------|--------|
| 1 | PROP-001 | v1.2.0 | ✅ Completed |
| 2 | PROP-002 | v1.3.0 | ✅ Completed |
| 3.1 | PROP-003/004 Schema | v1.4.0 | ✅ Completed |
| 3.2 | PROP-003/004 Validators | v1.5.0 | ✅ Completed |
| 3.3 | PROP-003/004 CI Integration | v1.6.0 | ✅ PR #7 |
| 4.1 | PROP-005 Core & Config | v1.7.0 | Not Started |
| 4.2 | PROP-005 Frontend | v1.7.0 | Not Started |
| 4.3 | PROP-005 Edge | v1.8.0 | Not Started |
| 4.4 | PROP-005 Node | v1.8.0 | Not Started |
| 4.5 | PROP-005 CI Integration | v1.9.0 | Not Started |
| 4.6 | PROP-005 Logger | v1.9.0 | Not Started |

---

## Version Summary

| Version | Features | Status |
|---------|----------|--------|
| v1.2.0 | Setup CLI, Templates | Released |
| v1.3.0 | Quality Standard Validator | Released |
| v1.4.0 | CI Result Schema v2 | Released |
| v1.5.0 | Validators JSON Output | Released |
| v1.6.0 | Scope Filtering, PR Comments | PR #7 |
| v1.7.0 | Telemetry Core + Frontend | Planned |
| v1.8.0 | Telemetry Edge + Node | Planned |
| v1.9.0 | Telemetry CI Integration + Logger | Planned |

---

## Notes

- Cada fase deve passar por todos os quality gates antes de merge
- PRs devem ser criados para cada fase completa
- Releases seguem semver: breaking = major, feature = minor, fix = patch
- PROP-003 foi superseded por PROP-004 (schema unificado)
- PROP-005 conecta CI observability com runtime telemetry
