/**
 * Telemetry Type Definitions
 *
 * @module telemetry/shared/types
 */

import type { Span, Context, Tracer } from '@opentelemetry/api'

export type { Span, Context, Tracer }

/**
 * Telemetry configuration options
 */
export interface TelemetryConfig {
  /** Service name (required) */
  serviceName: string

  /** Service version (default: from package.json or '1.0.0') */
  serviceVersion?: string

  /** Deployment environment (default: from NODE_ENV or 'development') */
  environment?: string

  /** OTLP endpoint URL (default: 'https://otel.kabran.com.br') */
  endpoint?: string

  /** Sampling rate 0.0-1.0 (default: 0.1) */
  sampleRate?: number

  /** Enable/disable telemetry (default: auto-detect based on environment) */
  enabled?: boolean

  /** Service namespace for grouping services */
  namespace?: string

  /** Additional resource attributes */
  resourceAttributes?: Record<string, string | number | boolean>

  /** Frontend-specific: CORS URLs for trace header propagation */
  propagateTraceHeaderCorsUrls?: (string | RegExp)[]

  /** Instrumentation options */
  instrumentation?: InstrumentationOptions
}

/**
 * Instrumentation feature flags
 */
export interface InstrumentationOptions {
  /** Auto-instrument fetch requests (default: true) */
  fetch?: boolean

  /** Auto-instrument document load (default: true, frontend only) */
  documentLoad?: boolean

  /** Auto-instrument user interactions (default: true, frontend only) */
  userInteraction?: boolean

  /** Auto-instrument database queries (default: true, edge/node only) */
  database?: boolean
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedTelemetryConfig {
  serviceName: string
  serviceVersion: string
  environment: string
  endpoint: string
  sampleRate: number
  enabled: boolean
  namespace: string
  resourceAttributes: Record<string, string | number | boolean>
  propagateTraceHeaderCorsUrls: (string | RegExp)[]
  instrumentation: Required<InstrumentationOptions>
}

/**
 * Span attributes type
 */
export type SpanAttributes = Record<string, string | number | boolean>

/**
 * Edge function handler type
 */
export type EdgeHandler = (
  req: Request,
  span: Span
) => Promise<Response> | Response

/**
 * Express-style middleware request handler
 */
export type MiddlewareHandler = (
  req: unknown,
  res: unknown,
  next: () => void
) => void

/**
 * Logger interface
 */
export interface TelemetryLogger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Minimum log level (default: 'info') */
  level?: 'debug' | 'info' | 'warn' | 'error'

  /** Output format (default: 'json' in production, 'pretty' in development) */
  format?: 'json' | 'pretty'

  /** Include trace context in logs (default: true) */
  includeTrace?: boolean
}
