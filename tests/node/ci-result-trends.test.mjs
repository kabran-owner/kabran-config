import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DIRECTION,
  SIGNIFICANCE_THRESHOLD,
  calculateAverage,
  calculatePercentageChange,
  calculateAbsoluteChange,
  determineDirection,
  extractValues,
  calculateMetricTrend,
  calculateTrends,
  calculateTrendsByBranch,
  generateTimeSeries,
  getTrendSummary,
} from '../../src/scripts/ci-result-trends.mjs'

describe('ci-result-trends', () => {
  describe('constants', () => {
    it('exports DIRECTION enum', () => {
      expect(DIRECTION.IMPROVING).toBe('improving')
      expect(DIRECTION.DEGRADING).toBe('degrading')
      expect(DIRECTION.STABLE).toBe('stable')
    })

    it('exports SIGNIFICANCE_THRESHOLD', () => {
      expect(SIGNIFICANCE_THRESHOLD).toBe(5)
    })
  })

  describe('calculateAverage', () => {
    it('returns 0 for empty array', () => {
      expect(calculateAverage([])).toBe(0)
    })

    it('returns 0 for null/undefined', () => {
      expect(calculateAverage(null)).toBe(0)
      expect(calculateAverage(undefined)).toBe(0)
    })

    it('calculates average correctly', () => {
      expect(calculateAverage([10, 20, 30])).toBe(20)
      expect(calculateAverage([100])).toBe(100)
      expect(calculateAverage([0, 100])).toBe(50)
    })

    it('handles null values in array', () => {
      expect(calculateAverage([10, null, 20])).toBe(10) // (10 + 0 + 20) / 3
    })
  })

  describe('calculatePercentageChange', () => {
    it('calculates positive change', () => {
      expect(calculatePercentageChange(80, 100)).toBe(25) // +25%
    })

    it('calculates negative change', () => {
      expect(calculatePercentageChange(100, 80)).toBe(-20) // -20%
    })

    it('handles zero old value', () => {
      expect(calculatePercentageChange(0, 100)).toBe(100)
      expect(calculatePercentageChange(0, -100)).toBe(-100)
      expect(calculatePercentageChange(0, 0)).toBe(0)
    })
  })

  describe('calculateAbsoluteChange', () => {
    it('calculates absolute change', () => {
      expect(calculateAbsoluteChange(80, 100)).toBe(20)
      expect(calculateAbsoluteChange(100, 80)).toBe(-20)
      expect(calculateAbsoluteChange(50, 50)).toBe(0)
    })
  })

  describe('determineDirection', () => {
    it('returns stable for small changes', () => {
      expect(determineDirection(4)).toBe(DIRECTION.STABLE)
      expect(determineDirection(-4)).toBe(DIRECTION.STABLE)
      expect(determineDirection(0)).toBe(DIRECTION.STABLE)
    })

    it('returns improving for positive change (higher is better)', () => {
      expect(determineDirection(10, 5, true)).toBe(DIRECTION.IMPROVING)
    })

    it('returns degrading for negative change (higher is better)', () => {
      expect(determineDirection(-10, 5, true)).toBe(DIRECTION.DEGRADING)
    })

    it('inverts for metrics where lower is better', () => {
      // For performance (lower is better), positive change is degrading
      expect(determineDirection(10, 5, false)).toBe(DIRECTION.DEGRADING)
      expect(determineDirection(-10, 5, false)).toBe(DIRECTION.IMPROVING)
    })

    it('respects custom threshold', () => {
      expect(determineDirection(8, 10)).toBe(DIRECTION.STABLE)
      expect(determineDirection(11, 10)).toBe(DIRECTION.IMPROVING)
    })
  })

  describe('extractValues', () => {
    const entries = [
      { score: 85, timing: { total_ms: 60000 } },
      { score: 90, timing: { total_ms: 55000 } },
      { score: 88, timing: { total_ms: 58000 } },
    ]

    it('extracts top-level values', () => {
      const values = extractValues(entries, 'score')
      expect(values).toEqual([85, 90, 88])
    })

    it('extracts nested values with dot notation', () => {
      const values = extractValues(entries, 'timing.total_ms')
      expect(values).toEqual([60000, 55000, 58000])
    })

    it('returns 0 for missing values', () => {
      const values = extractValues(entries, 'nonexistent')
      expect(values).toEqual([0, 0, 0])
    })

    it('handles empty entries', () => {
      expect(extractValues([], 'score')).toEqual([])
    })
  })

  describe('calculateMetricTrend', () => {
    it('returns empty trend for no entries', () => {
      const trend = calculateMetricTrend([], 'score')

      expect(trend.direction).toBe(DIRECTION.STABLE)
      expect(trend.current).toBeNull()
      expect(trend.data_points).toBe(0)
    })

    it('calculates trend for single entry', () => {
      const entries = [
        { score: 85, generated_at: new Date().toISOString() },
      ]

      const trend = calculateMetricTrend(entries, 'score')

      expect(trend.current).toBe(85)
      expect(trend.data_points).toBe(1)
      expect(trend.direction).toBe(DIRECTION.STABLE)
    })

    it('calculates 7d and 30d changes', () => {
      const now = new Date()
      const entries = [
        { score: 90, generated_at: now.toISOString() },
        { score: 85, generated_at: new Date(now - 3 * 86400000).toISOString() },
        { score: 80, generated_at: new Date(now - 15 * 86400000).toISOString() },
      ]

      const trend = calculateMetricTrend(entries, 'score')

      expect(trend.current).toBe(90)
      expect(trend.change_7d).toBe(5) // 90 - 85
      expect(trend.change_30d).toBe(10) // 90 - 80
    })
  })

  describe('calculateTrends', () => {
    it('returns empty trends for no entries', () => {
      const trends = calculateTrends([])

      expect(trends.data.total_runs).toBe(0)
      expect(trends.score.data_points).toBe(0)
    })

    it('calculates all metric trends', () => {
      const now = new Date()
      const entries = [
        {
          score: 90,
          generated_at: now.toISOString(),
          timing: { total_ms: 60000 },
          summary: { total_issues: 2 },
        },
        {
          score: 85,
          generated_at: new Date(now - 7 * 86400000).toISOString(),
          timing: { total_ms: 65000 },
          summary: { total_issues: 5 },
        },
      ]

      const trends = calculateTrends(entries)

      expect(trends.data.total_runs).toBe(2)
      expect(trends.score.current).toBe(90)
      expect(trends.performance.current).toBe(60000)
      expect(trends.issues.current).toBe(2)
    })

    it('filters by branch when specified', () => {
      const entries = [
        { score: 90, branch: 'main', generated_at: '2026-01-13T10:00:00Z' },
        { score: 85, branch: 'develop', generated_at: '2026-01-12T10:00:00Z' },
        { score: 88, branch: 'main', generated_at: '2026-01-11T10:00:00Z' },
      ]

      const trends = calculateTrends(entries, 'main')

      expect(trends.data.total_runs).toBe(2)
      expect(trends.data.branch_filter).toBe('main')
    })
  })

  describe('calculateTrendsByBranch', () => {
    it('returns empty object for no entries', () => {
      expect(calculateTrendsByBranch([])).toEqual({})
    })

    it('groups trends by branch', () => {
      const entries = [
        { score: 90, branch: 'main', generated_at: '2026-01-13T10:00:00Z' },
        { score: 85, branch: 'develop', generated_at: '2026-01-13T10:00:00Z' },
        { score: 88, branch: 'main', generated_at: '2026-01-12T10:00:00Z' },
      ]

      const byBranch = calculateTrendsByBranch(entries)

      expect(byBranch.main).toBeDefined()
      expect(byBranch.develop).toBeDefined()
      expect(byBranch.main.data.total_runs).toBe(2)
      expect(byBranch.develop.data.total_runs).toBe(1)
    })
  })

  describe('generateTimeSeries', () => {
    it('returns empty array for no entries', () => {
      expect(generateTimeSeries([], 'score')).toEqual([])
    })

    it('generates time series data', () => {
      const entries = [
        { score: 90, run_id: 'run-1', branch: 'main', generated_at: '2026-01-13T10:00:00Z' },
        { score: 85, run_id: 'run-2', branch: 'main', generated_at: '2026-01-12T10:00:00Z' },
      ]

      const series = generateTimeSeries(entries, 'score')

      expect(series).toHaveLength(2)
      expect(series[0]).toEqual({
        date: '2026-01-13T10:00:00Z',
        value: 90,
        run_id: 'run-1',
        branch: 'main',
      })
    })

    it('respects limit parameter', () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        score: 80 + i,
        run_id: `run-${i}`,
        branch: 'main',
        generated_at: `2026-01-${String(50 - i).padStart(2, '0')}T10:00:00Z`,
      }))

      const series = generateTimeSeries(entries, 'score', 10)

      expect(series).toHaveLength(10)
    })
  })

  describe('getTrendSummary', () => {
    it('returns stable for no changes', () => {
      const trends = {
        score: { direction: DIRECTION.STABLE, change_7d: 0 },
        performance: { direction: DIRECTION.STABLE, change_7d: 0 },
        issues: { direction: DIRECTION.STABLE, change_7d: 0 },
      }

      const summary = getTrendSummary(trends)

      expect(summary.overall).toBe('stable')
      expect(summary.lines).toHaveLength(0)
    })

    it('detects improving trend', () => {
      const trends = {
        score: { direction: DIRECTION.IMPROVING, change_7d: 10 },
        performance: { direction: DIRECTION.STABLE, change_7d: 0 },
        issues: { direction: DIRECTION.IMPROVING, change_7d: -5 },
      }

      const summary = getTrendSummary(trends)

      expect(summary.overall).toBe('improving')
      expect(summary.lines.length).toBeGreaterThan(0)
    })

    it('detects degrading trend', () => {
      const trends = {
        score: { direction: DIRECTION.DEGRADING, change_7d: -15 },
        performance: { direction: DIRECTION.DEGRADING, change_7d: 5000 },
        issues: { direction: DIRECTION.STABLE, change_7d: 0 },
      }

      const summary = getTrendSummary(trends)

      expect(summary.overall).toBe('degrading')
    })
  })
})
