---
title: Roadmap: Quality Tooling
id: 01KEW1S1DY2Y6247E4B4D62PR8
type: standard
status: active
tags: [guidelines, standard]
version: 0.1.0
created_at: 2026-01-13
updated_at: 2026-01-13
---

# Roadmap: Quality Tooling

> Sequência de implementação das melhorias de qualidade do kabran-config.

## Overview

```
v1.2.0                                          v1.3.0
┌─────────────────────────────────────┐        ┌─────────────────────┐
│  PROP-001          PROP-002         │        │      PROP-003       │
│  Setup CLI    →    Quality Standard │   →    │  Quality Automation │
│  (~8h)             (~9h)            │        │      (~15h)         │
└─────────────────────────────────────┘        └─────────────────────┘
```

---

## Phase 1: PROP-001 - Project Templates & Setup CLI

**Target:** v1.2.0
**Estimativa:** ~8h
**Proposta:** [PROP-001-project-templates.md](./proposals/PROP-001-project-templates.md)

### 1.1 Estrutura Base

- [ ] Criar diretório `templates/`
- [ ] Criar `templates/.github/workflows/ci.yml`
- [ ] Criar `templates/.github/workflows/commitlint.yml`
- [ ] Criar `templates/.github/workflows/validate-pr-source.yml`
- [ ] Criar `templates/.husky/pre-commit`
- [ ] Criar `templates/.husky/commit-msg`
- [ ] Criar `templates/.husky/pre-push`
- [ ] Criar `templates/config/eslint.config.mjs` (re-export base)
- [ ] Criar `templates/config/eslint-node.config.mjs` (re-export node)
- [ ] Criar `templates/config/eslint-react.config.mjs` (re-export react)
- [ ] Criar `templates/config/prettier.config.mjs`
- [ ] Criar `templates/config/commitlint.config.mjs`
- [ ] Criar `templates/config/lint-staged.config.mjs`

### 1.2 Setup CLI

- [ ] Criar `src/scripts/setup.mjs`
- [ ] Implementar parse de argumentos (`--type`, `--skip-*`, `--sync-*`, `--force`, `--dry-run`)
- [ ] Implementar lógica de cópia com verificação de existência
- [ ] Implementar modo sync para workflows e husky
- [ ] Implementar output colorido e informativo
- [ ] Implementar `--help`

### 1.3 Package Configuration

- [ ] Adicionar `bin.kabran-setup` ao package.json
- [ ] Adicionar export `./scripts/setup`
- [ ] Adicionar `templates` ao campo `files`

### 1.4 Testes

- [ ] Criar `tests/node/setup.test.mjs`
- [ ] Test: setup em projeto vazio
- [ ] Test: setup com arquivos existentes (skip)
- [ ] Test: `--sync-workflows` sobrescreve
- [ ] Test: `--sync-husky` sobrescreve
- [ ] Test: `--dry-run` não modifica arquivos
- [ ] Test: `--force` sobrescreve tudo
- [ ] Test: `--type=react` usa template correto
- [ ] Test: `--type=node` usa template correto
- [ ] Criar fixtures necessárias

### 1.5 Documentação

- [ ] Atualizar README.md com seção "Project Templates"
- [ ] Documentar estratégia de atualização (re-export vs cópia)
- [ ] Adicionar exemplos de uso do CLI

### 1.6 Release Prep

- [ ] Atualizar CHANGELOG.md
- [ ] Bump version para 1.2.0-beta.1
- [ ] Testar `npx kabran-setup` em projeto real

---

## Phase 2: PROP-002 - Quality Standard Artifact

**Target:** v1.2.0
**Estimativa:** ~9h
**Depende de:** PROP-001
**Proposta:** [PROP-002-quality-standard-artifact.md](./proposals/PROP-002-quality-standard-artifact.md)

### 2.1 Template

- [ ] Criar `templates/docs/quality/001-quality-standard.md`
- [ ] Implementar placeholders (`{{PACKAGE_VERSION}}`, `{{PRESET}}`)
- [ ] Adicionar export no package.json

### 2.2 Validator Script

