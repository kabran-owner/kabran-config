---
title: Quality Standard
id: 01KEW4X9BZNSVDKT3VVCZ4SYQF
type: quality
status: active
tags: [typescript]
version: 1.0.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# Quality Standard

> Este documento define a configuracao de qualidade do projeto e documenta quaisquer excecoes aos padroes Kabran.

## Configuracao Base

| Item | Valor |
|------|-------|
| **Pacote** | @kabran-tecnologia/kabran-config |
| **Versao** | 1.2.0 |
| **Preset ESLint** | node |
| **Preset TypeScript** | node |

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

## Overrides Aplicados

> **Principio:** Nenhum padrao de qualidade pode ser relaxado sem justificativa tecnica documentada.

### Nenhum override aplicado

Este projeto segue 100% dos padroes definidos no kabran-config.

## Historico

| Data | Versao | Descricao |
|------|--------|-----------|
| 2026-01-13 | 1.0.0 | Setup inicial com kabran-config v1.2.0 |
