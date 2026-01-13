/**
 * Node.js Telemetry Module
 *
 * OpenTelemetry integration for Node.js backend applications.
 * Uses BatchSpanProcessor for efficient span export.
 *
 * @module telemetry/node
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { initTelemetry, telemetryMiddleware } from '@kabran-tecnologia/kabran-config/telemetry/node'
 *
 * initTelemetry({ serviceName: 'api-server' })
 *
 * const app = express()
 * app.use(telemetryMiddleware())
 * ```
 */

import { resolveConfig } from '../config/index.mjs'
import {
  getTracesPath,
  getExportTimeoutNode,
  getBspConfigNode,
  getIgnorePaths,
  DEFAULT_SERVICE_VERSION,
  DEFAULT_TRACER_NAME_NODE,
} from '../config/defaults.mjs'
import { recordError, setAttributes, generateInvocationId, safeWarn, safeLog } from '../shared/helpers.mjs'

// State
let provider = null
let initialized = false
let resolvedConfig = null

/**
 * Initialize OpenTelemetry for Node.js
 *
 * @param {import('../shared/types').TelemetryConfig} config - Configuration
 * @returns {Promise<void>}
 */
export async function initTelemetry(config = {}) {
  if (initialized) return

  if (!config.serviceName && !process.env.SERVICE_NAME) {
    safeWarn('[Telemetry] Skipped: serviceName is required')
    return
  }

  resolvedConfig = resolveConfig(
    { serviceName: config.serviceName || process.env.SERVICE_NAME, ...config },
    process.env,
    process.env.NODE_ENV || 'development'
  )

  if (!resolvedConfig.enabled) {
    safeWarn('[Telemetry] Skipped: disabled')
    return
  }

  if (!resolvedConfig.endpoint) {
    safeWarn('[Telemetry] Skipped: no endpoint configured')
    return
  }

  try {
    const [
      { trace, context, propagation, SpanStatusCode },
      { NodeTracerProvider },
      { BatchSpanProcessor, TraceIdRatioBasedSampler },
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
        ...resolvedConfig.resourceAttributes,
      }),
      sampler: new TraceIdRatioBasedSampler(resolvedConfig.sampleRate),
    })

    const exporter = new OTLPTraceExporter({
      url: `${resolvedConfig.endpoint}${getTracesPath()}`,
      timeoutMillis: getExportTimeoutNode(),
    })

    // Use BatchSpanProcessor for efficiency in long-running processes
    provider.addSpanProcessor(
      new BatchSpanProcessor(exporter, getBspConfigNode())
    )

    // Configure W3C Trace Context propagation
    propagation.setGlobalPropagator(new W3CTraceContextPropagator())

    provider.register()
    initialized = true

    // Graceful shutdown on process exit
    process.on('SIGTERM', async () => {
      await shutdownTelemetry()
    })

    process.on('SIGINT', async () => {
      await shutdownTelemetry()
    })

    safeLog(
      `[Telemetry] Initialized: ${resolvedConfig.serviceName}@${resolvedConfig.serviceVersion} (${resolvedConfig.environment})`
    )
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
  return trace.getTracer(
    name || resolvedConfig?.serviceName || DEFAULT_TRACER_NAME_NODE,
    resolvedConfig?.serviceVersion || DEFAULT_SERVICE_VERSION
  )
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
 * Express/Fastify compatible middleware for automatic request tracing
 *
 * @param {Object} [options] - Middleware options
 * @param {string[]} [options.ignorePaths] - Paths to ignore (e.g., ['/health', '/ready'])
 * @returns {Function} Middleware function
 */
export function telemetryMiddleware(options = {}) {
  const { ignorePaths = getIgnorePaths() } = options

  return async (req, res, next) => {
    // Skip ignored paths
    const path = req.path || req.url
    if (ignorePaths.some((p) => path.startsWith(p))) {
      return next()
    }

    // Skip if not initialized
    if (!initialized || !resolvedConfig?.enabled) {
      return next()
    }

    const { trace, context, propagation, SpanStatusCode } = await import('@opentelemetry/api')
    const {
      SEMATTRS_HTTP_METHOD,
      SEMATTRS_HTTP_URL,
      SEMATTRS_HTTP_STATUS_CODE,
      SEMATTRS_HTTP_ROUTE,
      SEMATTRS_HTTP_USER_AGENT,
    } = await import('@opentelemetry/semantic-conventions')

    // Extract parent context from headers
    const carrier = {}
    Object.keys(req.headers).forEach((key) => {
      carrier[key.toLowerCase()] = req.headers[key]
    })
    const parentContext = propagation.extract(context.active(), carrier)

    const tracer = getTracer()
    const span = tracer.startSpan(
      `${req.method} ${path}`,
      {
        attributes: {
          [SEMATTRS_HTTP_METHOD]: req.method,
          [SEMATTRS_HTTP_URL]: req.originalUrl || req.url,
          [SEMATTRS_HTTP_ROUTE]: req.route?.path || path,
          [SEMATTRS_HTTP_USER_AGENT]: req.headers['user-agent'] || 'unknown',
          'http.request_id': generateInvocationId(),
        },
      },
      parentContext
    )

    const startTime = Date.now()

    // Inject trace context for downstream services
    propagation.inject(trace.setSpan(context.active(), span), req.headers)

    // Store span on request for access in handlers
    req.span = span
    req.traceId = span.spanContext().traceId

    // Hook into response finish
    const originalEnd = res.end
    res.end = function (...args) {
      span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, res.statusCode)
      span.setAttribute('http.response_time_ms', Date.now() - startTime)

      if (res.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${res.statusCode}` })
      } else {
        span.setStatus({ code: SpanStatusCode.OK })
      }

      span.end()
      return originalEnd.apply(this, args)
    }

    // Execute within span context
    context.with(trace.setSpan(parentContext, span), () => {
      next()
    })
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
    safeLog('[Telemetry] Shutting down...')
    await provider.shutdown()
    initialized = false
    provider = null
    safeLog('[Telemetry] Shutdown complete')
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

// Re-exports
export { resolveConfig } from '../config/index.mjs'
