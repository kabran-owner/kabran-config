import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Node Telemetry Tests
 *
 * These tests verify the module structure and basic behavior.
 * Full integration tests require OTel packages to be installed.
 */
describe('telemetry/node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('module exports', () => {
    it('exports expected functions', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      expect(typeof node.initTelemetry).toBe('function')
      expect(typeof node.getTracer).toBe('function')
      expect(typeof node.getCurrentSpan).toBe('function')
      expect(typeof node.getTraceId).toBe('function')
      expect(typeof node.createSpan).toBe('function')
      expect(typeof node.createAsyncSpan).toBe('function')
      expect(typeof node.telemetryMiddleware).toBe('function')
      expect(typeof node.addSpanEvent).toBe('function')
      expect(typeof node.setSpanAttributes).toBe('function')
      expect(typeof node.shutdownTelemetry).toBe('function')
      expect(typeof node.isInitialized).toBe('function')
      expect(typeof node.getConfig).toBe('function')
      expect(typeof node.resolveConfig).toBe('function')
    })
  })

  describe('initTelemetry', () => {
    it('skips when serviceName is not provided', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      await node.initTelemetry({})

      expect(node.isInitialized()).toBe(false)
    })
  })

  describe('telemetryMiddleware', () => {
    it('returns a middleware function', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      const middleware = node.telemetryMiddleware()

      expect(typeof middleware).toBe('function')
    })

    it('skips ignored paths', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      const middleware = node.telemetryMiddleware({ ignorePaths: ['/health'] })

      const req = { path: '/health', headers: {} }
      const res = {}
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('passes through when not initialized', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      const middleware = node.telemetryMiddleware()

      const req = { path: '/api/users', headers: {}, method: 'GET' }
      const res = { end: vi.fn() }
      const next = vi.fn()

      await middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('isInitialized', () => {
    it('returns false when not initialized', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      expect(node.isInitialized()).toBe(false)
    })
  })

  describe('getConfig', () => {
    it('returns null when not initialized', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      expect(node.getConfig()).toBeNull()
    })
  })

  describe('shutdownTelemetry', () => {
    it('handles shutdown when not initialized', async () => {
      const node = await import('../../src/telemetry/node/index.mjs')

      // Should not throw
      await node.shutdownTelemetry()

      expect(node.isInitialized()).toBe(false)
    })
  })
})
