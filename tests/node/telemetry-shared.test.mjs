import { describe, it, expect, vi } from 'vitest'
import {
  setAttributes,
  formatDuration,
  generateInvocationId,
  safeWarn,
  safeLog,
} from '../../src/telemetry/shared/helpers.mjs'

describe('telemetry/shared/helpers', () => {
  describe('setAttributes', () => {
    it('sets multiple attributes on span', () => {
      const mockSpan = {
        setAttribute: vi.fn(),
      }

      setAttributes(mockSpan, {
        'key1': 'value1',
        'key2': 123,
        'key3': true,
      })

      expect(mockSpan.setAttribute).toHaveBeenCalledTimes(3)
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key1', 'value1')
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key2', 123)
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key3', true)
    })

    it('handles empty attributes', () => {
      const mockSpan = {
        setAttribute: vi.fn(),
      }

      setAttributes(mockSpan, {})

      expect(mockSpan.setAttribute).not.toHaveBeenCalled()
    })

    it('handles null span gracefully', () => {
      expect(() => setAttributes(null, { key: 'value' })).not.toThrow()
    })

    it('handles undefined attributes', () => {
      const mockSpan = {
        setAttribute: vi.fn(),
      }

      expect(() => setAttributes(mockSpan, undefined)).not.toThrow()
    })
  })

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(50)).toBe('50ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    it('formats seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s')
      expect(formatDuration(2500)).toBe('2.50s')
      expect(formatDuration(10000)).toBe('10.00s')
    })

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0ms')
    })

    it('handles large values', () => {
      expect(formatDuration(60000)).toBe('60.00s')
      expect(formatDuration(3600000)).toBe('3600.00s')
    })
  })

  describe('generateInvocationId', () => {
    it('generates a UUID-like string', () => {
      const id = generateInvocationId()

      expect(typeof id).toBe('string')
      expect(id.length).toBe(36)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('generates unique IDs', () => {
      const id1 = generateInvocationId()
      const id2 = generateInvocationId()
      const id3 = generateInvocationId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })
  })

  describe('safeWarn', () => {
    it('logs warning message', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      safeWarn('Test warning')

      expect(spy).toHaveBeenCalledWith('Test warning')
      spy.mockRestore()
    })

    it('logs warning with data', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      safeWarn('Test warning', { extra: 'data' })

      expect(spy).toHaveBeenCalledWith('Test warning', { extra: 'data' })
      spy.mockRestore()
    })

    it('does not throw on console error', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
        throw new Error('Console error')
      })

      expect(() => safeWarn('Test')).not.toThrow()
      spy.mockRestore()
    })
  })

  describe('safeLog', () => {
    it('logs message', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      safeLog('Test log')

      expect(spy).toHaveBeenCalledWith('Test log')
      spy.mockRestore()
    })

    it('logs with data', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      safeLog('Test log', { key: 'value' })

      expect(spy).toHaveBeenCalledWith('Test log', { key: 'value' })
      spy.mockRestore()
    })

    it('does not throw on console error', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Console error')
      })

      expect(() => safeLog('Test')).not.toThrow()
      spy.mockRestore()
    })
  })
})
