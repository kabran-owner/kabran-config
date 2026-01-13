/**
 * Edge Functions Telemetry Module
 *
 * OpenTelemetry integration for serverless/edge functions (Supabase, Deno, Cloudflare).
 * Uses SimpleSpanProcessor for immediate export before function termination.
 *
 * @module telemetry/edge
 *
 * @example
 * ```typescript
 * import { serve } from 'https://deno.land/std/http/server.ts'
 * import { withTelemetry, traceSupabaseQuery } from '@kabran-tecnologia/kabran-config/telemetry/edge'
 *
 * serve(withTelemetry('my-function', async (req, span) => {
 *   const result = await traceSupabaseQuery('select', 'users', () =>
 *     supabase.from('users').select()
 *   )
 *   return new Response(JSON.stringify(result.data))
 * }))
 * ```
 */

import { resolveConfig } from '../config/index.mjs'
import { recordError, setAttributes, generateInvocationId, safeWarn, safeLog } from '../shared/helpers.mjs'

// State
let provider = null
let initialized = false
let resolvedConfig = null

/**
 * Initialize provider for edge function
 *
 * @param {string} serviceName - Service/function name
 * @param {import('../shared/types').TelemetryConfig} [config] - Additional config
 */
async function initProvider(serviceName, config = {}) {
  if (initialized) return

  // Get environment (Deno-style)
  const env = typeof Deno !== 'undefined' ? {
    OTEL_ENDPOINT: Deno.env.get('OTEL_ENDPOINT'),
    SERVICE_VERSION: Deno.env.get('SERVICE_VERSION'),
    ENVIRONMENT: Deno.env.get('ENVIRONMENT'),
    OTEL_ENABLED: Deno.env.get('OTEL_ENABLED'),
  } : typeof process !== 'undefined' ? process.env : {}

  resolvedConfig = resolveConfig(
    { serviceName, ...config },
    env,
    env.ENVIRONMENT || 'production'
  )

  // Default enabled for edge (production-like)
  if (resolvedConfig.enabled === false && env.OTEL_ENABLED !== 'false') {
    resolvedConfig.enabled = true
  }

  if (!resolvedConfig.enabled) return

  try {
    // Dynamic imports for Deno compatibility
    const [
      { trace, context, propagation, SpanStatusCode },
      { NodeTracerProvider },
      { SimpleSpanProcessor },
      { OTLPTraceExporter },
      { Resource },
      {
        SEMRESATTRS_SERVICE_NAME,
        SEMRESATTRS_SERVICE_VERSION,
        SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
      },
      { W3CTraceContextPropagator },
    ] = await Promise.all([
      import('@opentelemetry/api'),
      import('@opentelemetry/sdk-trace-node'),
      import('@opentelemetry/sdk-trace-base'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      import('@opentelemetry/core'),
    ])

    provider = new NodeTracerProvider({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: resolvedConfig.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: resolvedConfig.serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: resolvedConfig.environment,
        'service.namespace': resolvedConfig.namespace,
        'faas.name': serviceName,
        'faas.runtime': typeof Deno !== 'undefined' ? 'deno' : 'node',
        ...resolvedConfig.resourceAttributes,
      }),
    })

    const exporter = new OTLPTraceExporter({
      url: `${resolvedConfig.endpoint}/v1/traces`,
      timeoutMillis: 5000,
    })

    // Use SimpleSpanProcessor for serverless (immediate export)
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

    // Configure W3C Trace Context propagation
    propagation.setGlobalPropagator(new W3CTraceContextPropagator())

    provider.register()
    initialized = true

    safeLog(`[Telemetry] Initialized: ${resolvedConfig.serviceName}@${resolvedConfig.serviceVersion}`)
  } catch (error) {
    safeWarn('[Telemetry] Failed to initialize:', error)
  }
}

/**
 * Get a tracer instance
 *
 * @param {string} [name] - Tracer name
 * @returns {import('@opentelemetry/api').Tracer}
 */
