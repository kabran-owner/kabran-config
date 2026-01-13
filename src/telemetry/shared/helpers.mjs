/**
 * Shared Telemetry Helpers
 *
 * Common utilities used across all telemetry modules.
 *
 * @module telemetry/shared/helpers
 */

/**
 * Record an error on a span with full details
 *
 * @param {import('@opentelemetry/api').Span} span - Span to record error on
 * @param {Error|unknown} error - Error to record
 * @param {import('@opentelemetry/api').SpanStatusCode} SpanStatusCode - Status code enum
 */
export function recordError(span, error, SpanStatusCode) {
  if (error instanceof Error) {
    span.recordException(error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    })
    span.setAttribute('error.type', error.name)
    span.setAttribute('error.message', error.message)
    if (error.stack) {
      span.setAttribute('error.stack', error.stack)
    }
  } else {
    const message = String(error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message,
    })
    span.setAttribute('error.message', message)
  }
}

/**
 * Set multiple attributes on a span
 *
 * @param {import('@opentelemetry/api').Span} span - Span to set attributes on
 * @param {Record<string, string|number|boolean>} attributes - Attributes to set
 */
export function setAttributes(span, attributes) {
  if (span && attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value)
    })
  }
}

/**
 * Create resource attributes from config
 *
 * @param {import('../shared/types').ResolvedTelemetryConfig} config - Configuration
 * @param {Object} SEMRESATTRS - Semantic resource attributes constants
 * @returns {Record<string, string>} Resource attributes
 */
export function createResourceAttributes(config, SEMRESATTRS) {
  return {
    [SEMRESATTRS.SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS.SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
    [SEMRESATTRS.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment,
    'service.namespace': config.namespace,
    ...config.resourceAttributes,
  }
}

/**
 * Format duration for logging
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Generate a unique invocation ID
 *
 * @returns {string} UUID v4
 */
export function generateInvocationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Safe console warn that doesn't throw
 *
 * @param {string} message - Message to log
 * @param {unknown} [data] - Additional data
 */
export function safeWarn(message, data) {
  try {
    if (data !== undefined) {
      console.warn(message, data)
    } else {
      console.warn(message)
    }
  } catch {
    // Ignore console errors
  }
}

/**
 * Safe console log that doesn't throw
 *
 * @param {string} message - Message to log
 * @param {unknown} [data] - Additional data
 */
export function safeLog(message, data) {
  try {
    if (data !== undefined) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  } catch {
    // Ignore console errors
  }
}
