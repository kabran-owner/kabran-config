/**
 * Telemetry Configuration Defaults
 *
 * Smart defaults that work for most Kabran projects.
 * All values can be overridden via environment variables.
 *
 * @module telemetry/config/defaults
 */

// =============================================================================
// Environment Variable Helpers
// =============================================================================

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable key
 * @param {string} fallback - Fallback value
 * @returns {string}
 */
function getEnv(key, fallback) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback
  }
  if (typeof Deno !== 'undefined') {
    return Deno.env.get(key) || fallback
  }
  return fallback
}

/**
 * Get numeric environment variable with fallback
 * @param {string} key - Environment variable key
 * @param {number} fallback - Fallback value
 * @returns {number}
 */
function getEnvNumber(key, fallback) {
  const value = getEnv(key, '')
  if (value === '') return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Parse CORS URLs from environment variable
 * @param {string} value - Comma-separated URL patterns
 * @returns {RegExp[]}
 */
function parseCorsUrls(value) {
  if (!value) return null
  return value.split(',').map((pattern) => new RegExp(pattern.trim()))
}

/**
 * Parse event names from environment variable
 * @param {string} value - Comma-separated event names
 * @returns {string[]}
 */
function parseEventNames(value) {
  if (!value) return null
  return value.split(',').map((name) => name.trim())
}

/**
 * Parse ignore paths from environment variable
 * @param {string} value - Comma-separated paths
 * @returns {string[]}
 */
function parseIgnorePaths(value) {
  if (!value) return null
  return value.split(',').map((path) => path.trim())
}

// =============================================================================
// Default Constants
// =============================================================================

/**
 * Default OTLP endpoint
 * Override: OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_ENDPOINT
 */
export const DEFAULT_ENDPOINT = 'https://otel.kabran.com.br'

/**
 * Default OTLP traces path
 * Override: OTEL_EXPORTER_OTLP_TRACES_PATH
 */
export const DEFAULT_TRACES_PATH = '/v1/traces'

/**
 * Default sampling rate (10%)
 * Override: OTEL_SAMPLE_RATE
 */
export const DEFAULT_SAMPLE_RATE = 0.1

/**
 * Default service version
 * Override: SERVICE_VERSION
 */
export const DEFAULT_SERVICE_VERSION = '1.0.0'

/**
 * Default namespace
 * Override: OTEL_NAMESPACE or SERVICE_NAMESPACE
 */
export const DEFAULT_NAMESPACE = 'kabran'

/**
 * Default CORS URLs for trace header propagation
 * Override: OTEL_PROPAGATE_TRACE_HEADER_CORS_URLS (comma-separated regex patterns)
 */
export const DEFAULT_CORS_URLS = [
  /.*\.supabase\.co/,
  /.*\.kabran\.com\.br/,
  /localhost/,
]

/**
 * Default instrumentation options
 * Override: OTEL_INSTRUMENTATION_FETCH, OTEL_INSTRUMENTATION_DOCUMENT_LOAD, etc.
 */
export const DEFAULT_INSTRUMENTATION = {
  fetch: true,
  documentLoad: true,
  userInteraction: true,
  database: true,
}

/**
 * Default user interaction events
 * Override: OTEL_USER_INTERACTION_EVENTS (comma-separated)
 */
export const DEFAULT_USER_INTERACTION_EVENTS = ['click', 'submit']

/**
 * Default paths to ignore in middleware
 * Override: OTEL_IGNORE_PATHS (comma-separated)
 */
export const DEFAULT_IGNORE_PATHS = ['/health', '/ready', '/metrics']

// =============================================================================
// Exporter Configuration
// =============================================================================

/**
 * Default OTLP export timeout (ms) for Node.js
 * Override: OTEL_EXPORTER_OTLP_TIMEOUT
 */
export const DEFAULT_EXPORT_TIMEOUT_NODE = 10000

/**
 * Default OTLP export timeout (ms) for Edge/Serverless
 * Override: OTEL_EXPORTER_OTLP_TIMEOUT_EDGE
 */
export const DEFAULT_EXPORT_TIMEOUT_EDGE = 5000

// =============================================================================
// Batch Span Processor Configuration - Node.js
// =============================================================================

/**
 * Default max queue size for Node.js BatchSpanProcessor
 * Override: OTEL_BSP_MAX_QUEUE_SIZE
 */
export const DEFAULT_BSP_MAX_QUEUE_SIZE_NODE = 2048

/**
 * Default max export batch size for Node.js BatchSpanProcessor
 * Override: OTEL_BSP_MAX_EXPORT_BATCH_SIZE
 */
export const DEFAULT_BSP_MAX_EXPORT_BATCH_SIZE_NODE = 512

/**
 * Default scheduled delay (ms) for Node.js BatchSpanProcessor
 * Override: OTEL_BSP_SCHEDULE_DELAY
 */
export const DEFAULT_BSP_SCHEDULE_DELAY_NODE = 5000

// =============================================================================
// Batch Span Processor Configuration - Frontend
// =============================================================================

/**
 * Default max queue size for Frontend BatchSpanProcessor
 * Override: OTEL_BSP_MAX_QUEUE_SIZE_FRONTEND
 */
export const DEFAULT_BSP_MAX_QUEUE_SIZE_FRONTEND = 100

/**
 * Default max export batch size for Frontend BatchSpanProcessor
 * Override: OTEL_BSP_MAX_EXPORT_BATCH_SIZE_FRONTEND
 */
export const DEFAULT_BSP_MAX_EXPORT_BATCH_SIZE_FRONTEND = 10

/**
 * Default scheduled delay (ms) for Frontend BatchSpanProcessor
 * Override: OTEL_BSP_SCHEDULE_DELAY_FRONTEND
 */
export const DEFAULT_BSP_SCHEDULE_DELAY_FRONTEND = 500

// =============================================================================
// Tracer Names (fallbacks)
// =============================================================================

/**
 * Default tracer name for Node.js
 */
export const DEFAULT_TRACER_NAME_NODE = 'kabran-node'

/**
 * Default tracer name for Frontend
 */
export const DEFAULT_TRACER_NAME_FRONTEND = 'kabran-frontend'

/**
 * Default tracer name for Edge
 */
export const DEFAULT_TRACER_NAME_EDGE = 'kabran-edge'

// =============================================================================
// Logger Configuration
// =============================================================================

/**
 * Default trace ID display length in logs
 * Override: OTEL_LOG_TRACE_ID_LENGTH
 */
export const DEFAULT_LOG_TRACE_ID_LENGTH = 8

/**
 * Check if colors should be disabled
 * Override: NO_COLOR or FORCE_COLOR=false
 */
export function shouldDisableColors() {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NO_COLOR !== undefined) return true
    if (process.env.FORCE_COLOR === 'false' || process.env.FORCE_COLOR === '0') return true
  }
  return false
}

