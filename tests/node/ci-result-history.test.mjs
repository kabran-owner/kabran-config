import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractHistoryEntry,
  loadHistory,
  pruneHistory,
  addToHistory,
  saveHistory,
  filterByBranch,
  filterByDays,
  getHistoryStats,
  DEFAULT_MAX_ENTRIES,
} from '../../src/scripts/ci-result-history.mjs'

// Mock fs module
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

describe('ci-result-history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('extractHistoryEntry', () => {
    it('extracts minimal entry from full result', () => {
      const result = {
        meta: {
          run_id: 'test-run-123',
          generated_at: '2026-01-13T10:00:00Z',
          branch: 'main',
          commit: 'abc1234',
        },
        summary: {
          score: 85,
          status: 'passing',
          exit_code: 0,
          total_issues: 2,
          blocking: 0,
          warnings: 2,
        },
        timing: {
          total_ms: 180000,
          total_human: '3m 00s',
        },
      }

      const entry = extractHistoryEntry(result)

      expect(entry.run_id).toBe('test-run-123')
      expect(entry.generated_at).toBe('2026-01-13T10:00:00Z')
      expect(entry.branch).toBe('main')
      expect(entry.commit).toBe('abc1234')
      expect(entry.score).toBe(85)
      expect(entry.status).toBe('passing')
      expect(entry.timing.total_ms).toBe(180000)
      expect(entry.summary.exit_code).toBe(0)
      expect(entry.summary.total_issues).toBe(2)
    })

    it('handles missing fields with defaults', () => {
      const result = {}

      const entry = extractHistoryEntry(result)

      expect(entry.run_id).toBe('unknown')
      expect(entry.branch).toBe('unknown')
      expect(entry.score).toBe(0)
      expect(entry.status).toBe('unknown')
    })
  })

  describe('loadHistory', () => {
    it('returns empty history when file does not exist', () => {
      existsSync.mockReturnValue(false)

      const history = loadHistory('/path/to/history.json')

      expect(history.entries).toEqual([])
      expect(history.version).toBe('1.0.0')
      expect(history.meta.max_entries).toBe(DEFAULT_MAX_ENTRIES)
    })

    it('loads existing history from file', () => {
      const existingHistory = {
        $schema: 'https://kabran.dev/schemas/ci-result-history.json',
        version: '1.0.0',
        meta: { updated_at: '2026-01-12T10:00:00Z' },
        entries: [
          { run_id: 'run-1', score: 85, generated_at: '2026-01-12T10:00:00Z' },
          { run_id: 'run-2', score: 90, generated_at: '2026-01-11T10:00:00Z' },
        ],
      }

      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(JSON.stringify(existingHistory))

      const history = loadHistory('/path/to/history.json')

      expect(history.entries).toHaveLength(2)
      expect(history.entries[0].run_id).toBe('run-1')
    })

    it('returns empty history when file is corrupted', () => {
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue('not valid json')

      const history = loadHistory('/path/to/history.json')

      expect(history.entries).toEqual([])
      expect(history.meta.error).toBeDefined()
    })
  })

  describe('pruneHistory', () => {
    it('keeps only max entries', () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        run_id: `run-${i}`,
        generated_at: new Date(2026, 0, 13 - i).toISOString(),
      }))

      const pruned = pruneHistory(entries, 30)

      expect(pruned).toHaveLength(30)
      expect(pruned[0].run_id).toBe('run-0') // Most recent first
    })

    it('sorts by generated_at descending', () => {
      const entries = [
        { run_id: 'old', generated_at: '2026-01-01T10:00:00Z' },
        { run_id: 'newest', generated_at: '2026-01-13T10:00:00Z' },
        { run_id: 'mid', generated_at: '2026-01-07T10:00:00Z' },
      ]

      const pruned = pruneHistory(entries, 30)

      expect(pruned[0].run_id).toBe('newest')
      expect(pruned[1].run_id).toBe('mid')
      expect(pruned[2].run_id).toBe('old')
    })

    it('handles empty array', () => {
      expect(pruneHistory([], 30)).toEqual([])
    })

    it('handles null/undefined', () => {
      expect(pruneHistory(null, 30)).toEqual([])
      expect(pruneHistory(undefined, 30)).toEqual([])
    })
  })

  describe('addToHistory', () => {
    it('adds new entry at beginning', () => {
      const history = {
        meta: {},
        entries: [
          { run_id: 'existing', score: 80, generated_at: '2026-01-12T10:00:00Z' },
        ],
      }

      const result = {
        meta: { run_id: 'new-run', generated_at: '2026-01-13T10:00:00Z', branch: 'main', commit: 'def456' },
        summary: { score: 90, status: 'passing', exit_code: 0, total_issues: 0, blocking: 0, warnings: 0 },
        timing: { total_ms: 60000, total_human: '1m 00s' },
      }

      addToHistory(result, history)

      expect(history.entries).toHaveLength(2)
      expect(history.entries[0].run_id).toBe('new-run')
      expect(history.meta.updated_at).toBeDefined()
    })

    it('updates existing entry with same run_id', () => {
      const history = {
        meta: {},
        entries: [
          { run_id: 'same-run', score: 80, generated_at: '2026-01-12T10:00:00Z' },
        ],
      }

      const result = {
        meta: { run_id: 'same-run', generated_at: '2026-01-13T10:00:00Z', branch: 'main', commit: 'new' },
        summary: { score: 95, status: 'passing', exit_code: 0, total_issues: 0, blocking: 0, warnings: 0 },
        timing: { total_ms: 60000, total_human: '1m 00s' },
      }

      addToHistory(result, history)

      expect(history.entries).toHaveLength(1)
      expect(history.entries[0].score).toBe(95)
    })
  })

  describe('saveHistory', () => {
    it('creates directory if not exists', () => {
      existsSync.mockReturnValue(false)

      const history = {
        meta: {},
        entries: [],
      }

      saveHistory(history, '/path/to/new/history.json', 30)

      expect(mkdirSync).toHaveBeenCalledWith('/path/to/new', { recursive: true })
    })

    it('prunes and writes history', () => {
      existsSync.mockReturnValue(true)

      const entries = Array.from({ length: 50 }, (_, i) => ({
        run_id: `run-${i}`,
        generated_at: new Date(2026, 0, 13 - i).toISOString(),
      }))

      const history = {
        meta: {},
        entries,
      }

      saveHistory(history, '/path/to/history.json', 30)

      expect(history.entries).toHaveLength(30)
      expect(history.meta.max_entries).toBe(30)
      expect(history.meta.entry_count).toBe(30)
      expect(writeFileSync).toHaveBeenCalled()
    })
  })

  describe('filterByBranch', () => {
    const entries = [
      { run_id: '1', branch: 'main' },
      { run_id: '2', branch: 'develop' },
      { run_id: '3', branch: 'main' },
      { run_id: '4', branch: 'feature/test' },
    ]

    it('filters entries by branch', () => {
      const filtered = filterByBranch(entries, 'main')

      expect(filtered).toHaveLength(2)
      expect(filtered[0].run_id).toBe('1')
      expect(filtered[1].run_id).toBe('3')
    })

    it('returns all entries when branch is null', () => {
      expect(filterByBranch(entries, null)).toEqual(entries)
    })

    it('returns empty array when branch not found', () => {
      expect(filterByBranch(entries, 'nonexistent')).toEqual([])
    })
  })

  describe('filterByDays', () => {
    it('filters entries within date range', () => {
      const now = new Date()
      const entries = [
        { run_id: 'today', generated_at: now.toISOString() },
        { run_id: 'yesterday', generated_at: new Date(now - 86400000).toISOString() },
        { run_id: '6-days-ago', generated_at: new Date(now - 6 * 86400000).toISOString() },
        { run_id: 'old', generated_at: new Date(now - 30 * 86400000).toISOString() },
      ]

      const filtered = filterByDays(entries, 7)

      expect(filtered).toHaveLength(3)
      expect(filtered.map(e => e.run_id)).toContain('today')
      expect(filtered.map(e => e.run_id)).toContain('yesterday')
      expect(filtered.map(e => e.run_id)).toContain('6-days-ago')
    })

    it('returns all entries when days is 0 or null', () => {
      const entries = [{ run_id: '1' }, { run_id: '2' }]

      expect(filterByDays(entries, 0)).toEqual(entries)
      expect(filterByDays(entries, null)).toEqual(entries)
    })
  })

  describe('getHistoryStats', () => {
    it('returns zero stats for empty entries', () => {
      const stats = getHistoryStats([])

      expect(stats.total_runs).toBe(0)
      expect(stats.oldest_run).toBeNull()
      expect(stats.newest_run).toBeNull()
      expect(stats.unique_branches).toBe(0)
    })

    it('calculates stats correctly', () => {
      const entries = [
        { run_id: '1', branch: 'main', generated_at: '2026-01-13T10:00:00Z' },
        { run_id: '2', branch: 'develop', generated_at: '2026-01-12T10:00:00Z' },
        { run_id: '3', branch: 'main', generated_at: '2026-01-11T10:00:00Z' },
      ]

      const stats = getHistoryStats(entries)

      expect(stats.total_runs).toBe(3)
      expect(stats.oldest_run).toBe('2026-01-11T10:00:00Z')
      expect(stats.newest_run).toBe('2026-01-13T10:00:00Z')
      expect(stats.unique_branches).toBe(2)
      expect(stats.branches).toContain('main')
      expect(stats.branches).toContain('develop')
    })
  })
})
