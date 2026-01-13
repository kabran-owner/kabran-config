---
title: PROP-004: CI Observability Metrics
id: 01JH6CIOBS004METRICSRUNNER
type: proposal
status: draft
tags: [ci, observability, metrics, monitoring]
version: 0.1.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-004: CI Observability Metrics

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-004 |
| **Title** | CI Observability Metrics |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Target Version** | 1.4.0 |
| **Depends On** | PROP-003 (Quality Status Automation) |

## Summary

Expandir o CI runner do kabran-config para coletar metricas de observabilidade detalhadas: tempo por step, agregacao de coverage, contagem de warnings/errors, e suporte a execucao por escopo.

## Motivation

### Problema Atual

1. **Sem metricas de tempo** - Impossivel saber qual step esta lento ou se houve regressao de performance
2. **Coverage nao agregado** - Dados existem em test-results.json mas nao sao incluidos no ci-result.json
3. **Warnings ignorados** - Lint e type-check produzem warnings que nao sao contabilizados
4. **CI monolitico** - Sempre roda todos os 13 steps mesmo quando mudanca afeta apenas 1 app
5. **Sem historico de tendencias** - Cada run descarta dados, impossibilitando analise temporal

### Dados Quantitativos (Projeto CIE)

| Metrica | Valor Atual |
|---------|-------------|
| Tempo total CI | ~30 minutos |
| Steps executados | 13 (sempre todos) |
| Metricas coletadas | 5 (ci_passed, exit_code, errors, timestamp, project) |
| Metricas de tempo | 0 |
| Coverage agregado | Nao |
| Warnings contados | Nao |

### Impacto

- **DX ruim**: Desenvolvedores esperam 30 min mesmo para mudancas triviais
- **Sem visibilidade**: Impossivel identificar gargalos ou regressoes
- **Dados perdidos**: Metricas valiosas existem mas sao descartadas

## Design

### Arquitetura Proposta

```
CI Pipeline
    │
    ├── [--scope=app] ◄── NOVO: Filtro por escopo
    │
    ├── step-1 ──────┬── start_time, end_time, duration_ms
    ├── step-2 ──────┤
    ├── step-N ──────┘
    │                │
    │                ▼
    │    ┌─────────────────────┐
    │    │  Coleta de Metricas │
    │    └─────────────────────┘
    │                │
    │    ┌───────────┴───────────┐
    │    │                       │
    │    ▼                       ▼
    │  test-results.json    lint output
    │  (coverage data)      (warning count)
    │                │
    └────────────────┴──────────────────┐
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │    ci-result.json       │
                          │    (enhanced schema)    │
                          └─────────────────────────┘
```

### Schema Expandido: ci-result.json

```json
{
  "$schema": "https://kabran.dev/schemas/ci-result.v2.json",
  "version": "2.0.0",
  "ci_passed": true,
  "exit_code": 0,
  "errors": [],
  "timestamp": "2026-01-13T12:00:00Z",
  "working_directory": "/path/to/project",
  "project": "cie-monorepo",

  "timing": {
    "total_duration_ms": 1800000,
    "total_duration_human": "30m 00s",
    "steps": [
      {
        "name": "app-lint",
        "component": "app",
        "duration_ms": 45000,
        "duration_human": "45s",
        "status": "passed"
      },
      {
        "name": "app-test",
        "component": "app",
        "duration_ms": 180000,
        "duration_human": "3m 00s",
        "status": "passed"
      }
    ],
    "by_component": {
      "app": { "duration_ms": 600000, "duration_human": "10m 00s" },
      "cms": { "duration_ms": 300000, "duration_human": "5m 00s" },
      "website": { "duration_ms": 480000, "duration_human": "8m 00s" }
    },
    "slowest_steps": [
      { "name": "app-test", "duration_ms": 180000 },
      { "name": "website-build", "duration_ms": 120000 }
    ]
  },

  "coverage": {
    "aggregated": {
      "lines": 45.2,
      "branches": 38.5,
      "functions": 52.1,
      "statements": 44.8
    },
    "by_component": {
      "app": { "lines": 26.0, "branches": 22.0 },
      "website": { "lines": 51.0, "branches": 45.0 }
    },
    "delta_from_baseline": {
      "lines": "+2.3",
      "branches": "+1.1"
    }
  },

  "quality": {
    "lint": {
      "errors": 0,
      "warnings": 42,
      "fixable": 15
    },
    "typecheck": {
      "errors": 0,
      "warnings": 8
    }
  },

  "metadata": {
    "node_version": "v22.0.0",
    "npm_version": "10.0.0",
    "ci_core_version": "1.4.0",
    "scope": "all",
    "components_executed": ["app", "cms", "website"],
    "total_steps": 13,
    "steps_executed": 13,
    "steps_skipped": 0
  }
}
```

