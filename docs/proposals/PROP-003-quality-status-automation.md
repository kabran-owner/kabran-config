---
title: PROP-003: Quality Status Automation
id: 01JH5RSTUVWXYZ4ABC5DEF6GH7
type: proposal
status: draft
tags: [quality, automation, ci, metrics]
version: 0.1.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-003: Quality Status Automation

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-003 |
| **Title** | Quality Status Automation |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Target Version** | 1.3.0 |
| **Depends On** | PROP-001 (Setup CLI), PROP-002 (Quality Standard) |

## Summary

Automatizar a geracao de metricas de qualidade via CI, produzindo um artefato `.status.json` que serve como fonte de dados para rastreamento de issues, tendencias e integracoes.

## Motivation

### Problema Atual

1. **Metricas nao rastreadas** - CI roda checks mas resultados sao descartados apos o run
2. **Sem historico** - Impossivel saber se qualidade esta melhorando ou piorando
3. **Inventario manual** - Erros conhecidos nao sao catalogados sistematicamente
4. **Sem alertas** - Regressoes passam despercebidas ate alguem reclamar

### Solucao Proposta

1. **`.status.json`** - Artefato JSON gerado automaticamente pelo CI
2. **Historico** - Cada run adiciona entrada para tracking de tendencias
3. **Inventario** - Issues pendentes catalogados com metadata
4. **Integracao** - Dados estruturados para dashboards, PR comments, alertas

## Design

### Arquitetura

```
CI Pipeline
    │
    ├── lint ──────────────┐
    ├── type-check ────────┤
    ├── license-check ─────┼──► Resultados parciais
    ├── deps-check ────────┤
    └── readme-validate ───┘
                           │
                           ▼
              ┌────────────────────────┐
              │  generate-quality-status │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  docs/quality/          │
              │  ├── .status.json       │  ← Fonte de dados
              │  └── 002-quality-status.md │  ← Visualizacao (opcional)
              └────────────────────────┘
```

### Estrutura de Arquivos

```
projeto/
├── docs/
│   └── quality/
│       ├── 001-quality-standard.md   # Manual (PROP-002)
│       ├── 002-quality-status.md     # Gerado (opcional, para humanos)
│       └── .status.json              # Gerado (fonte de dados)
└── ...
```

### Schema: .status.json

```json
{
  "$schema": "https://kabran.dev/schemas/quality-status.v1.json",
  "version": "1.0.0",
  "generated_at": "2026-01-13T10:30:00Z",
  "generator": "@kabran-tecnologia/kabran-config@1.3.0",
  "project": {
    "name": "my-project",
    "package_version": "1.2.0",
    "kabran_config_version": "1.3.0"
  },
  "summary": {
    "status": "passing",
    "total_issues": 12,
    "blocking": 0,
    "warnings": 12,
    "score": 85
  },
  "checks": {
    "lint": {
      "status": "pass",
      "exit_code": 0,
      "duration_ms": 3420,
      "errors": 0,
      "warnings": 8,
      "files_analyzed": 45,
      "rules_violated": [
        {
          "rule": "@typescript-eslint/no-explicit-any",
          "count": 5,
          "severity": "warning"
        },
        {
          "rule": "no-console",
          "count": 3,
          "severity": "warning"
        }
      ]
    },
    "type_check": {
      "status": "pass",
      "exit_code": 0,
      "duration_ms": 5200,
      "errors": 0
    },
    "license": {
      "status": "pass",
      "exit_code": 0,
      "duration_ms": 1200,
      "violations": 0,
      "packages_scanned": 142
    },
    "dependencies": {
      "status": "warn",
      "exit_code": 0,
      "duration_ms": 2100,
      "total": 142,
      "outdated": 3,
      "critical": 0,
      "outdated_packages": [
        {
          "name": "lodash",
          "current": "4.17.20",
          "latest": "4.17.21",
          "age_days": 180
        }
      ]
    },
    "readme": {
      "status": "pass",
      "exit_code": 0,
      "duration_ms": 50,
      "missing_sections": []
    },
    "env": {
      "status": "pass",
      "exit_code": 0,
      "duration_ms": 80,
      "env_tracked": false,
      "example_exists": true
    }
  },
  "issues": [
    {
      "id": "ISS-001",
      "type": "lint",
      "rule": "@typescript-eslint/no-explicit-any",
      "severity": "warning",
      "file": "src/utils/legacy.ts",
      "line": 42,
      "column": 10,
      "message": "Unexpected any. Specify a different type.",
      "first_seen": "2026-01-10",
      "run_count": 5,
      "tracking": "KAB-456",
      "suppressed": false
    }
  ],
  "history": [
    {
      "date": "2026-01-13",
      "commit": "abc1234",
      "branch": "main",
      "total": 12,
      "blocking": 0,
      "score": 85
    },
    {
      "date": "2026-01-12",
      "commit": "def5678",
      "branch": "main",
      "total": 15,
      "blocking": 2,
      "score": 78
    }
  ],
  "trends": {
    "direction": "improving",
    "change_7d": -6,
    "change_30d": -25
  }
}
```

