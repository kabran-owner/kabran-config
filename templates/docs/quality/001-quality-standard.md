---
title: Quality Standard
type: quality
status: active
version: 1.0.0
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
---

# Quality Standard

> Este documento define a configuracao de qualidade do projeto e documenta quaisquer excecoes aos padroes Kabran.

## Configuracao Base

| Item | Valor |
|------|-------|
| **Pacote** | @kabran-tecnologia/kabran-config |
| **Versao** | X.Y.Z |
| **Preset ESLint** | node / react / base |
| **Preset TypeScript** | node / react / base |

## Arquivos de Configuracao

| Arquivo | Status |
|---------|--------|
| `eslint.config.mjs` | Configurado |
| `prettier.config.mjs` | Configurado |
| `tsconfig.json` | Configurado |
| `commitlint.config.mjs` | Configurado |
| `.husky/pre-commit` | Configurado |
| `.husky/commit-msg` | Configurado |

## Scripts de Validacao

| Script | Comando | Ativo |
|--------|---------|-------|
| Lint | `npm run lint` | Sim |
| Type Check | `npm run type-check` | Sim |
| Format | `npm run format:check` | Sim |
| License | `npm run license:check` | Sim |
| Dependencies | `npm run deps:check` | Sim |
| README | `npm run readme:validate` | Sim |
| Environment | `npm run env:validate` | Sim |

## Overrides Aplicados

> **Principio:** Nenhum padrao de qualidade pode ser relaxado sem justificativa tecnica documentada.

### Nenhum override aplicado

Este projeto segue 100% dos padroes definidos no kabran-config.

<!--
Quando houver overrides, usar o formato abaixo:

### OVR-001: [Nome da Regra]

| Campo | Valor |
|-------|-------|
| **Regra** | `nome-da-regra` |
| **Severidade Original** | error |
| **Severidade Aplicada** | off / warn |
| **Arquivo** | `eslint.config.mjs` |

**Motivo:**
Descricao tecnica detalhada do motivo pelo qual este override e necessario.
Deve ser uma justificativa tecnica, nao preferencia pessoal.

**Tracking:**
- Issue: KAB-XXX (se aplicavel)
- Aprovado por: @usuario
- Data: YYYY-MM-DD

**Condicao de Remocao:**
Descrever quando este override pode ser removido.
Ex: "Quando biblioteca X atualizar para vY.Z"
Ex: "Permanente - natureza do projeto requer isso"

---

### OVR-002: [Proxima Regra]
...

-->

## Historico

| Data | Versao | Descricao |
|------|--------|-----------|
| YYYY-MM-DD | 1.0.0 | Setup inicial com kabran-config vX.Y.Z |

---

**Referencia:** [Kabran Config Setup Guide](https://github.com/kabran-owner/kabran-config)
