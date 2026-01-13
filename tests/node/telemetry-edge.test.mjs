import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Edge Telemetry Tests
 *
 * These tests verify the module structure and basic behavior.
 * Full integration tests require Deno/Edge runtime with OTel packages.
 */
describe('telemetry/edge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('module exports', () => {
    it('exports expected functions', async () => {
      const edge = await import('../../src/telemetry/edge/index.mjs')

      expect(typeof edge.getTracer).toBe('function')
      expect(typeof edge.getCurrentSpan).toBe('function')
      expect(typeof edge.getTraceId).toBe('function')
      expect(typeof edge.extractContext).toBe('function')
      expect(typeof edge.injectContext).toBe('function')
      expect(typeof edge.createSpan).toBe('function')
      expect(typeof edge.createAsyncSpan).toBe('function')
      expect(typeof edge.withTelemetry).toBe('function')
      expect(typeof edge.traceSupabaseQuery).toBe('function')
      expect(typeof edge.addSpanEvent).toBe('function')
      expect(typeof edge.setSpanAttributes).toBe('function')
      expect(typeof edge.shutdownTelemetry).toBe('function')
      expect(typeof edge.resolveConfig).toBe('function')
    })
  })

  describe('withTelemetry', () => {
    it('returns a function that wraps the handler', async () => {
      const edge = await import('../../src/telemetry/edge/index.mjs')

      const handler = vi.fn(async (req, span) => {
        return new Response('OK')
      })

      const wrapped = edge.withTelemetry('test-function', handler)

      expect(typeof wrapped).toBe('function')
    })
  })

  describe('shutdownTelemetry', () => {
    it('handles shutdown when not initialized', async () => {
      const edge = await import('../../src/telemetry/edge/index.mjs')

      // Should not throw
      await edge.shutdownTelemetry()
    })
  })
})