### Funcionalidade 1: Tempo por Step

#### Implementacao

```bash
# ci-core.sh (modificado)

run_step() {
  local name="$1"
  local cmd="$2"
  local results_file="${3:-}"
  local log_file="/tmp/ci_${name}.log"

  local start_time=$(date +%s%3N)  # Milliseconds

  log_info "Running: $name"

  if eval "$cmd" > "$log_file" 2>&1; then
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    # Armazenar metrica
    STEP_TIMINGS+=("{\"name\":\"$name\",\"duration_ms\":$duration,\"status\":\"passed\"}")

    log_success "$name completed (${duration}ms)"
    return 0
  else
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    STEP_TIMINGS+=("{\"name\":\"$name\",\"duration_ms\":$duration,\"status\":\"failed\"}")

    log_error "$name failed (${duration}ms)"
    return 1
  fi
}
```

### Funcionalidade 2: Execucao por Escopo

#### Interface CLI

```bash
# Rodar tudo (comportamento atual)
./scripts/ci.sh

# Rodar apenas um componente
./scripts/ci.sh --scope=app
./scripts/ci.sh --scope=website
./scripts/ci.sh --scope=cms

# Rodar multiplos componentes
./scripts/ci.sh --scope=app,website

# Listar escopos disponiveis
./scripts/ci.sh --list-scopes
```

#### Implementacao

```bash
# ci-runner.sh (modificado)

# Parse arguments
SCOPE="all"
while [[ $# -gt 0 ]]; do
  case $1 in
    --scope=*)
      SCOPE="${1#*=}"
      shift
      ;;
    --list-scopes)
      echo "Available scopes: app, cms, website, all"
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

export CI_SCOPE="$SCOPE"
```

```bash
# ci-config.sh (modificado pelo projeto)

ci_steps() {
  local FAILED=0
  local SCOPE="${CI_SCOPE:-all}"

  # APP
  if [[ "$SCOPE" == "all" || "$SCOPE" == *"app"* ]]; then
    log_section "APP CI"
    run_step "app-lint" "cd '$APP_DIR' && $PM run lint" || FAILED=1
    # ... outros steps
  fi

  # CMS
  if [[ "$SCOPE" == "all" || "$SCOPE" == *"cms"* ]]; then
    log_section "CMS CI"
    run_step "cms-lint" "cd '$CMS_DIR' && $PM run lint" || FAILED=1
    # ... outros steps
  fi

  # WEBSITE
  if [[ "$SCOPE" == "all" || "$SCOPE" == *"website"* ]]; then
    log_section "WEBSITE CI"
    run_step "website-lint" "cd '$WEBSITE_DIR' && $PM run lint" || FAILED=1
    # ... outros steps
  fi

  return $FAILED
}
```

### Funcionalidade 3: Agregacao de Coverage

#### Implementacao

```bash
# ci-core.sh (nova funcao)

aggregate_coverage() {
  local coverage_files=("$@")
  local total_lines=0
  local total_branches=0
  local count=0

  for file in "${coverage_files[@]}"; do
    if [ -f "$file" ]; then
      local lines=$(jq -r '.coverage.lines // 0' "$file" 2>/dev/null)
      local branches=$(jq -r '.coverage.branches // 0' "$file" 2>/dev/null)

      total_lines=$(echo "$total_lines + $lines" | bc)
      total_branches=$(echo "$total_branches + $branches" | bc)
      count=$((count + 1))
    fi
  done

  if [ $count -gt 0 ]; then
    local avg_lines=$(echo "scale=1; $total_lines / $count" | bc)
    local avg_branches=$(echo "scale=1; $total_branches / $count" | bc)

    COVERAGE_DATA="{\"lines\":$avg_lines,\"branches\":$avg_branches}"
  fi
}
```

