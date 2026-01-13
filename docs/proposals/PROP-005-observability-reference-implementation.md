---
title: PROP-005: Telemetry Package
id: 01JH6OBSREF005TELEMETRY
type: proposal
status: draft
tags: [observability, opentelemetry, telemetry, package]
version: 0.2.1
created_at: 2026-01-13
updated_at: 2026-01-13
---

# PROP-005: Telemetry Package

## Metadata

| Field | Value |
|-------|-------|
| **ID** | PROP-005 |
| **Title** | Telemetry Package |
| **Status** | Draft |
| **Created** | 2026-01-13 |
| **Target Version** | 1.7.0 |
| **Depends On** | PROP-003, PROP-004 |
| **Reference Project** | CIE (Compliance-e) |

## Summary

Empacotar infraestrutura de telemetria OpenTelemetry no kabran-config, permitindo que projetos Kabran implementem observabilidade completa via imports padronizados, conectando metricas de CI/CD com traces de runtime.

## Motivation

### Problema Atual

1. **Codigo duplicado** - Cada projeto copia ~30KB de codigo de telemetria do CIE
2. **Drift de implementacao** - Projetos divergem do padrao ao customizar
3. **CI desconectado de runtime** - ci-result.json nao conecta com traces OTel
4. **Setup complexo** - Configurar OTel requer conhecimento especializado
5. **Dependencias inconsistentes** - Versoes de @opentelemetry/* variam entre projetos

### Visao: Observability Unificada

```
┌─────────────────────────────────────────────────────────────────┐
│                    kabran-config                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CI Observability (PROP-003/004)    App Telemetry (PROP-005)   │
│  ┌─────────────────────────┐        ┌─────────────────────────┐│
│  │ ci-result.json          │        │ OpenTelemetry Traces    ││
│  │ - timing per step       │        │ - frontend (browser)    ││
│  │ - coverage aggregation  │        │ - edge (serverless)     ││
│  │ - quality score         │◄──────►│ - node (backend)        ││
│  │ - PR comments           │        │ - logger integration    ││
│  └─────────────────────────┘        └─────────────────────────┘│
│              │                                │                 │
│              └────────────┬───────────────────┘                 │
│                           ▼                                     │
│              ┌─────────────────────────┐                        │
│              │   otel.kabran.com.br    │                        │
│              │   (Unified Backend)     │                        │
│              └─────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Impacto Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Setup telemetria | ~2 horas | ~5 minutos |
| Codigo duplicado | 30KB/projeto | 0 |
| Versoes OTel | Inconsistentes | Centralizadas |
| CI + Runtime | Desconectados | Correlacionados |

## Design

### Package Exports

```json
{
  "exports": {
    "./telemetry/frontend": "./src/telemetry/frontend/index.mjs",
    "./telemetry/edge": "./src/telemetry/edge/index.mjs",
    "./telemetry/node": "./src/telemetry/node/index.mjs",
    "./telemetry/logger": "./src/telemetry/logger/index.mjs",
    "./telemetry/config": "./src/telemetry/config/index.mjs"
  }
}
```

### Estrutura de Arquivos

```
src/telemetry/
├── config/
│   ├── index.mjs           # Config exports
│   ├── schema.mjs          # Zod validation schema
│   └── defaults.mjs        # Smart defaults
├── frontend/
│   ├── index.mjs           # Main exports
│   ├── provider.mjs        # WebTracerProvider setup
│   ├── instrumentation.mjs # Auto-instrumentation
│   └── helpers.mjs         # createSpan, etc.
├── edge/
│   ├── index.mjs           # Main exports (Deno-compatible)
│   ├── provider.mjs        # NodeTracerProvider (simple processor)
│   ├── wrapper.mjs         # withTelemetry HOF
│   └── supabase.mjs        # traceSupabaseQuery
├── node/
│   ├── index.mjs           # Main exports
│   ├── provider.mjs        # NodeTracerProvider (batch processor)
│   └── middleware.mjs      # Express/Fastify middleware
├── logger/
│   ├── index.mjs           # Logger with trace correlation
│   └── formatters.mjs      # Log formatters
└── shared/
    ├── context.mjs         # Context propagation
    ├── attributes.mjs      # Semantic conventions
    └── types.d.ts          # TypeScript types
```

### Configuration Interface

```typescript
// telemetry.config.ts (projeto consumer)
import { defineTelemetryConfig } from '@kabran-tecnologia/kabran-config/telemetry/config'

export default defineTelemetryConfig({
  // Required
  serviceName: 'my-project',

  // Optional - smart defaults applied
  serviceVersion: '1.0.0',        // default: from package.json
  environment: 'production',       // default: from NODE_ENV
  endpoint: 'https://otel.kabran.com.br', // default: Kabran collector

  // Sampling
  sampleRate: 0.1,                // default: 0.1 (10%)

  // Feature flags
  enabled: true,                  // default: auto-detect (prod=true, dev=false)

  // CORS (frontend only)
  propagateTraceHeaderCorsUrls: [
    /.*\.supabase\.co/,
    /.*\.kabran\.com\.br/,
  ],

  // Custom attributes added to all spans
  resourceAttributes: {
    'deployment.region': 'us-east-1',
    'team.name': 'platform',
  },

  // Instrumentation options
  instrumentation: {
    fetch: true,                  // default: true
    documentLoad: true,           // default: true (frontend)
    userInteraction: true,        // default: true (frontend)
    database: true,               // default: true (edge/node)
  },
})
```

### Config Resolution Order

```
1. Explicit config object (highest priority)
2. telemetry.config.ts/js file
3. Environment variables (OTEL_*, VITE_OTEL_*)
4. Smart defaults (lowest priority)
```

### Environment Variables

| Variable | Frontend (Vite) | Edge/Node | Default |
|----------|-----------------|-----------|---------|
| Endpoint | `VITE_OTEL_ENDPOINT` | `OTEL_ENDPOINT` | `https://otel.kabran.com.br` |
| Service Name | `VITE_SERVICE_NAME` | `SERVICE_NAME` | package.json name |
| Version | `VITE_SERVICE_VERSION` | `SERVICE_VERSION` | package.json version |
| Environment | `VITE_ENVIRONMENT` | `ENVIRONMENT` | `NODE_ENV` |
| Sample Rate | `VITE_OTEL_SAMPLE_RATE` | `OTEL_SAMPLE_RATE` | `0.1` |
| Enabled | `VITE_OTEL_ENABLED` | `OTEL_ENABLED` | auto-detect |

### Usage Examples

#### Frontend (React/Vite)

```typescript
// main.tsx
import { initTelemetry } from '@kabran-tecnologia/kabran-config/telemetry/frontend'

// Initialize before app renders
initTelemetry()

// Or with inline config
initTelemetry({
  serviceName: 'my-app',
  sampleRate: 0.5,
})
```

```typescript
// Component usage
import { createSpan, createAsyncSpan } from '@kabran-tecnologia/kabran-config/telemetry/frontend'

// Sync operation
const result = createSpan('calculate.total', () => {
  return calculateTotal(items)
}, { itemCount: items.length })

// Async operation
const data = await createAsyncSpan('api.fetchUsers', async (span) => {
  const users = await api.getUsers()
  span.setAttribute('user.count', users.length)
  return users
})
```

#### Edge Functions (Supabase/Deno)

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  withTelemetry,
  traceSupabaseQuery,
  createLogger
} from '@kabran-tecnologia/kabran-config/telemetry/edge'

serve(withTelemetry('my-function', async (req, span) => {
  const log = createLogger(span)

  log.info('Processing request')

  const result = await traceSupabaseQuery('select', 'users', async () => {
    return await supabase.from('users').select('*')
  })

  span.setAttribute('result.count', result.data?.length ?? 0)

  return new Response(JSON.stringify(result.data))
}))
```

#### Node.js Backend

```typescript
// server.ts
import express from 'express'
import {
  initTelemetry,
  telemetryMiddleware
} from '@kabran-tecnologia/kabran-config/telemetry/node'

initTelemetry({ serviceName: 'api-server' })

const app = express()
app.use(telemetryMiddleware())

app.get('/users', async (req, res) => {
  // Spans automatically created for each request
  res.json(await getUsers())
})
```

### CI/CD Integration

#### Trace ID in CI Result

```json
{
  "$schema": "https://kabran.dev/schemas/ci-result.v2.json",
  "meta": {
    "run_id": "uuid-v4",
    "trace_id": "abc123def456..."
  },
  "extensions": {
    "telemetry": {
      "trace_url": "https://otel.kabran.com.br/trace/abc123def456",
      "spans_exported": 42,
      "errors_recorded": 0
    }
  }
}
```

#### CI Steps with Telemetry

```bash
# ci-config.sh
ci_steps() {
  # Telemetry auto-initialized if OTEL_ENDPOINT set
  run_step "app-test" "npm test" "test-results.json"

  # Test results include trace_id for correlation
  # CI result JSON links to trace for debugging
}
```

#### PR Comment with Trace Link

```markdown
## Quality Report

| Metric | Value |
|--------|-------|
| Score | 85 |
| Duration | 3m 45s |

**Trace:** [View in Jaeger](https://otel.kabran.com.br/trace/abc123)
```

### API Reference

#### Frontend Exports

```typescript
// Initialization
export function initTelemetry(config?: TelemetryConfig): void
export function shutdownTelemetry(): Promise<void>

// Tracer access
export function getTracer(name?: string): Tracer
export function getCurrentSpan(): Span | undefined
export function getTraceId(): string | undefined

// Span helpers
export function createSpan<T>(name: string, fn: () => T, attributes?: Attributes): T
export function createAsyncSpan<T>(name: string, fn: (span: Span) => Promise<T>, attributes?: Attributes): Promise<T>
export function addSpanEvent(name: string, attributes?: Attributes): void
export function setSpanAttributes(attributes: Attributes): void

// Re-exports from @opentelemetry/api
export { context, trace, SpanStatusCode } from '@opentelemetry/api'
```

#### Edge Exports

```typescript
// Handler wrapper
export function withTelemetry(
  name: string,
  handler: (req: Request, span: Span) => Promise<Response>
): (req: Request) => Promise<Response>

// Context propagation
export function extractContext(headers: Headers): Context
export function injectContext(headers: Headers): void

// Database tracing
export function traceSupabaseQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T>

// Logger
export function createLogger(span?: Span): Logger
```

#### Node Exports

```typescript
// Initialization
export function initTelemetry(config?: TelemetryConfig): void
export function shutdownTelemetry(): Promise<void>

// Middleware
export function telemetryMiddleware(options?: MiddlewareOptions): RequestHandler

// All frontend helpers also available
export * from '../frontend/helpers.mjs'
```

## Reference Implementation: CIE

### Current State

| Component | File | Size | Status |
|-----------|------|------|--------|
| Frontend (app) | `apps/app/src/lib/telemetry.ts` | 7.9KB | Reference |
| Frontend (website) | `apps/website/src/lib/telemetry.ts` | 7.6KB | Reference |
| Edge Functions | `supabase/functions/_shared/telemetry.ts` | 13.5KB | Reference |
| Logger | `supabase/functions/_shared/logger.ts` | 2.1KB | Reference |

### Extraction Plan

1. Copy CIE telemetry code as base
2. Abstract hardcoded values to config
3. Split into modular files
4. Add TypeScript types
5. Write unit tests
6. Update CIE to use package

## Dependencies

### Core (all environments)

```json
{
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/resources": "^1.30.0",
  "@opentelemetry/semantic-conventions": "^1.38.0"
}
```

### Frontend-specific

```json
{
  "@opentelemetry/sdk-trace-web": "^1.30.0",
  "@opentelemetry/sdk-trace-base": "^1.30.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.56.0",
  "@opentelemetry/instrumentation": "^0.56.0",
  "@opentelemetry/instrumentation-document-load": "^0.43.0",
  "@opentelemetry/instrumentation-fetch": "^0.56.0",
  "@opentelemetry/instrumentation-user-interaction": "^0.43.0"
}
```

### Edge/Node-specific

```json
{
  "@opentelemetry/sdk-trace-node": "^1.30.0",
  "@opentelemetry/core": "^1.30.0"
}
```

### Peer Dependencies Strategy

```json
{
  "peerDependencies": {
    "@opentelemetry/api": ">=1.9.0"
  },
  "peerDependenciesMeta": {
    "@opentelemetry/api": {
      "optional": true
    }
  }
}
```

Telemetria e opcional - projetos que nao usam nao precisam instalar dependencias.

## Implementation Phases

### Phase 1: Core & Config (v1.7.0)

- [ ] Create `src/telemetry/` structure
- [ ] Implement config schema and defaults
- [ ] Extract shared utilities (context, attributes)
- [ ] Add TypeScript types
- [ ] Unit tests for config

### Phase 2: Frontend Module (v1.7.0)

- [ ] Extract CIE frontend telemetry
- [ ] Abstract to configurable module
- [ ] Add instrumentation options
- [ ] Unit tests with mocked OTel
- [ ] Documentation

### Phase 3: Edge Module (v1.8.0)

- [ ] Extract CIE edge telemetry
- [ ] Create withTelemetry wrapper
- [ ] Add Supabase query tracing
- [ ] Deno compatibility testing
- [ ] Documentation

### Phase 4: Node Module (v1.8.0)

- [ ] Create Node.js provider
- [ ] Express/Fastify middleware
- [ ] Batch processor configuration
- [ ] Unit tests
- [ ] Documentation

### Phase 5: CI Integration (v1.9.0)

- [ ] Add trace_id to ci-result.json
- [ ] PR comment with trace links
- [ ] CI step instrumentation
- [ ] E2E testing with OTel collector

### Phase 6: Logger Module (v1.9.0)

- [ ] Extract logger with trace correlation
- [ ] Multiple output formats
- [ ] Log level configuration
- [ ] Integration tests

## Migration Guide

### From CIE-style to Package

**Before:**

```typescript
// Copy-pasted telemetry.ts (7.9KB)
import { initTelemetry, createSpan } from './lib/telemetry'
```

**After:**

```typescript
// 1 line import
import { initTelemetry, createSpan } from '@kabran-tecnologia/kabran-config/telemetry/frontend'
```

### Configuration Migration

**Before (env vars only):**

```env
VITE_OTEL_ENDPOINT=https://otel.kabran.com.br
VITE_SERVICE_NAME=my-app
```

**After (config file + env vars):**

```typescript
// telemetry.config.ts
export default defineTelemetryConfig({
  serviceName: 'my-app',
  // endpoint from env var still works
})
```

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bundle size increase | Medium | Medium | Tree-shaking, optional peer deps |
| Breaking changes OTel | Low | High | Pin versions, test matrix |
| Deno compatibility | Medium | Medium | Separate edge module, CI testing |
| Config complexity | Medium | Low | Smart defaults, validation errors |

## Success Metrics

| Metric | Target |
|--------|--------|
| Projects using package | 100% new projects |
| Setup time | < 5 minutes |
| Bundle size (frontend) | < 50KB gzipped |
| Test coverage | > 80% |
| Documentation | Complete API reference |

## References

- [CIE Telemetry Implementation](../../../projects/cie/)
- [Nexus std-ops-003](../../../nexus/standards/lifecycle-operations/std-ops-003-observability-frontend.md)
- [Nexus std-ops-004](../../../nexus/standards/lifecycle-operations/std-ops-004-observability-edge.md)
- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [PROP-003: Quality Status](./PROP-003-quality-status-automation.md)
- [PROP-004: CI Observability](./PROP-004-ci-observability-metrics.md)

---

## Changelog

| Versao | Data | Mudancas |
|--------|------|----------|
| 0.1.0 | 2026-01-13 | Versao inicial - referencia CIE |
| 0.2.0 | 2026-01-13 | Design completo do pacote telemetria |
