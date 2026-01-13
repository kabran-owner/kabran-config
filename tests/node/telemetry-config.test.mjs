import { describe, it, expect } from 'vitest'
import {
  defineTelemetryConfig,
  resolveConfig,
  validateConfig,
  DEFAULT_ENDPOINT,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_SERVICE_VERSION,
  DEFAULT_NAMESPACE,
  detectEnabled,
} from '../../src/telemetry/config/index.mjs'

describe('telemetry/config', () => {
  describe('defineTelemetryConfig', () => {
    it('requires serviceName', () => {
      expect(() => defineTelemetryConfig({})).toThrow('serviceName is required')
    })

    it('returns config object when valid', () => {
      const config = defineTelemetryConfig({ serviceName: 'test-app' })
      expect(config.serviceName).toBe('test-app')
    })

    it('preserves all config options', () => {
      const config = defineTelemetryConfig({
        serviceName: 'test-app',
        serviceVersion: '2.0.0',
        sampleRate: 0.5,
        endpoint: 'https://custom.endpoint',
      })

      expect(config.serviceName).toBe('test-app')
      expect(config.serviceVersion).toBe('2.0.0')
      expect(config.sampleRate).toBe(0.5)
      expect(config.endpoint).toBe('https://custom.endpoint')
    })
  })

  describe('resolveConfig', () => {
    it('applies defaults when no config provided', () => {
      const resolved = resolveConfig({ serviceName: 'test' }, {}, 'development')

      expect(resolved.serviceName).toBe('test')
      expect(resolved.serviceVersion).toBe(DEFAULT_SERVICE_VERSION)
      expect(resolved.endpoint).toBe(DEFAULT_ENDPOINT)
      expect(resolved.sampleRate).toBe(DEFAULT_SAMPLE_RATE)
      expect(resolved.namespace).toBe(DEFAULT_NAMESPACE)
    })

    it('respects explicit config values', () => {
      const resolved = resolveConfig(
        {
          serviceName: 'my-service',
          serviceVersion: '3.0.0',
          sampleRate: 0.75,
          endpoint: 'https://my.endpoint',
        },
        {},
        'production'
      )

      expect(resolved.serviceName).toBe('my-service')
      expect(resolved.serviceVersion).toBe('3.0.0')
      expect(resolved.sampleRate).toBe(0.75)
      expect(resolved.endpoint).toBe('https://my.endpoint')
    })

    it('reads from Vite-style env vars', () => {
      const env = {
        VITE_OTEL_ENDPOINT: 'https://vite.endpoint',
        VITE_SERVICE_VERSION: '4.0.0',
        VITE_OTEL_SAMPLE_RATE: '0.25',
      }

      const resolved = resolveConfig({ serviceName: 'test' }, env, 'production')

      expect(resolved.endpoint).toBe('https://vite.endpoint')
      expect(resolved.serviceVersion).toBe('4.0.0')
      expect(resolved.sampleRate).toBe(0.25)
    })

    it('reads from Node-style env vars', () => {
      const env = {
        OTEL_ENDPOINT: 'https://node.endpoint',
        SERVICE_VERSION: '5.0.0',
        OTEL_SAMPLE_RATE: '0.15',
      }

      const resolved = resolveConfig({ serviceName: 'test' }, env, 'production')

      expect(resolved.endpoint).toBe('https://node.endpoint')
      expect(resolved.serviceVersion).toBe('5.0.0')
      expect(resolved.sampleRate).toBe(0.15)
    })

    it('prefers Vite env vars over Node env vars', () => {
      const env = {
        VITE_OTEL_ENDPOINT: 'https://vite.endpoint',
        OTEL_ENDPOINT: 'https://node.endpoint',
      }

      const resolved = resolveConfig({ serviceName: 'test' }, env, 'production')

      expect(resolved.endpoint).toBe('https://vite.endpoint')
    })

    it('merges resource attributes', () => {
      const resolved = resolveConfig(
        {
          serviceName: 'test',
          resourceAttributes: {
            'custom.attr': 'value',
            'team.name': 'platform',
          },
        },
        {},
        'production'
      )

      expect(resolved.resourceAttributes['custom.attr']).toBe('value')
      expect(resolved.resourceAttributes['team.name']).toBe('platform')
    })

    it('merges instrumentation options', () => {
      const resolved = resolveConfig(
        {
          serviceName: 'test',
          instrumentation: {
            fetch: false,
            userInteraction: false,
          },
        },
        {},
        'production'
      )

      expect(resolved.instrumentation.fetch).toBe(false)
      expect(resolved.instrumentation.documentLoad).toBe(true)
      expect(resolved.instrumentation.userInteraction).toBe(false)
      expect(resolved.instrumentation.database).toBe(true)
    })
  })

  describe('validateConfig', () => {
    it('returns valid for correct config', () => {
      const result = validateConfig({
        serviceName: 'test',
        sampleRate: 0.5,
        endpoint: 'https://valid.endpoint',
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error for missing serviceName', () => {
      const result = validateConfig({
        serviceName: '',
        sampleRate: 0.5,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('serviceName is required')
    })

    it('returns error for invalid sampleRate', () => {
      const result = validateConfig({
        serviceName: 'test',
        sampleRate: 1.5,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sampleRate must be between 0 and 1')
    })

    it('returns error for invalid endpoint', () => {
      const result = validateConfig({
        serviceName: 'test',
        sampleRate: 0.5,
        endpoint: 'not-a-url',
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('endpoint must be a valid URL')
    })
  })

  describe('detectEnabled', () => {
    it('returns true when explicitly set to true', () => {
      expect(detectEnabled('true', 'development')).toBe(true)
    })

    it('returns false when explicitly set to false', () => {
      expect(detectEnabled('false', 'production')).toBe(false)
    })

    it('returns true for production when not explicitly set', () => {
      expect(detectEnabled(undefined, 'production')).toBe(true)
    })

    it('returns false for development when not explicitly set', () => {
      expect(detectEnabled(undefined, 'development')).toBe(false)
    })

    it('returns false for test when not explicitly set', () => {
      expect(detectEnabled(undefined, 'test')).toBe(false)
    })
  })

  describe('defaults', () => {
    it('has correct default endpoint', () => {
      expect(DEFAULT_ENDPOINT).toBe('https://otel.kabran.com.br')
    })

    it('has correct default sample rate', () => {
      expect(DEFAULT_SAMPLE_RATE).toBe(0.1)
    })

    it('has correct default service version', () => {
      expect(DEFAULT_SERVICE_VERSION).toBe('1.0.0')
    })

    it('has correct default namespace', () => {
      expect(DEFAULT_NAMESPACE).toBe('kabran')
    })
  })
})
