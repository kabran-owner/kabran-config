/**
 * CI Result Trends Module
 *
 * Calculates trends from historical CI run data.
 * Analyzes score, performance, and issues over time.
 *
 * @module ci-result-trends
 */

import { filterByDays, filterByBranch } from './ci-result-history.mjs'

/**
 * Direction indicators for trends
 */
export const DIRECTION = {
  IMPROVING: 'improving',
  DEGRADING: 'degrading',
  STABLE: 'stable',
}

/**
 * Threshold for determining significant change (percentage)
 */
export const SIGNIFICANCE_THRESHOLD = 5

/**
 * Calculate average of numeric values
 *
 * @param {number[]} values - Array of numbers
 * @returns {number} Average value
 */
export function calculateAverage(values) {
  if (!values || values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + (val || 0), 0)
  return sum / values.length
}

/**
 * Calculate percentage change between two values
 *
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value
 * @returns {number} Percentage change (null if cannot calculate)
 */
export function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) {
    if (newValue === 0) return 0
    return newValue > 0 ? 100 : -100
  }
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

/**
 * Calculate absolute change between two values
 *
 * @param {number} oldValue - Previous value
 * @param {number} newValue - Current value
 * @returns {number} Absolute change
 */
export function calculateAbsoluteChange(oldValue, newValue) {
  return newValue - oldValue
}

/**
 * Determine direction of trend
 *
 * @param {number} changePercent - Percentage change
 * @param {number} threshold - Significance threshold
 * @param {boolean} higherIsBetter - Whether higher values are better
 * @returns {string} Direction: 'improving', 'degrading', or 'stable'
 */
export function determineDirection(changePercent, threshold = SIGNIFICANCE_THRESHOLD, higherIsBetter = true) {
  if (Math.abs(changePercent) < threshold) {
    return DIRECTION.STABLE
  }

  const isPositive = changePercent > 0

  if (higherIsBetter) {
    return isPositive ? DIRECTION.IMPROVING : DIRECTION.DEGRADING
  } else {
    return isPositive ? DIRECTION.DEGRADING : DIRECTION.IMPROVING
  }
}

/**
 * Extract field values from history entries
 *
 * @param {Object[]} entries - History entries
 * @param {string} field - Field path (dot notation supported)
 * @returns {number[]} Array of values
 */
export function extractValues(entries, field) {
  return entries.map((entry) => {
    const parts = field.split('.')
    let value = entry
    for (const part of parts) {
      value = value?.[part]
    }
    return typeof value === 'number' ? value : 0
  })
}

/**
 * Calculate trend for a specific metric
 *
 * @param {Object[]} entries - History entries (newest first)
 * @param {string} field - Field path to analyze
 * @param {boolean} higherIsBetter - Whether higher values are better
 * @returns {Object} Trend object with direction and changes
 */
export function calculateMetricTrend(entries, field, higherIsBetter = true) {
  if (!entries || entries.length === 0) {
    return {
      direction: DIRECTION.STABLE,
      current: null,
      change_7d: null,
      change_30d: null,
      avg_7d: null,
      avg_30d: null,
      data_points: 0,
    }
  }

  const values = extractValues(entries, field)
  const current = values[0] || 0

  // Get entries by time period
  const entries7d = filterByDays(entries, 7)
  const entries30d = filterByDays(entries, 30)

  const values7d = extractValues(entries7d, field)
  const values30d = extractValues(entries30d, field)

  const avg7d = calculateAverage(values7d)
  const avg30d = calculateAverage(values30d)

  // Calculate changes
  const change7d = values7d.length > 1 ? calculateAbsoluteChange(values7d[values7d.length - 1], current) : null

  const change30d = values30d.length > 1 ? calculateAbsoluteChange(values30d[values30d.length - 1], current) : null

  // Determine direction based on 7d vs 30d averages
  let direction = DIRECTION.STABLE
  if (avg30d !== 0 && values7d.length >= 2 && values30d.length >= 2) {
    const percentChange = calculatePercentageChange(avg30d, avg7d)
    direction = determineDirection(percentChange, SIGNIFICANCE_THRESHOLD, higherIsBetter)
  }

  return {
    direction,
    current: Math.round(current * 100) / 100,
    change_7d: change7d !== null ? Math.round(change7d * 100) / 100 : null,
    change_30d: change30d !== null ? Math.round(change30d * 100) / 100 : null,
    avg_7d: Math.round(avg7d * 100) / 100,
    avg_30d: Math.round(avg30d * 100) / 100,
    data_points: entries.length,
  }
}

