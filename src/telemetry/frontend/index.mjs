/**
 * Frontend Telemetry Module
 *
 * OpenTelemetry integration for browser/frontend applications.
 * Provides distributed tracing, error tracking, and performance monitoring.
 *
 * @module telemetry/frontend
 *
 * @example
 * ```typescript
 * import { initTelemetry, createSpan } from '@kabran-tecnologia/kabran-config/telemetry/frontend'
 *
 * // Initialize at app startup (main.tsx)
 * initTelemetry({ serviceName: 'my-app' })
 *
 * // Create custom spans
 * const result = createSpan('calculate.total', (span) => {
 *   span.setAttribute('item.count', items.length)
 *   return calculateTotal(items)
 * })
 * ```
 */

import { resolveConfig, detectEnabled } from '../config/index.mjs'
import { recordError, setAttributes, safeWarn, safeLog } from '../shared/helpers.mjs'

// State
let provider = null
let initialized = false
let resolvedConfig = null

/**
 * Initialize OpenTelemetry for frontend
 *
 * @param {import('../shared/types').TelemetryConfig} [config] - Configuration options
 * @returns {Promise<void>}
 */
export async function initTelemetry(config = {}) {
  if (initialized) return

  // Skip in test environment
  if (typeof window === 'undefined') return
  if (import.meta?.env?.MODE === 'test') return

  // Resolve configuration
  const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {}
  const mode = env.MODE || 'development'

  // Require serviceName
  if (!config.serviceName && !env.VITE_SERVICE_NAME) {
    safeWarn('[Telemetry] Skipped: serviceName is required')
    return
  }

  resolvedConfig = resolveConfig(
    { serviceName: config.serviceName || env.VITE_SERVICE_NAME, ...config },
    env,
    mode
  )

  // Skip if disabled
  if (!resolvedConfig.enabled) {
    safeWarn('[Telemetry] Skipped: disabled')
    return
  }

  // Skip if no endpoint
  if (!resolvedConfig.endpoint) {
    safeWarn('[Telemetry] Skipped: no endpoint configured')
    return
  }

  try {
    // Dynamic imports to avoid bundling when not used
    const [
      { trace, context, SpanStatusCode },
      { OTLPTraceExporter },
      { registerInstrumentations },
      { Resource },
      { BatchSpanProcessor, TraceIdRatioBasedSampler },
      { WebTracerProvider },
      {
        SEMRESATTRS_SERVICE_NAME,
        SEMRESATTRS_SERVICE_VERSION,
        SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
      },
    ] = await Promise.all([
      import('@opentelemetry/api'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/instrumentation'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/sdk-trace-base'),
      import('@opentelemetry/sdk-trace-web'),
      import('@opentelemetry/semantic-conventions'),
    ])

    provider = new WebTracerProvider({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: resolvedConfig.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: resolvedConfig.serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: resolvedConfig.environment,
        'service.namespace': resolvedConfig.namespace,
        ...resolvedConfig.resourceAttributes,
      }),
      sampler: new TraceIdRatioBasedSampler(resolvedConfig.sampleRate),
    })

    const exporter = new OTLPTraceExporter({
      url: `${resolvedConfig.endpoint}/v1/traces`,
    })

    provider.addSpanProcessor(
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 500,
      })
    )

    provider.register()

    // Setup auto-instrumentation
    const instrumentations = []

    if (resolvedConfig.instrumentation.fetch) {
      const { FetchInstrumentation } = await import('@opentelemetry/instrumentation-fetch')
      instrumentations.push(
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: resolvedConfig.propagateTraceHeaderCorsUrls,
          clearTimingResources: true,
        })
      )
    }

    if (resolvedConfig.instrumentation.documentLoad) {
      const { DocumentLoadInstrumentation } = await import('@opentelemetry/instrumentation-document-load')
      instrumentations.push(new DocumentLoadInstrumentation())
    }

    if (resolvedConfig.instrumentation.userInteraction) {
      const { UserInteractionInstrumentation } = await import('@opentelemetry/instrumentation-user-interaction')
      instrumentations.push(
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit'],
        })
      )
    }

    if (instrumentations.length > 0) {
      registerInstrumentations({ instrumentations })
    }

    // Setup error handlers
    setupErrorHandlers()

    initialized = true
    safeLog(
      `[Telemetry] Initialized: ${resolvedConfig.serviceName}@${resolvedConfig.serviceVersion} (${resolvedConfig.environment})`
    )
  } catch (error) {
    safeWarn('[Telemetry] Failed to initialize:', error)
  }
}

/**
 * Setup global error handlers
 */
function setupErrorHandlers() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    const tracer = getTracer()
    const span = tracer.startSpan('error.uncaught')
    span.setAttribute('error.type', 'uncaught')
    span.setAttribute('error.message', event.message)
    span.setAttribute('error.filename', event.filename || 'unknown')
    span.setAttribute('error.lineno', event.lineno || 0)
    import('@opentelemetry/api').then(({ SpanStatusCode }) => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: event.message })
      span.end()
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const tracer = getTracer()
    const span = tracer.startSpan('error.unhandled_rejection')
    span.setAttribute('error.type', 'unhandled_rejection')
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
    span.setAttribute('error.reason', reason)
    import('@opentelemetry/api').then(({ SpanStatusCode }) => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: reason })
      span.end()
    })
  })
}

/**
 * Get a tracer instance
 *
 * @param {string} [name] - Tracer name (default: service name)
 * @returns {import('@opentelemetry/api').Tracer}
 */
export function getTracer(name) {
  const { trace } = require('@opentelemetry/api')
  const tracerName = name || resolvedConfig?.serviceName || 'kabran-telemetry'
  const version = resolvedConfig?.serviceVersion || '1.0.0'
  return trace.getTracer(tracerName, version)
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
  const span = getCurrentSpan()
  return span?.spanContext().traceId
}

/**
 * Create a span for tracking an operation
 *
 * @template T
 * @param {string} name - Span name
 * @param {(span: import('@opentelemetry/api').Span) => T} fn - Function to execute within span
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
 * Create an async span for tracking asynchronous operations
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
 * Shutdown telemetry provider gracefully
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

/**
 * Check if telemetry is initialized
 *
 * @returns {boolean}
 */
export function isInitialized() {
  return initialized
}

/**
 * Get current configuration
 *
 * @returns {import('../shared/types').ResolvedTelemetryConfig|null}
 */
export function getConfig() {
  return resolvedConfig
}

// Re-export useful types and utilities
export { resolveConfig } from '../config/index.mjs'