export function getTracer(name) {
  const { trace } = require('@opentelemetry/api')
  return trace.getTracer(name || resolvedConfig?.serviceName || 'kabran-edge', resolvedConfig?.serviceVersion || '1.0.0')
}

/**
 * Get the currently active span
 *
 * @returns {import('@opentelemetry/api').Span|undefined}
 */
export function getCurrentSpan() {
  const { trace } = require('@opentelemetry/api')
  return trace.getActiveSpan()
}

/**
 * Get trace ID from current span
 *
 * @returns {string|undefined}
 */
export function getTraceId() {
  return getCurrentSpan()?.spanContext().traceId
}

/**
 * Extract trace context from incoming request headers
 *
 * @param {Headers} headers - Request headers
 * @returns {import('@opentelemetry/api').Context}
 */
export function extractContext(headers) {
  const { context, propagation } = require('@opentelemetry/api')
  const carrier = {}
  headers.forEach((value, key) => {
    carrier[key.toLowerCase()] = value
  })
  return propagation.extract(context.active(), carrier)
}

/**
 * Inject trace context into outgoing request headers
 *
 * @param {Headers} headers - Headers to inject into
 */
export function injectContext(headers) {
  const { context, propagation } = require('@opentelemetry/api')
  const carrier = {}
  propagation.inject(context.active(), carrier)
  Object.entries(carrier).forEach(([key, value]) => {
    headers.set(key, value)
  })
}

/**
 * Create a span for tracking an operation
 *
 * @template T
 * @param {string} name - Span name
 * @param {(span: import('@opentelemetry/api').Span) => T} fn - Function to execute
 * @param {Record<string, string|number|boolean>} [attributes] - Initial attributes
 * @returns {T}
 */
export function createSpan(name, fn, attributes) {
  const tracer = getTracer()
  const { SpanStatusCode } = require('@opentelemetry/api')

  return tracer.startActiveSpan(name, (span) => {
    if (attributes) {
      setAttributes(span, attributes)
    }

    try {
      const result = fn(span)

      if (result instanceof Promise) {
        return result
          .then((value) => {
            span.setStatus({ code: SpanStatusCode.OK })
            span.end()
            return value
          })
          .catch((error) => {
            recordError(span, error, SpanStatusCode)
            span.end()
            throw error
          })
      }

      span.setStatus({ code: SpanStatusCode.OK })
      span.end()
      return result
    } catch (error) {
      recordError(span, error, SpanStatusCode)
      span.end()
      throw error
    }
  })
}

/**
 * Create an async span
 *
 * @template T
 * @param {string} name - Span name
 * @param {(span: import('@opentelemetry/api').Span) => Promise<T>} fn - Async function
 * @param {Record<string, string|number|boolean>} [attributes] - Initial attributes
 * @returns {Promise<T>}
 */
export async function createAsyncSpan(name, fn, attributes) {
  const tracer = getTracer()
  const { trace, context, SpanStatusCode } = require('@opentelemetry/api')

  const span = tracer.startSpan(name)

  if (attributes) {
    setAttributes(span, attributes)
  }

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span))
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    recordError(span, error, SpanStatusCode)
    throw error
  } finally {
    span.end()
  }
}

/**
 * Wrap a request handler with automatic telemetry instrumentation
 *
 * @param {string} functionName - Function name (used as service name)
 * @param {import('../shared/types').EdgeHandler} handler - Request handler
 * @param {import('../shared/types').TelemetryConfig} [config] - Additional config
 * @returns {(req: Request) => Promise<Response>}
 */