// =============================================================================
// Error Response Configuration (Edge)
// =============================================================================

/**
 * Default error message for unhandled errors
 * Override: OTEL_ERROR_MESSAGE
 */
export const DEFAULT_ERROR_MESSAGE = 'Internal server error'

/**
 * Default error code for unhandled errors
 * Override: OTEL_ERROR_CODE
 */
export const DEFAULT_ERROR_CODE = 'INTERNAL_ERROR'

// =============================================================================
// Runtime Configuration Getters
// =============================================================================

/**
 * Get configured traces path
 * @returns {string}
 */
export function getTracesPath() {
  return getEnv('OTEL_EXPORTER_OTLP_TRACES_PATH', DEFAULT_TRACES_PATH)
}

/**
 * Get configured namespace
 * @returns {string}
 */
export function getNamespace() {
  return getEnv('OTEL_NAMESPACE', getEnv('SERVICE_NAMESPACE', DEFAULT_NAMESPACE))
}

/**
 * Get configured CORS URLs
 * @returns {RegExp[]}
 */
export function getCorsUrls() {
  const envValue = getEnv('OTEL_PROPAGATE_TRACE_HEADER_CORS_URLS', '')
  return parseCorsUrls(envValue) || DEFAULT_CORS_URLS
}

/**
 * Get configured user interaction events
 * @returns {string[]}
 */
export function getUserInteractionEvents() {
  const envValue = getEnv('OTEL_USER_INTERACTION_EVENTS', '')
  return parseEventNames(envValue) || DEFAULT_USER_INTERACTION_EVENTS
}

/**
 * Get configured ignore paths for middleware
 * @returns {string[]}
 */
export function getIgnorePaths() {
  const envValue = getEnv('OTEL_IGNORE_PATHS', '')
  return parseIgnorePaths(envValue) || DEFAULT_IGNORE_PATHS
}

/**
 * Get export timeout for Node.js
 * @returns {number}
 */
export function getExportTimeoutNode() {
  return getEnvNumber('OTEL_EXPORTER_OTLP_TIMEOUT', DEFAULT_EXPORT_TIMEOUT_NODE)
}

