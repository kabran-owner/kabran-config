---
title: PROP-005: Observability Reference Implementation
id: 01JH6OBSREF005CIEIMPL
type: proposal
status: draft
tags: [observability, opentelemetry, reference, cie]
version: 0.1.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-005: Observability Reference Implementation

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-005 |
| **Title** | Observability Reference Implementation |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Reference Project** | CIE (Compliance-e) |

## Summary

Documentacao de referencia para implementacao de observabilidade em projetos Kabran, usando o projeto CIE como caso de estudo.

## Standards Relacionados

| Standard | Titulo | Status no CIE |
|----------|--------|---------------|
| [std-ops-003](../../../nexus/standards/lifecycle-operations/std-ops-003-observability-frontend.md) | Frontend Telemetry | Implementado |
| [std-ops-004](../../../nexus/standards/lifecycle-operations/std-ops-004-observability-edge.md) | Edge Functions Telemetry | Parcial (75%) |

## Implementacao de Referencia: CIE

### Localizacao do Projeto

```
/home/joaohenrique/kabran/galaxy/projects/cie/
```

### Frontend Telemetry (std-ops-003)

| App | Arquivo | Status |
|-----|---------|--------|
| apps/app | `src/lib/telemetry.ts` | Implementado |
| apps/website | `src/lib/telemetry.ts` | Implementado |

**Inicializacao:**

- `apps/app/src/main.tsx` - chama `initTelemetry()`
- `apps/website/src/main.tsx` - chama `initTelemetry()`

### Edge Functions Telemetry (std-ops-004)

**Modulo compartilhado:** `supabase/functions/_shared/telemetry.ts`

| Edge Function | Instrumentada |
|---------------|---------------|
| analytics | Sim |
| cleanup-expired-data | Sim |
| generate-tracking-token | Sim |
| lgpd-delete-request | Sim |
| lgpd-export-data | Sim |
| process-pending-notifications | Sim |
| send-notification | Sim |
| update-report-status | Sim |
| validate-tracking-token | Sim |
| send-website-email | **Nao** |
| submit-lead | **Nao** |
| validate-upload | **Nao** |

**Cobertura:** 9/12 (75%)

## Arquivos de Referencia

### Frontend

```
cie/
├── apps/
│   ├── app/
│   │   └── src/
│   │       ├── lib/
│   │       │   └── telemetry.ts      # 7.9KB - Modulo OTel
│   │       └── main.tsx              # Inicializacao
│   └── website/
│       └── src/
│           ├── lib/
│           │   └── telemetry.ts      # 7.6KB - Modulo OTel
│           └── main.tsx              # Inicializacao
```

### Edge Functions

```
cie/
└── supabase/
    └── functions/
        ├── _shared/
        │   └── telemetry.ts          # 13.5KB - Modulo compartilhado
        ├── analytics/
        │   └── index.ts              # Usa telemetry.ts
        ├── generate-tracking-token/
        │   └── index.ts              # Usa telemetry.ts
        └── ...
```

## Gaps Identificados

### Edge Functions sem instrumentacao

As seguintes functions precisam ser instrumentadas:

1. **send-website-email** - Envio de emails do website
2. **submit-lead** - Captura de leads
3. **validate-upload** - Validacao de uploads

### Padrao de instrumentacao

```typescript
// Exemplo de instrumentacao esperada
import {
  createTracer,
  createLogger,
  SpanStatusCode,
  type Span,
} from '../_shared/telemetry.ts'

const tracer = createTracer('nome-da-funcao')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return await tracer.trace(req, async (span: Span) => {
    const log = createLogger(span)

    try {
      span.addEvent('function_started')
      // ... logica ...
      span.addEvent('function_completed')
      return new Response(...)
    } catch (error) {
      span.recordException(error as Error)
      log.error('Error', { error: error.message })
      return new Response(...)
    }
  })
})
```

## Proximos Passos

- [ ] Instrumentar 3 edge functions faltantes no CIE
- [ ] Validar integracao com otel.kabran.com.br
- [ ] Documentar metricas e dashboards disponiveis
- [ ] Definir checklist de validacao para novos projetos

## Referencias

- [Nexus std-ops-003](../../../nexus/standards/lifecycle-operations/std-ops-003-observability-frontend.md)
- [Nexus std-ops-004](../../../nexus/standards/lifecycle-operations/std-ops-004-observability-edge.md)
- [OpenTelemetry Web SDK](https://opentelemetry.io/docs/instrumentation/js/getting-started/browser/)
- [Projeto CIE](../../../projects/cie/)

---

## Changelog

| Versao | Data | Mudancas |
|--------|------|----------|
| 0.1.0 | 2026-01-13 | Versao inicial - referencia CIE |
