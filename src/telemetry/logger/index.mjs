/**
 * Telemetry Logger Module
 *
 * Structured logger with trace correlation.
 * Automatically includes trace_id and span_id in log output.
 *
 * @module telemetry/logger
 *
 * @example
 * ```typescript
 * import { createLogger } from '@kabran-tecnologia/kabran-config/telemetry/logger'
 *
 * const log = createLogger()
 * log.info('User logged in', { userId: '123' })
 * // Output: {"level":"info","message":"User logged in","userId":"123","trace_id":"abc...","span_id":"def...","timestamp":"..."}
 * ```
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Get trace context from current span
 *
 * @returns {{ trace_id?: string, span_id?: string }}
 */
function getTraceContext() {
  try {
    const { trace } = require('@opentelemetry/api')
    const span = trace.getActiveSpan()
    if (span) {
      const ctx = span.spanContext()
      return {
        trace_id: ctx.traceId,
        span_id: ctx.spanId,
      }
    }
  } catch {
    // OTel not available
  }
  return {}
}

/**
 * Format log entry for JSON output
 *
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Record<string, unknown>} [data] - Additional data
 * @param {boolean} includeTrace - Whether to include trace context
 * @returns {string} JSON formatted log entry
 */
function formatJson(level, message, data = {}, includeTrace = true) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }

  if (includeTrace) {
    const traceContext = getTraceContext()
    if (traceContext.trace_id) {
      entry.trace_id = traceContext.trace_id
      entry.span_id = traceContext.span_id
    }
  }

  return JSON.stringify(entry)
}

/**
 * Format log entry for pretty output
 *
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Record<string, unknown>} [data] - Additional data
 * @param {boolean} includeTrace - Whether to include trace context
 * @returns {string} Pretty formatted log entry
 */
function formatPretty(level, message, data = {}, includeTrace = true) {
  const timestamp = new Date().toISOString()
  const levelColors = {
    debug: '\x1b[90m', // gray
    info: '\x1b[36m',  // cyan
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const color = levelColors[level] || ''

  let output = `${timestamp} ${color}[${level.toUpperCase()}]${reset} ${message}`

  if (includeTrace) {
    const traceContext = getTraceContext()
    if (traceContext.trace_id) {
      output += ` ${'\x1b[90m'}[trace:${traceContext.trace_id.substring(0, 8)}]${reset}`
    }
  }

  if (Object.keys(data).length > 0) {
    output += ` ${JSON.stringify(data)}`
  }

  return output
}

/**
 * Create a logger instance
 *
 * @param {import('../shared/types').LoggerOptions} [options] - Logger options
 * @returns {import('../shared/types').TelemetryLogger}
 */
export function createLogger(options = {}) {
  const {
    level = 'info',
    format = process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
    includeTrace = true,
  } = options

  const minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info
  const formatter = format === 'json' ? formatJson : formatPretty

  const shouldLog = (logLevel) => LOG_LEVELS[logLevel] >= minLevel

  return {
    debug(message, data) {
      if (shouldLog('debug')) {
        console.debug(formatter('debug', message, data, includeTrace))
      }
    },

    info(message, data) {
      if (shouldLog('info')) {
        console.info(formatter('info', message, data, includeTrace))
      }
    },

    warn(message, data) {
      if (shouldLog('warn')) {
        console.warn(formatter('warn', message, data, includeTrace))
      }
    },

    error(message, data) {
      if (shouldLog('error')) {
        console.error(formatter('error', message, data, includeTrace))
      }
    },
  }
}

/**
 * Create a logger bound to a specific span
 *
 * @param {import('@opentelemetry/api').Span} [span] - Span to bind to
 * @param {import('../shared/types').LoggerOptions} [options] - Logger options
 * @returns {import('../shared/types').TelemetryLogger}
 */
export function createSpanLogger(span, options = {}) {
  const logger = createLogger(options)

  const withSpanContext = (data = {}) => {
    if (span) {
      const ctx = span.spanContext()
      return {
        ...data,
        trace_id: ctx.traceId,
        span_id: ctx.spanId,
      }
    }
    return data
  }

  return {
    debug(message, data) {
      logger.debug(message, withSpanContext(data))
      span?.addEvent(`log.debug: ${message}`, data)
    },

    info(message, data) {
      logger.info(message, withSpanContext(data))
      span?.addEvent(`log.info: ${message}`, data)
    },

    warn(message, data) {
      logger.warn(message, withSpanContext(data))
      span?.addEvent(`log.warn: ${message}`, data)
    },

    error(message, data) {
      logger.error(message, withSpanContext(data))
      span?.addEvent(`log.error: ${message}`, data)
    },
  }
}

/**
 * Default logger instance
 */
export const log = createLogger()

// Re-export types
export { getTraceContext }