export function withTelemetry(functionName, handler, config = {}) {
  return async (req) => {
    // Initialize provider
    await initProvider(functionName, config)

    const { trace, context, SpanStatusCode } = await import('@opentelemetry/api')
    const {
      SEMATTRS_HTTP_METHOD,
      SEMATTRS_HTTP_URL,
      SEMATTRS_HTTP_STATUS_CODE,
      SEMATTRS_HTTP_USER_AGENT,
    } = await import('@opentelemetry/semantic-conventions')

    // Skip telemetry for OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      const noopSpan = trace.getTracer(functionName).startSpan('cors-preflight')
      try {
        return await handler(req, noopSpan)
      } finally {
        noopSpan.end()
      }
    }

    // Skip if disabled
    if (!resolvedConfig?.enabled) {
      const noopSpan = trace.getTracer(functionName).startSpan('noop')
      try {
        return await handler(req, noopSpan)
      } finally {
        noopSpan.end()
      }
    }

    const tracer = getTracer(functionName)
    const parentContext = extractContext(req.headers)

    const span = tracer.startSpan(
      `${functionName}.handler`,
      {
        attributes: {
          [SEMATTRS_HTTP_METHOD]: req.method,
          [SEMATTRS_HTTP_URL]: req.url,
          [SEMATTRS_HTTP_USER_AGENT]: req.headers.get('user-agent') || 'unknown',
          'faas.trigger': 'http',
          'faas.invocation_id': generateInvocationId(),
        },
      },
      parentContext
    )

    const startTime = Date.now()

    try {
      const response = await context.with(
        trace.setSpan(parentContext, span),
        () => handler(req, span)
      )

      span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, response.status)
      span.setAttribute('http.response_content_length', response.headers.get('content-length') || '0')
      span.setAttribute('faas.duration_ms', Date.now() - startTime)

      if (response.status >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` })
      } else {
        span.setStatus({ code: SpanStatusCode.OK })
      }

      return response
    } catch (error) {
      recordError(span, error, SpanStatusCode)
      span.setAttribute('faas.duration_ms', Date.now() - startTime)

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          trace_id: span.spanContext().traceId,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } finally {
      span.end()

      // Force flush for serverless
      if (provider) {
        try {
          await provider.forceFlush()
        } catch {
          // Ignore flush errors
        }
      }
    }
  }
}

/**
 * Wrap a Supabase query with telemetry
 *
 * @template T
 * @param {string} operation - Operation type (select, insert, update, delete)
 * @param {string} table - Table name
 * @param {() => Promise<{data: T, error: Error|null}>} fn - Query function
 * @returns {Promise<{data: T, error: Error|null}>}
 */
export async function traceSupabaseQuery(operation, table, fn) {
  return createAsyncSpan(
    `supabase.${operation}`,
    async (span) => {
      span.setAttribute('db.system', 'postgresql')
      span.setAttribute('db.name', 'supabase')
      span.setAttribute('db.operation', operation)
      span.setAttribute('db.sql.table', table)

      const result = await fn()

      const { SpanStatusCode } = await import('@opentelemetry/api')

      if (result.error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error.message })
        span.setAttribute('db.error', result.error.message)
      } else {
        span.setStatus({ code: SpanStatusCode.OK })
        if (Array.isArray(result.data)) {
          span.setAttribute('db.result_count', result.data.length)
        }
      }

      return result
    },
    { 'db.system': 'postgresql' }
  )
}

/**
 * Add an event to the current span
 *
 * @param {string} name - Event name
 * @param {Record<string, string|number|boolean>} [attributes] - Event attributes
 */
export function addSpanEvent(name, attributes) {
  const span = getCurrentSpan()
  span?.addEvent(name, attributes)
}

/**
 * Set attributes on the current span
 *
 * @param {Record<string, string|number|boolean>} attributes - Attributes to set
 */
export function setSpanAttributes(attributes) {
  const span = getCurrentSpan()
  if (span) {
    setAttributes(span, attributes)
  }
}

/**
 * Shutdown telemetry provider
 *
 * @returns {Promise<void>}
 */
export async function shutdownTelemetry() {
  if (provider) {
    await provider.shutdown()
    initialized = false
    provider = null
  }
}

// Re-exports
export { resolveConfig } from '../config/index.mjs'