/**
 * Get export timeout for Edge
 * @returns {number}
 */
export function getExportTimeoutEdge() {
  return getEnvNumber('OTEL_EXPORTER_OTLP_TIMEOUT_EDGE',
    getEnvNumber('OTEL_EXPORTER_OTLP_TIMEOUT', DEFAULT_EXPORT_TIMEOUT_EDGE))
}

/**
 * Get BatchSpanProcessor config for Node.js
 * @returns {{ maxQueueSize: number, maxExportBatchSize: number, scheduledDelayMillis: number }}
 */
export function getBspConfigNode() {
  return {
    maxQueueSize: getEnvNumber('OTEL_BSP_MAX_QUEUE_SIZE', DEFAULT_BSP_MAX_QUEUE_SIZE_NODE),
    maxExportBatchSize: getEnvNumber('OTEL_BSP_MAX_EXPORT_BATCH_SIZE', DEFAULT_BSP_MAX_EXPORT_BATCH_SIZE_NODE),
    scheduledDelayMillis: getEnvNumber('OTEL_BSP_SCHEDULE_DELAY', DEFAULT_BSP_SCHEDULE_DELAY_NODE),
  }
}

/**
 * Get BatchSpanProcessor config for Frontend
 * @returns {{ maxQueueSize: number, maxExportBatchSize: number, scheduledDelayMillis: number }}
 */
export function getBspConfigFrontend() {
  return {
    maxQueueSize: getEnvNumber('OTEL_BSP_MAX_QUEUE_SIZE_FRONTEND', DEFAULT_BSP_MAX_QUEUE_SIZE_FRONTEND),
    maxExportBatchSize: getEnvNumber('OTEL_BSP_MAX_EXPORT_BATCH_SIZE_FRONTEND', DEFAULT_BSP_MAX_EXPORT_BATCH_SIZE_FRONTEND),
    scheduledDelayMillis: getEnvNumber('OTEL_BSP_SCHEDULE_DELAY_FRONTEND', DEFAULT_BSP_SCHEDULE_DELAY_FRONTEND),
  }
}

/**
 * Get error response config for Edge
 * @returns {{ message: string, code: string }}
 */
export function getErrorResponseConfig() {
  return {
    message: getEnv('OTEL_ERROR_MESSAGE', DEFAULT_ERROR_MESSAGE),
    code: getEnv('OTEL_ERROR_CODE', DEFAULT_ERROR_CODE),
  }
}

/**
 * Get trace ID display length for logs
 * @returns {number}
 */
export function getLogTraceIdLength() {
  return getEnvNumber('OTEL_LOG_TRACE_ID_LENGTH', DEFAULT_LOG_TRACE_ID_LENGTH)
}

/**
 * Detect if telemetry should be enabled based on environment
 *
 * Rules:
 * - Explicit setting via OTEL_ENABLED/VITE_OTEL_ENABLED takes precedence
 * - Production: enabled by default
 * - Development/Test: disabled by default
 *
 * @param {string|undefined} explicitSetting - Explicit enable setting
 * @param {string} mode - Environment mode (production, development, test)
 * @returns {boolean} Whether telemetry should be enabled
 */
export function detectEnabled(explicitSetting, mode) {
  if (explicitSetting !== undefined) {
    return explicitSetting === 'true'
  }
  return mode === 'production'
}

/**
 * Detect environment from various sources
 *
 * @returns {string} Environment name
 */
export function detectEnvironment() {
  // Node.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env.ENVIRONMENT || process.env.NODE_ENV || 'development'
  }

  // Deno
  if (typeof Deno !== 'undefined') {
    return Deno.env.get('ENVIRONMENT') || 'production'
  }

  return 'development'
}

/**
 * Get default configuration
 *
 * @param {string} serviceName - Service name
 * @returns {import('./types').ResolvedTelemetryConfig} Default configuration
 */
export function getDefaults(serviceName) {
  return {
    serviceName,
    serviceVersion: DEFAULT_SERVICE_VERSION,
    environment: detectEnvironment(),
    endpoint: DEFAULT_ENDPOINT,
    sampleRate: DEFAULT_SAMPLE_RATE,
    enabled: false, // Will be resolved by detectEnabled()
    namespace: DEFAULT_NAMESPACE,
    resourceAttributes: {},
    propagateTraceHeaderCorsUrls: DEFAULT_CORS_URLS,
    instrumentation: { ...DEFAULT_INSTRUMENTATION },
  }
}