/**
 * Calculate all trends from history entries
 *
 * @param {Object[]} entries - History entries (newest first)
 * @param {string} [branch] - Optional branch filter
 * @returns {Object} Complete trends object
 */
export function calculateTrends(entries, branch = null) {
  // Filter by branch if specified
  const filteredEntries = branch ? filterByBranch(entries, branch) : entries

  if (!filteredEntries || filteredEntries.length === 0) {
    return {
      score: createEmptyTrend(),
      performance: createEmptyTrend(),
      issues: createEmptyTrend(),
      data: {
        total_runs: 0,
        branch_filter: branch,
        calculated_at: new Date().toISOString(),
      },
    }
  }

  return {
    score: calculateMetricTrend(filteredEntries, 'score', true),
    performance: calculateMetricTrend(filteredEntries, 'timing.total_ms', false),
    issues: calculateMetricTrend(filteredEntries, 'summary.total_issues', false),
    data: {
      total_runs: filteredEntries.length,
      branch_filter: branch,
      calculated_at: new Date().toISOString(),
      date_range: {
        from: filteredEntries[filteredEntries.length - 1]?.generated_at,
        to: filteredEntries[0]?.generated_at,
      },
    },
  }
}

/**
 * Create an empty trend object
 *
 * @returns {Object} Empty trend structure
 */
function createEmptyTrend() {
  return {
    direction: DIRECTION.STABLE,
    current: null,
    change_7d: null,
    change_30d: null,
    avg_7d: null,
    avg_30d: null,
    data_points: 0,
  }
}

/**
 * Calculate trends grouped by branch
 *
 * @param {Object[]} entries - History entries
 * @returns {Object} Trends by branch
 */
export function calculateTrendsByBranch(entries) {
  if (!entries || entries.length === 0) {
    return {}
  }

  const branches = [...new Set(entries.map((e) => e.branch).filter(Boolean))]
  const result = {}

  for (const branch of branches) {
    result[branch] = calculateTrends(entries, branch)
  }

  return result
}

/**
 * Generate time series data for visualization
 *
 * @param {Object[]} entries - History entries
 * @param {string} field - Field to extract
 * @param {number} [limit] - Maximum data points
 * @returns {Object[]} Time series array
 */
export function generateTimeSeries(entries, field, limit = 30) {
  if (!entries || entries.length === 0) return []

  const values = extractValues(entries, field)

  return entries.slice(0, limit).map((entry, index) => ({
    date: entry.generated_at,
    value: values[index],
    run_id: entry.run_id,
    branch: entry.branch,
  }))
}

/**
 * Calculate summary statistics for trend display
 *
 * @param {Object} trends - Trends object from calculateTrends
 * @returns {Object} Summary for display
 */
export function getTrendSummary(trends) {
  const summaryLines = []

  if (trends.score.direction !== DIRECTION.STABLE) {
    const emoji = trends.score.direction === DIRECTION.IMPROVING ? '+' : '-'
    const change = trends.score.change_7d !== null ? Math.abs(trends.score.change_7d) : 0
    summaryLines.push(`Score ${trends.score.direction} (${emoji}${change} over 7d)`)
  }

  if (trends.performance.direction !== DIRECTION.STABLE) {
    const emoji = trends.performance.direction === DIRECTION.IMPROVING ? '-' : '+'
    const change = trends.performance.change_7d !== null ? Math.abs(trends.performance.change_7d / 1000) : 0
    summaryLines.push(`Performance ${trends.performance.direction} (${emoji}${change.toFixed(1)}s over 7d)`)
  }

  if (trends.issues.direction !== DIRECTION.STABLE) {
    const emoji = trends.issues.direction === DIRECTION.IMPROVING ? '-' : '+'
    const change = trends.issues.change_7d !== null ? Math.abs(trends.issues.change_7d) : 0
    summaryLines.push(`Issues ${trends.issues.direction} (${emoji}${change} over 7d)`)
  }

  return {
    lines: summaryLines,
    overall:
      summaryLines.length === 0
        ? 'stable'
        : summaryLines.some((l) => l.includes('degrading'))
          ? 'degrading'
          : 'improving',
  }
}
