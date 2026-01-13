---
title: Roadmap: Quality Tooling
id: 01KEW1S1DY2Y6247E4B4D62PR8
type: standard
status: active
tags: [guidelines, standard]
version: 0.2.7
created_at: 2026-01-13
updated_at: 2026-01-13
---

# Roadmap: Quality Tooling

> Sequencia de implementacao das melhorias de qualidade do kabran-config.

## Overview

```
PROP-001 (v1.2.0)  →  PROP-002 (v1.3.0)  →  PROP-003/004 (v1.4.0-1.6.0)  →  PROP-005 (v1.6.0+)
┌─────────────┐       ┌─────────────┐       ┌─────────────────────┐         ┌─────────────────┐
│  Setup CLI  │  →    │  Quality    │  →    │  CI Observability   │    →    │   Telemetry     │
│  Templates  │       │  Standard   │       │  Unified Schema     │         │   Package       │
└─────────────┘       └─────────────┘       └─────────────────────┘         └─────────────────┘
     ✅                    ✅                        ✅                          🟡 75%
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

**Claude Code Plan:** `~/.claude/plans/zesty-waddling-meadow.md`

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

## Phase 4: PROP-005 - Telemetry Package 🟡

**Target:** v1.7.0 → v1.9.0
**Status:** Partially Implemented (v1.6.0)
**Depende de:** PROP-003, PROP-004
**Proposta:** [PROP-005-observability-reference-implementation.md](./proposals/PROP-005-observability-reference-implementation.md)
**Claude Code Plan:** `~/.claude/plans/prop-005-telemetry-package.md`

> Empacotar infraestrutura OpenTelemetry no kabran-config, conectando CI metrics com runtime traces.

### 4.1 Core & Config (v1.7.0) ✅

- [x] Estrutura `src/telemetry/`
- [x] Config schema e defaults
- [x] Shared utilities (context, attributes)
- [x] TypeScript types
- [x] Testes para config

### 4.2 Frontend Module (v1.7.0) 🟡

- [x] Extrair telemetria frontend do CIE
- [x] Modulo configuravel
- [x] Opcoes de instrumentacao
- [ ] Testes com OTel mockado
- [ ] Documentacao no README

### 4.3 Edge Module (v1.8.0) 🟡

- [x] Extrair telemetria edge do CIE
- [x] `withTelemetry` wrapper
- [x] `traceSupabaseQuery` helper
- [x] Compatibilidade Deno
- [ ] Testes unitarios
- [ ] Documentacao no README

### 4.4 Node Module (v1.8.0) 🟡

- [x] Node.js provider
- [x] Express/Fastify middleware
- [x] Batch processor config
- [ ] Testes unitarios
- [ ] Documentacao no README

### 4.5 CI Integration (v1.9.0)

- [ ] `trace_id` no ci-result.json
- [ ] PR comment com trace links
- [ ] CI step instrumentation
- [ ] E2E testing com OTel collector

### 4.6 Logger Module (v1.9.0) ✅

- [x] Logger com trace correlation
- [x] Multiple output formats
- [x] Log level configuration
- [x] Integration tests

---

## Progress Tracking

| Phase | Proposal | Version | Status |
|-------|----------|---------|--------|
| 1 | PROP-001 | v1.2.0 | ✅ Completed |
| 2 | PROP-002 | v1.3.0 | ✅ Completed |
| 3.1 | PROP-003/004 Schema | v1.4.0 | ✅ Completed |
| 3.2 | PROP-003/004 Validators | v1.5.0 | ✅ Completed |
| 3.3 | PROP-003/004 CI Integration | v1.6.0 | ✅ Completed |
| 4.1 | PROP-005 Core & Config | v1.7.0 | ✅ Completed |
| 4.2 | PROP-005 Frontend | v1.7.0 | 🟡 Partial (needs tests/docs) |
| 4.3 | PROP-005 Edge | v1.8.0 | 🟡 Partial (needs tests/docs) |
| 4.4 | PROP-005 Node | v1.8.0 | 🟡 Partial (needs tests/docs) |
| 4.5 | PROP-005 CI Integration | v1.9.0 | Not Started |
| 4.6 | PROP-005 Logger | v1.9.0 | ✅ Completed |

---

## Version Summary

| Version | Features | Status |
|---------|----------|--------|
| v1.2.0 | Setup CLI, Templates | Released |
| v1.3.0 | Quality Standard Validator | Released |
| v1.4.0 | CI Result Schema v2 | Released |
| v1.5.0 | Validators JSON Output | Released |
| v1.6.0 | Scope Filtering, PR Comments, Telemetry (partial) | Released |
| v1.7.0 | Telemetry Tests + Docs + CI Integration | Planned |

---

## Notes

- Cada fase deve passar por todos os quality gates antes de merge
- PRs devem ser criados para cada fase completa
- Releases seguem semver: breaking = major, feature = minor, fix = patch
- PROP-003 foi superseded por PROP-004 (schema unificado)
- PROP-005 conecta CI observability com runtime telemetry

---

## Gaps Analysis (2026-01-13)

> Revisao geral identificou gaps entre as propostas e a implementacao atual.

### Resumo por Proposta

| Proposta | Completude | Status |
|----------|------------|--------|
| PROP-001 | 100% | ✅ Sem gaps |
| PROP-002 | 100% | ✅ Sem gaps |
| PROP-003 | ~70% | 🟡 Gaps em historico/trends |
| PROP-004 | ~90% | ✅ Gaps menores |
| PROP-005 | ~75% | 🟡 Gaps em testes/docs/CI integration |

### PROP-003: Quality Status Automation

**Gaps identificados:**

| Gap | Prioridade | Descricao |
|-----|------------|-----------|
| Historico de runs | Alta | `history[]` com max 30 entries nao implementado |
| Trends calculation | Alta | `direction`, `change_7d`, `change_30d` nao implementados |
| Issues tracking | Media | `first_seen`, `run_count` per-issue nao implementados |
| Markdown generator | Baixa | `generate-quality-markdown.mjs` nao criado |

**Decisao necessaria:** Onde persistir historico? Arquivo local vs CI artifacts.

### PROP-004: CI Observability Metrics

**Gaps menores:**

| Gap | Prioridade | Descricao |
|-----|------------|-----------|
| `aggregate_coverage()` | Media | Funcao bash nao implementada (Node.js faz) |
| `count_lint_issues()` | Baixa | Parsing inline de warnings nao implementado |
| `--list-scopes` | Baixa | Flag de CLI nao implementada |
| `coverage.delta_from_baseline` | Baixa | Comparacao com baseline ausente |

### PROP-005: Telemetry Package

**Gaps identificados:**

| Gap | Prioridade | Descricao |
|-----|------------|-----------|
| README docs | Alta | Telemetria nao documentada - usuarios nao sabem que existe |
| CI Integration | Alta | `trace_id` nao inserido em ci-result.json |
| PR trace links | Alta | `pr-quality-comment.mjs` nao gera links para traces |
| Frontend tests | Media | `telemetry-frontend.test.mjs` nao existe |
| Edge tests | Media | `telemetry-edge.test.mjs` nao existe |
| Node tests | Media | `telemetry-node.test.mjs` nao existe |
| Migration guide | Media | Secao "From CIE-style to Package" nao existe |

### Acoes Recomendadas

#### Prioridade Alta (v1.7.0)

1. **Documentar telemetria no README**
   - Usuarios nao sabem que o pacote oferece OTel integration
   - Adicionar secao completa com exemplos

2. **Implementar trace_id no ci-result.json**
   - Conectar CI com observability conforme PROP-005 Phase 5
   - Permitir correlacao de builds com traces

#### Prioridade Media (v1.7.0+)

1. **Adicionar testes para telemetry modules**
   - `telemetry-frontend.test.mjs`
   - `telemetry-edge.test.mjs`
   - `telemetry-node.test.mjs`

2. **Implementar historico/trends (PROP-003)**
   - Requer decisao sobre persistencia
   - Considerar: arquivo `.status-history.json` ou apenas CI artifacts

3. **PR comments com trace links**
   - Valor significativo para debugging em producao

#### Prioridade Baixa (backlog)

1. `--list-scopes` no ci-runner
2. `generate-quality-markdown.mjs`
3. `aggregate_coverage()` em bash vs Node.js
4. Migration guide para telemetria
