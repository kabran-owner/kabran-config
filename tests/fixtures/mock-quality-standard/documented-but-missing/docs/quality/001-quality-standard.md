---
title: Quality Standard
id: 01KEW4XE1FHYVH14HD1X9GE42B
type: quality
status: active
tags: [general]
version: 1.0.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# Quality Standard

> Este documento define a configuracao de qualidade do projeto.

## Configuracao Base

| Item | Valor |
|------|-------|
| **Pacote** | @kabran-tecnologia/kabran-config |
| **Versao** | 1.2.0 |

## Overrides Aplicados

> **Principio:** Nenhum padrao de qualidade pode ser relaxado sem justificativa tecnica documentada.

### OVR-001: no-console

| Campo | Valor |
|-------|-------|
| **Regra** | `no-console` |
| **Severidade Original** | error |
| **Severidade Aplicada** | off |
| **Arquivo** | `eslint.config.mjs` |

**Motivo:**
Este projeto e uma CLI que usa console.log para output ao usuario.

**Tracking:**

- Issue: N/A
- Aprovado por: @joao
- Data: 2026-01-13

**Condicao de Remocao:**
Permanente - natureza do projeto requer console output.

## Historico

| Data | Versao | Descricao |
|------|--------|-----------|
| 2026-01-13 | 1.0.0 | Setup inicial |
