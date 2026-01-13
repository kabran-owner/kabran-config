import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, createSpanLogger } from '../../src/telemetry/logger/index.mjs'

describe('telemetry/logger', () => {
  let consoleSpy

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createLogger', () => {
    it('creates a logger with all methods', () => {
      const logger = createLogger()

      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('logs info messages by default', () => {
      const logger = createLogger({ format: 'pretty' })
      logger.info('Test message')

      expect(consoleSpy.info).toHaveBeenCalled()
    })

    it('does not log debug when level is info', () => {
      const logger = createLogger({ level: 'info', format: 'pretty' })
      logger.debug('Debug message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('logs debug when level is debug', () => {
      const logger = createLogger({ level: 'debug', format: 'pretty' })
      logger.debug('Debug message')

      expect(consoleSpy.debug).toHaveBeenCalled()
    })

    it('respects log level hierarchy', () => {
      const logger = createLogger({ level: 'warn', format: 'pretty' })

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('outputs JSON format', () => {
      const logger = createLogger({ format: 'json' })
      logger.info('Test message', { userId: '123' })

      expect(consoleSpy.info).toHaveBeenCalled()
      const output = consoleSpy.info.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.level).toBe('info')
      expect(parsed.message).toBe('Test message')
      expect(parsed.userId).toBe('123')
      expect(parsed.timestamp).toBeDefined()
    })

    it('includes additional data in log output', () => {
      const logger = createLogger({ format: 'json' })
      logger.info('User action', { action: 'login', userId: '456' })

      const output = consoleSpy.info.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.action).toBe('login')
      expect(parsed.userId).toBe('456')
    })
  })

  describe('createSpanLogger', () => {
    it('creates a logger bound to a span', () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: 'test-trace-id',
          spanId: 'test-span-id',
        }),
        addEvent: vi.fn(),
      }

      const logger = createSpanLogger(mockSpan, { format: 'json' })

      expect(typeof logger.info).toBe('function')
      logger.info('Test message')

      expect(consoleSpy.info).toHaveBeenCalled()
    })

    it('adds events to span on log', () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: 'test-trace-id',
          spanId: 'test-span-id',
        }),
        addEvent: vi.fn(),
      }

      const logger = createSpanLogger(mockSpan, { format: 'json' })
      logger.info('Event message', { key: 'value' })

      expect(mockSpan.addEvent).toHaveBeenCalledWith(
        'log.info: Event message',
        { key: 'value' }
      )
    })

    it('includes trace context in output', () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: 'abc123',
          spanId: 'def456',
        }),
        addEvent: vi.fn(),
      }

      const logger = createSpanLogger(mockSpan, { format: 'json' })
      logger.info('Message')

      const output = consoleSpy.info.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.trace_id).toBe('abc123')
      expect(parsed.span_id).toBe('def456')
    })

    it('works without a span', () => {
      const logger = createSpanLogger(null, { format: 'json' })
      logger.info('No span message')

      expect(consoleSpy.info).toHaveBeenCalled()
    })
  })

  describe('log levels', () => {
    it('error is highest priority', () => {
      const logger = createLogger({ level: 'error', format: 'pretty' })

      logger.debug('d')
      logger.info('i')
      logger.warn('w')
      logger.error('e')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('debug logs everything', () => {
      const logger = createLogger({ level: 'debug', format: 'pretty' })

      logger.debug('d')
      logger.info('i')
      logger.warn('w')
      logger.error('e')

      expect(consoleSpy.debug).toHaveBeenCalled()
      expect(consoleSpy.info).toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })
  })
})
