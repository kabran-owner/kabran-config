/**
 * Telemetry Configuration Module
 *
 * Provides configuration management for telemetry with:
 * - Smart defaults for Kabran projects
 * - Environment variable support
 * - Config file support
 * - Validation
 *
 * @module telemetry/config
 */

import {
  DEFAULT_ENDPOINT,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_SERVICE_VERSION,
  DEFAULT_NAMESPACE,
  DEFAULT_CORS_URLS,
  DEFAULT_INSTRUMENTATION,
  detectEnabled,
  detectEnvironment,
  getDefaults,
} from './defaults.mjs'

/**
 * Define telemetry configuration with type checking and defaults
 *
 * @param {import('../shared/types').TelemetryConfig} config - Configuration options
 * @returns {import('../shared/types').TelemetryConfig} Validated configuration
 *
 * @example
 * ```typescript
 * import { defineTelemetryConfig } from '@kabran-tecnologia/kabran-config/telemetry/config'
 *
 * export default defineTelemetryConfig({
 *   serviceName: 'my-app',
 *   sampleRate: 0.5,
 * })
 * ```
 */
export function defineTelemetryConfig(config) {
  if (!config.serviceName) {
    throw new Error('[Telemetry] serviceName is required')
  }

  return config
}

/**
 * Resolve configuration by merging:
 * 1. Explicit config (highest priority)
 * 2. Environment variables
 * 3. Defaults (lowest priority)
 *
 * @param {import('../shared/types').TelemetryConfig} config - User configuration
 * @param {Object} env - Environment variables object
 * @param {string} mode - Environment mode (production, development, test)
 * @returns {import('../shared/types').ResolvedTelemetryConfig} Resolved configuration
 */
export function resolveConfig(config, env = {}, mode = 'development') {
  const defaults = getDefaults(config.serviceName)

  // Resolve from environment variables (frontend style: VITE_*)
  const envEndpoint = env.VITE_OTEL_ENDPOINT || env.OTEL_ENDPOINT
  const envServiceName = env.VITE_SERVICE_NAME || env.SERVICE_NAME
  const envServiceVersion = env.VITE_SERVICE_VERSION || env.SERVICE_VERSION
  const envEnvironment = env.VITE_ENVIRONMENT || env.ENVIRONMENT || env.NODE_ENV
  const envSampleRate = env.VITE_OTEL_SAMPLE_RATE || env.OTEL_SAMPLE_RATE
  const envEnabled = env.VITE_OTEL_ENABLED || env.OTEL_ENABLED

  // Merge configuration
  const resolved = {
    serviceName: config.serviceName || envServiceName || defaults.serviceName,
    serviceVersion: config.serviceVersion || envServiceVersion || defaults.serviceVersion,
    environment: config.environment || envEnvironment || defaults.environment,
    endpoint: config.endpoint || envEndpoint || defaults.endpoint,
    sampleRate: config.sampleRate ?? (envSampleRate ? parseFloat(envSampleRate) : defaults.sampleRate),
    enabled: config.enabled ?? detectEnabled(envEnabled, mode),
    namespace: config.namespace || defaults.namespace,
    resourceAttributes: {
      ...defaults.resourceAttributes,
      ...config.resourceAttributes,
    },
    propagateTraceHeaderCorsUrls: config.propagateTraceHeaderCorsUrls || defaults.propagateTraceHeaderCorsUrls,
    instrumentation: {
      ...defaults.instrumentation,
      ...config.instrumentation,
    },
  }

  return resolved
}

/**
 * Validate configuration
 *
 * @param {import('../shared/types').ResolvedTelemetryConfig} config - Configuration to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateConfig(config) {
  const errors = []

  if (!config.serviceName) {
    errors.push('serviceName is required')
  }

  if (config.sampleRate < 0 || config.sampleRate > 1) {
    errors.push('sampleRate must be between 0 and 1')
  }

  if (config.endpoint && !config.endpoint.startsWith('http')) {
    errors.push('endpoint must be a valid URL')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Re-export defaults for convenience
export {
  DEFAULT_ENDPOINT,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_SERVICE_VERSION,
  DEFAULT_NAMESPACE,
  DEFAULT_CORS_URLS,
  DEFAULT_INSTRUMENTATION,
  detectEnabled,
  detectEnvironment,
  getDefaults,
}
