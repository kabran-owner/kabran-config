import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Frontend Telemetry Tests
 *
 * These tests verify the module structure and basic behavior.
 * Full integration tests require browser environment with OTel packages.
 */
describe('telemetry/frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('module exports', () => {
    it('exports expected functions', async () => {
      const frontend = await import('../../src/telemetry/frontend/index.mjs')

      expect(typeof frontend.initTelemetry).toBe('function')
      expect(typeof frontend.getTracer).toBe('function')
      expect(typeof frontend.getCurrentSpan).toBe('function')
      expect(typeof frontend.getTraceId).toBe('function')
      expect(typeof frontend.createSpan).toBe('function')
      expect(typeof frontend.createAsyncSpan).toBe('function')
      expect(typeof frontend.addSpanEvent).toBe('function')
      expect(typeof frontend.setSpanAttributes).toBe('function')
      expect(typeof frontend.shutdownTelemetry).toBe('function')
      expect(typeof frontend.isInitialized).toBe('function')
      expect(typeof frontend.getConfig).toBe('function')
      expect(typeof frontend.resolveConfig).toBe('function')
    })
  })

  describe('initTelemetry', () => {
    it('skips when window is undefined (Node.js environment)', async () => {
      const frontend = await import('../../src/telemetry/frontend/index.mjs')

      // In Node.js, window is undefined - should skip
      await frontend.initTelemetry({ serviceName: 'test-service' })

      // Should not throw and should not be initialized
      expect(frontend.isInitialized()).toBe(false)
    })

    it('skips when serviceName is not provided', async () => {
      const frontend = await import('../../src/telemetry/frontend/index.mjs')

      await frontend.initTelemetry({})

      expect(frontend.isInitialized()).toBe(false)
    })
  })

  describe('isInitialized', () => {
    it('returns false when not initialized', async () => {
      const frontend = await import('../../src/telemetry/frontend/index.mjs')

      expect(frontend.isInitialized()).toBe(false)
    })
  })

  describe('getConfig', () => {
    it('returns null when not initialized', async () => {
      const frontend = await import('../../src/telemetry/frontend/index.mjs')

      expect(frontend.getConfig()).toBeNull()
    })
  })

  describe('shutdownTelemetry', () => {
    it('handles shutdown when not initialized', async () => {
      const frontend = await import('../../src/telemetry/frontend/index.mjs')

      // Should not throw
      await frontend.shutdownTelemetry()

      expect(frontend.isInitialized()).toBe(false)
    })
  })
})
