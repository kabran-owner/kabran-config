/**
 * Telemetry Configuration Defaults
 *
 * Smart defaults that work for most Kabran projects.
 *
 * @module telemetry/config/defaults
 */

/**
 * Default OTLP endpoint
 */
export const DEFAULT_ENDPOINT = 'https://otel.kabran.com.br'

/**
 * Default sampling rate (10%)
 */
export const DEFAULT_SAMPLE_RATE = 0.1

/**
 * Default service version
 */
export const DEFAULT_SERVICE_VERSION = '1.0.0'

/**
 * Default namespace
 */
export const DEFAULT_NAMESPACE = 'kabran'

/**
 * Default CORS URLs for trace header propagation
 */
export const DEFAULT_CORS_URLS = [
  /.*\.supabase\.co/,
  /.*\.kabran\.com\.br/,
  /localhost/,
]

/**
 * Default instrumentation options
 */
export const DEFAULT_INSTRUMENTATION = {
  fetch: true,
  documentLoad: true,
  userInteraction: true,
  database: true,
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
