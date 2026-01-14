# @kabran-tecnologia/kabran-config/telemetry

Unified telemetry package for Kabran projects using OpenTelemetry.

## Features

- **Multi-runtime support**: Node.js, Frontend (Browser), Edge/Serverless
- **OpenTelemetry integration**: W3C Trace Context, OTLP export
- **Zero-config defaults**: Works out of the box with sensible defaults
- **Structured logging**: Logger with automatic trace correlation
- **Tree-shakeable**: Import only what you need

## Installation

The telemetry modules are included in `@kabran-tecnologia/kabran-config`. Install the package and the required OpenTelemetry peer dependencies:

```bash
# Install kabran-config
npm install @kabran-tecnologia/kabran-config

# Install required peer dependencies (pick based on your runtime)

# For Node.js:
npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions

# For Frontend:
npm install @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-document-load @opentelemetry/instrumentation-user-interaction

# For Edge/Serverless:
npm install @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

## Quick Start

### Node.js (Express/Fastify)

```javascript
// instrumentation.js - Import this FIRST in your app
import { initTelemetry, telemetryMiddleware, shutdownTelemetry } from '@kabran-tecnologia/kabran-config/telemetry/node'

// Initialize telemetry
initTelemetry({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
})

// In your Express app
import express from 'express'
const app = express()

// Add telemetry middleware (creates spans for each request)
app.use(telemetryMiddleware())

app.get('/api/users', (req, res) => {
  // Your handler - automatically traced
  res.json({ users: [] })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownTelemetry()
  process.exit(0)
})
```

### Frontend (React/Vite)

```typescript
// main.tsx
import { initTelemetry } from '@kabran-tecnologia/kabran-config/telemetry/frontend'

// Initialize before rendering
initTelemetry({
  serviceName: 'my-frontend',
  serviceVersion: '1.0.0',
  // Optional: customize which events to trace
  instrumentation: {
    userInteractionEvents: ['click', 'submit'],
  },
})

// Your React app renders normally
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

### Edge/Serverless (Supabase Functions)

```typescript
// supabase/functions/my-function/index.ts
import { withTelemetry, traceSupabaseQuery } from '@kabran-tecnologia/kabran-config/telemetry/edge'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
)

// Wrap your handler with telemetry
Deno.serve(withTelemetry(
  {
    serviceName: 'my-edge-function',
    serviceVersion: '1.0.0',
  },
  async (req) => {
    // Trace Supabase queries
    const { data, error } = await traceSupabaseQuery(
      'select-users',
      () => supabase.from('users').select('*')
    )

    return new Response(JSON.stringify({ data, error }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
))
```

## Structured Logging

The logger automatically includes trace context in log output:

```javascript
import { createLogger } from '@kabran-tecnologia/kabran-config/telemetry/logger'

const log = createLogger()

log.info('User logged in', { userId: '123' })
// Output (JSON in production):
// {"level":"info","message":"User logged in","userId":"123","trace_id":"abc123...","span_id":"def456...","timestamp":"2024-01-13T..."}

// Output (pretty in development):
// 2024-01-13T12:00:00.000Z [INFO] User logged in [trace:abc123...] {"userId":"123"}
```

### Span-bound Logger

```javascript
import { trace } from '@opentelemetry/api'
import { createSpanLogger } from '@kabran-tecnologia/kabran-config/telemetry/logger'

const span = trace.getActiveSpan()
const log = createSpanLogger(span)

log.info('Processing order', { orderId: '456' })
// Logs are also added as span events for visibility in traces
```

## Configuration

### Environment Variables

All configuration can be set via environment variables:

```bash
# Core
SERVICE_NAME=my-service              # Required: Your service name
SERVICE_VERSION=1.0.0                # Service version (default: 1.0.0)
ENVIRONMENT=production               # Environment name (default: from NODE_ENV)
OTEL_NAMESPACE=kabran                # Service namespace (default: kabran)

# OTLP Exporter (REQUIRED)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector.example.com  # Your collector endpoint
OTEL_EXPORTER_OTLP_TIMEOUT=10000     # Export timeout in ms (default: 10000)

# Sampling
OTEL_SAMPLE_RATE=0.1                 # Sampling rate 0.0-1.0 (default: 0.1 = 10%)

# Enable/Disable
OTEL_ENABLED=true                    # Enable telemetry (default: true in production)

# Logger
OTEL_LOG_TRACE_ID_LENGTH=8           # Trace ID length in logs (default: 8)
NO_COLOR=1                           # Disable ANSI colors in logs
```

### Programmatic Configuration

```javascript
import { initTelemetry } from '@kabran-tecnologia/kabran-config/telemetry/node'

initTelemetry({
  // Required
  serviceName: 'my-service',

  // Optional (all have sensible defaults)
  serviceVersion: '1.0.0',
  environment: 'production',
  endpoint: process.env.OTEL_ENDPOINT, // Required - set via env var
  sampleRate: 0.1,
  enabled: true,

  // Resource attributes (added to all spans)
  resourceAttributes: {
    'deployment.environment': 'production',
    'service.instance.id': process.env.POD_NAME,
  },

  // Batch processor settings (Node.js only)
  batchProcessor: {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
  },
})
```