### Campos Principais

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `summary.status` | enum | `passing`, `failing`, `degraded` |
| `summary.score` | number | 0-100, calculado com base em issues |
| `checks.*` | object | Resultado de cada check individual |
| `issues[]` | array | Inventario de issues pendentes |
| `history[]` | array | Ultimos N runs para trending |
| `trends` | object | Analise de tendencia calculada |

### Calculo do Score

```javascript
// Pseudo-codigo
function calculateScore(checks, issues) {
  let score = 100;

  // Penalidades por blocking issues
  score -= issues.filter(i => i.severity === 'error').length * 10;

  // Penalidades por warnings (menor impacto)
  score -= issues.filter(i => i.severity === 'warning').length * 1;

  // Penalidades por checks falhando
  for (const check of Object.values(checks)) {
    if (check.status === 'fail') score -= 20;
    if (check.status === 'warn') score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}
```

### Status do Projeto

| Status | Condicao |
|--------|----------|
| `passing` | score >= 80 e blocking = 0 |
| `degraded` | score >= 50 e blocking = 0 |
| `failing` | score < 50 ou blocking > 0 |

## Implementation

### Fase 1: Script de Geracao

**Tasks:**

1. **Criar script generate-quality-status.mjs**
   - Ler resultados dos checks (lint, type-check, etc)
   - Consolidar em estrutura JSON
   - Calcular score e status
   - Manter historico (append, max 30 entries)

2. **Criar schema JSON**
   - Definir schema formal para validacao
   - Publicar em URL publica (opcional)

3. **Adicionar ao package.json exports**

   ```json
   {
     "exports": {
       "./scripts/generate-quality-status": "./src/scripts/generate-quality-status.mjs"
     }
   }
   ```

### Fase 2: Integracao com CI

**Tasks:**

1. **Atualizar ci-core.sh**
   - Capturar output estruturado de cada step
   - Salvar resultados parciais em arquivos temporarios
   - Chamar generate-quality-status ao final

2. **Criar ci-quality-report.sh**
   - Wrapper que executa CI e gera status
   - Pode ser usado standalone ou integrado

3. **Atualizar run_step()**

   ```bash
   # Capturar JSON output quando disponivel
   run_step "lint" "npm run lint -- --format=json" "$RESULTS_DIR/lint.json"
   ```

### Fase 3: Geracao de Markdown (Opcional)

**Tasks:**

1. **Criar script generate-quality-markdown.mjs**
   - Ler .status.json
   - Gerar 002-quality-status.md formatado
   - Incluir badges, tabelas, graficos ASCII

2. **Template markdown**

   ```markdown
   # Quality Status

   ![Status](https://img.shields.io/badge/status-passing-green)
   ![Score](https://img.shields.io/badge/score-85-blue)

   **Last updated:** 2026-01-13 10:30 UTC

   ## Summary
   | Metric | Value |
   |--------|-------|
   | Total Issues | 12 |
   | Blocking | 0 |
   | Score | 85/100 |

   ## Checks
   ...
   ```

### Fase 4: PR Integration

**Tasks:**

1. **Criar script pr-quality-comment.mjs**
   - Comparar .status.json do branch com main
   - Gerar comentario de PR com diff
   - Alertar sobre regressoes

2. **GitHub Action template**

   ```yaml
   - name: Quality Status
     run: npx kabran-quality-status

   - name: Comment PR
     if: github.event_name == 'pull_request'
     run: npx kabran-quality-comment
   ```

### Fase 5: Testes

**Tasks:**

1. **Testes para generate-quality-status.mjs**
   - Test: gera JSON valido
   - Test: calcula score corretamente
   - Test: mantem historico (max 30)
   - Test: detecta tendencias
   - Test: categoriza status corretamente

2. **Testes para pr-quality-comment.mjs**
   - Test: detecta regressao
   - Test: detecta melhoria
   - Test: formata comentario corretamente

## CI Integration Examples

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - run: npm ci

      - name: Run Quality Checks
        run: npm run ci

      - name: Generate Quality Status
        run: npx kabran-quality-status

      - name: Upload Quality Report
        uses: actions/upload-artifact@v4
        with:
          name: quality-status
          path: docs/quality/.status.json

      - name: Comment PR (if applicable)
        if: github.event_name == 'pull_request'
        run: npx kabran-quality-comment
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Script Local