- [ ] Criar `src/scripts/quality-standard-validator.mjs`
- [ ] Implementar verificação de existência do arquivo
- [ ] Implementar parse de frontmatter
- [ ] Implementar validação de seções obrigatórias
- [ ] Implementar detecção de overrides no código (ESLint config)
- [ ] Implementar comparação overrides documentados vs código
- [ ] Adicionar export no package.json

### 2.3 Integração com Setup CLI

- [ ] Atualizar `setup.mjs` para criar quality-standard.md
- [ ] Preencher automaticamente versão e preset
- [ ] Adicionar flag `--skip-quality-standard`

### 2.4 Testes

- [ ] Criar `tests/node/quality-standard-validator.test.mjs`
- [ ] Test: arquivo existe e é válido
- [ ] Test: arquivo não existe (falha)
- [ ] Test: seções faltando (falha)
- [ ] Test: override no código sem documentação (warning)
- [ ] Test: override documentado mas não existe (warning)
- [ ] Criar fixtures necessárias

### 2.5 Documentação

- [ ] Atualizar README.md com seção "Quality Standard"
- [ ] Documentar formato de override
- [ ] Exemplo de override documentado

### 2.6 Release v1.2.0

- [ ] Atualizar CHANGELOG.md
- [ ] Bump version para 1.2.0
- [ ] Tag e release

---

## Phase 3: PROP-003 - Quality Status Automation

**Target:** v1.3.0
**Estimativa:** ~15h
**Depende de:** PROP-001, PROP-002
**Proposta:** [PROP-003-quality-status-automation.md](./proposals/PROP-003-quality-status-automation.md)

### 3.1 Schema e Estrutura

- [ ] Definir JSON Schema para `.status.json`
- [ ] Documentar campos e tipos
- [ ] Definir algoritmo de cálculo de score

### 3.2 Script de Geração

- [ ] Criar `src/scripts/generate-quality-status.mjs`
- [ ] Implementar leitura de resultados dos checks
- [ ] Implementar consolidação em estrutura JSON
- [ ] Implementar cálculo de score e status
- [ ] Implementar manutenção de histórico (max 30 entries)
- [ ] Implementar detecção de tendências
- [ ] Adicionar export no package.json

### 3.3 Integração com CI

- [ ] Atualizar `ci-core.sh` para capturar output estruturado
- [ ] Criar `ci-quality-report.sh` wrapper
- [ ] Testar integração end-to-end

### 3.4 Geração de Markdown (Opcional)

- [ ] Criar `src/scripts/generate-quality-markdown.mjs`
- [ ] Template com badges e tabelas
- [ ] Adicionar export no package.json

### 3.5 PR Integration

- [ ] Criar `src/scripts/pr-quality-comment.mjs`
- [ ] Implementar comparação branch vs main
- [ ] Implementar geração de comentário com diff
- [ ] Criar GitHub Action template

### 3.6 Testes

- [ ] Criar `tests/node/generate-quality-status.test.mjs`
- [ ] Test: gera JSON válido
- [ ] Test: calcula score corretamente
- [ ] Test: mantém histórico (max 30)
- [ ] Test: detecta tendências
- [ ] Test: categoriza status corretamente
- [ ] Criar `tests/node/pr-quality-comment.test.mjs`
- [ ] Test: detecta regressão
- [ ] Test: detecta melhoria
- [ ] Criar fixtures necessárias

### 3.7 Documentação

- [ ] Atualizar README.md com seção "Quality Automation"
- [ ] Documentar schema do `.status.json`
- [ ] Exemplo de integração CI
- [ ] Exemplo de PR comment

### 3.8 Release v1.3.0

- [ ] Atualizar CHANGELOG.md
- [ ] Bump version para 1.3.0
- [ ] Tag e release

---

## Progress Tracking

| Phase | Status | Progress |
|-------|--------|----------|
| PROP-001 | Not Started | 0/25 |
| PROP-002 | Not Started | 0/20 |
| PROP-003 | Not Started | 0/30 |

---

## Notes

- Cada fase deve passar por todos os quality gates antes de merge
- PRs devem ser criados para cada fase completa
- Releases seguem semver: breaking = major, feature = minor, fix = patch