### Funcionalidade 4: Contagem de Warnings

#### Implementacao

```bash
# ci-core.sh (nova funcao)

count_lint_issues() {
  local log_file="$1"

  if [ -f "$log_file" ]; then
    local errors=$(grep -c "error" "$log_file" 2>/dev/null || echo 0)
    local warnings=$(grep -c "warning" "$log_file" 2>/dev/null || echo 0)

    LINT_DATA="{\"errors\":$errors,\"warnings\":$warnings}"
  fi
}
```

## Beneficios

### Para Desenvolvedores

| Antes | Depois |
|-------|--------|
| CI sempre roda 30 min | CI por escopo: ~10 min |
| Sem visibilidade de tempo | Tempo por step visivel |
| Coverage ignorado | Coverage agregado no resultado |
| Warnings perdidos | Warnings contabilizados |

### Para Monitoramento

| Metrica | Uso |
|---------|-----|
| `timing.total_duration_ms` | Alertar se CI > threshold |
| `timing.slowest_steps` | Identificar gargalos |
| `coverage.delta_from_baseline` | Detectar regressao |
| `quality.lint.warnings` | Trending de divida tecnica |

### Para Integracao

```bash
# Exemplo: PR Comment com metricas
CI_RESULT=$(cat .workspace/ci-result.json)
DURATION=$(echo $CI_RESULT | jq -r '.timing.total_duration_human')
COVERAGE=$(echo $CI_RESULT | jq -r '.coverage.aggregated.lines')

gh pr comment --body "CI completed in $DURATION. Coverage: $COVERAGE%"
```

## Migracao

### Compatibilidade

- **v1 → v2**: Schema v2 e superset de v1
- **ci-config.sh**: Projetos existentes funcionam sem modificacao
- **--scope**: Funcionalidade opcional, default e "all"

### Rollout

| Fase | Escopo | Entrega |
|------|--------|---------|
| 1 | Timing por step | 1.4.0-beta.1 |
| 2 | Execucao por escopo | 1.4.0-beta.2 |
| 3 | Agregacao coverage | 1.4.0-beta.3 |
| 4 | Contagem warnings | 1.4.0 |

## Alternativas Consideradas

### A: Usar ferramenta externa (Datadog, Grafana)

**Rejeitado**: Adiciona dependencia externa e custo. Solucao deve ser self-contained.

### B: Apenas logs estruturados

**Rejeitado**: Logs sao efemeros. JSON persistente permite analise posterior.

### C: Integracao com GitHub Actions Insights

**Parcialmente aceito**: Complementar, nao substituto. CI local tambem precisa de metricas.

## Riscos

| Risco | Probabilidade | Mitigacao |
|-------|---------------|-----------|
| Overhead de coleta | Baixa | Medicoes sao O(1), impacto < 100ms |
| Quebra de compatibilidade | Media | Schema v2 e superset, testes de regressao |
| Complexidade do ci-config.sh | Media | Documentacao clara, exemplos |

## Metricas de Sucesso

| Metrica | Target |
|---------|--------|
| Tempo CI com escopo | < 50% do tempo total |
| Adocao de --scope | > 70% dos runs locais |
| Dados de timing disponiveis | 100% dos runs |
| Coverage agregado | 100% dos projetos com testes |

## Referencias

- [PROP-003: Quality Status Automation](./PROP-003-quality-status-automation.md)
- [kabran-config CI Runner](../../../src/scripts/ci/)
- [OpenTelemetry Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)

---

## Changelog

| Versao | Data | Mudancas |
|--------|------|----------|
| 0.1.0 | 2026-01-13 | Versao inicial |