## Module Reference

### `telemetry/node`

For Node.js servers and long-running processes.

```javascript
import {
  initTelemetry,      // Initialize the tracer
  shutdownTelemetry,  // Graceful shutdown
  telemetryMiddleware,// Express/Fastify middleware
  isInitialized,      // Check if initialized
  getTracer,          // Get the tracer instance
  getConfig,          // Get resolved config
} from '@kabran-tecnologia/kabran-config/telemetry/node'
```

### `telemetry/frontend`

For browser applications (React, Vue, vanilla JS).

```javascript
import {
  initTelemetry,      // Initialize the tracer
  shutdownTelemetry,  // Flush pending spans
  isInitialized,      // Check if initialized
  getTracer,          // Get the tracer instance
  getConfig,          // Get resolved config
} from '@kabran-tecnologia/kabran-config/telemetry/frontend'
```

### `telemetry/edge`

For Edge Functions and serverless (Supabase, Deno Deploy, Cloudflare Workers).

```javascript
import {
  withTelemetry,      // Handler wrapper with auto-tracing
  traceSupabaseQuery, // Trace Supabase queries
  shutdownTelemetry,  // Flush pending spans
  isInitialized,      // Check if initialized
  getConfig,          // Get resolved config
} from '@kabran-tecnologia/kabran-config/telemetry/edge'
```

### `telemetry/logger`

Structured logger with trace correlation.

```javascript
import {
  createLogger,       // Create a logger instance
  createSpanLogger,   // Create a span-bound logger
  log,                // Default logger instance
  getTraceContext,    // Get current trace context
} from '@kabran-tecnologia/kabran-config/telemetry/logger'
```

### `telemetry/config`

Configuration utilities.

```javascript
import {
  defineTelemetryConfig,  // Create a type-safe config
  resolveConfig,          // Resolve config with defaults and env vars
  validateConfig,         // Validate config object
  detectEnabled,          // Check if telemetry should be enabled
} from '@kabran-tecnologia/kabran-config/telemetry/config'
```

### `telemetry/shared`

Shared utilities and types.

```javascript
import {
  setAttributes,         // Set multiple span attributes
  formatDuration,        // Format milliseconds to human-readable
  generateInvocationId,  // Generate unique invocation ID
  safeWarn,              // Safe console.warn
  safeLog,               // Safe console.log
} from '@kabran-tecnologia/kabran-config/telemetry/shared'
```

## Integration with Observability Stack

This package is designed to work with standard observability stacks:

- **Traces** → Grafana Tempo, Jaeger, or any OTLP-compatible backend
- **Logs** → Grafana Loki (via stdout/Promtail or direct export)
- **Metrics** → Prometheus (planned)

**Note:** You must configure `OTEL_ENDPOINT` to point to your OTLP collector.

### Viewing Traces

1. Open your observability dashboard (e.g., Grafana)
2. Go to Explore → Select your trace backend (Tempo, Jaeger, etc.)
3. Search by service name or trace ID

## Best Practices

### 1. Initialize Early

Initialize telemetry as early as possible in your application:

```javascript
// This should be the FIRST import
import './instrumentation.js'

// Then your app code
import express from 'express'
```

### 2. Use Meaningful Span Names

```javascript
// Good
span.updateName('user.create')
span.updateName('order.process')

// Bad
span.updateName('handler')
span.updateName('function1')
```

### 3. Add Relevant Attributes

```javascript
import { trace } from '@opentelemetry/api'

const span = trace.getActiveSpan()
span?.setAttributes({
  'user.id': userId,
  'order.id': orderId,
  'order.total': total,
})
```

### 4. Handle Errors Properly

```javascript
import { trace, SpanStatusCode } from '@opentelemetry/api'

try {
  // Your code
} catch (error) {
  const span = trace.getActiveSpan()
  span?.recordException(error)
  span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
  throw error
}
```

### 5. Graceful Shutdown

Always flush pending spans before shutdown:

```javascript
process.on('SIGTERM', async () => {
  await shutdownTelemetry()
  process.exit(0)
})
```

## Troubleshooting

### Traces not appearing

1. Check `OTEL_ENABLED` is not set to `false`
2. Verify `SERVICE_NAME` is set
3. Check network connectivity to the collector endpoint
4. Verify sampling rate (default is 10%)

### Missing trace correlation in logs

1. Ensure telemetry is initialized before logging
2. Check that you're within an active span context

### High memory usage

Reduce batch processor queue size:

```javascript
initTelemetry({
  serviceName: 'my-service',
  batchProcessor: {
    maxQueueSize: 512,  // Lower from default 2048
  },
})
```

## Related Documentation

- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