```bash
# Gerar status localmente
npm run quality:status

# Ver status atual
cat docs/quality/.status.json | jq '.summary'

# Ver tendencia
cat docs/quality/.status.json | jq '.trends'
```

## Acceptance Criteria

### Must Have

- [ ] Script `generate-quality-status.mjs` gera JSON valido
- [ ] JSON segue schema definido
- [ ] Score calculado corretamente
- [ ] Historico mantido (max 30 entries)
- [ ] Integracao com ci-core.sh funciona
- [ ] Todos os testes passam
- [ ] Documentacao atualizada

### Should Have

- [ ] Geracao de markdown opcional
- [ ] Deteccao de tendencias (improving/degrading/stable)
- [ ] PR comment com diff de qualidade

### Nice to Have

- [ ] Badges SVG gerados dinamicamente
- [ ] Integracao com Slack/Discord para alertas
- [ ] Dashboard web para visualizacao
- [ ] Comparacao entre branches

## Output Examples

### Terminal Output

```
Quality Status Report
=====================

Project: my-project
Generated: 2026-01-13 10:30:00 UTC

Summary
-------
Status: PASSING
Score:  85/100
Issues: 12 (0 blocking, 12 warnings)

Checks
------
✓ lint        PASS  (8 warnings)
✓ type-check  PASS
✓ license     PASS
⚠ deps        WARN  (3 outdated)
✓ readme      PASS
✓ env         PASS

Trend: ↑ Improving (-6 issues in 7 days)

Report saved to: docs/quality/.status.json
```

### PR Comment

```markdown
## Quality Status Report

| Metric | Base (main) | Head (feature/x) | Change |
|--------|-------------|------------------|--------|
| Score | 85 | 82 | -3 |
| Issues | 12 | 15 | +3 |
| Blocking | 0 | 0 | - |

### New Issues Introduced
- `src/new-file.ts:10` - @typescript-eslint/no-explicit-any
- `src/new-file.ts:25` - @typescript-eslint/no-explicit-any
- `src/utils.ts:42` - no-console

### Resolved Issues
None

---
*Generated by @kabran-tecnologia/kabran-config*
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSON muito grande | Baixo | Limitar historico a 30 entries, comprimir issues |
| Parsing de output ESLint falha | Medio | Usar --format=json, fallback para regex |
| Historico perdido em force push | Medio | Armazenar backup em branch separada ou artifact |
| Score gaming (suprimir issues) | Medio | Tracking de issues suprimidas, alertas |

## Timeline

| Fase | Estimativa | Dependencias |
|------|------------|--------------|
| Fase 1: Script de Geracao | 4h | - |
| Fase 2: Integracao CI | 3h | Fase 1 |
| Fase 3: Markdown | 2h | Fase 1 |
| Fase 4: PR Integration | 3h | Fase 2 |
| Fase 5: Testes | 3h | Fase 1-4 |

**Total estimado:** ~15h de desenvolvimento

## References

- [PROP-001: Project Templates & Setup CLI](./PROP-001-project-templates.md)
- [PROP-002: Quality Standard Artifact](./PROP-002-quality-standard-artifact.md)
- [ESLint JSON Formatter](https://eslint.org/docs/user-guide/formatters/#json)
- [TypeScript Compiler Output](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

## Appendix

### A. JSON Schema (Simplified)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Quality Status",
  "type": "object",
  "required": ["version", "generated_at", "summary", "checks"],
  "properties": {
    "version": {"type": "string"},
    "generated_at": {"type": "string", "format": "date-time"},
    "summary": {
      "type": "object",
      "required": ["status", "total_issues", "blocking", "score"],
      "properties": {
        "status": {"enum": ["passing", "failing", "degraded"]},
        "total_issues": {"type": "integer", "minimum": 0},
        "blocking": {"type": "integer", "minimum": 0},
        "warnings": {"type": "integer", "minimum": 0},
        "score": {"type": "integer", "minimum": 0, "maximum": 100}
      }
    },
    "checks": {"type": "object"},
    "issues": {"type": "array"},
    "history": {"type": "array"},
    "trends": {"type": "object"}
  }
}
```

### B. Package.json Scripts

```json
{
  "scripts": {
    "quality:status": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/generate-quality-status.mjs",
    "quality:markdown": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/generate-quality-markdown.mjs",
    "quality:comment": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/pr-quality-comment.mjs"
  }
}
```

### C. Gitignore Recommendation

```gitignore
# Quality status is generated, but we want to track it
# Do NOT ignore docs/quality/.status.json

# Temporary CI results (can be ignored)
.quality-tmp/
```

**Nota:** O `.status.json` deve ser commitado para manter historico. Alternativa: armazenar apenas em CI artifacts se nao quiser no repo.
