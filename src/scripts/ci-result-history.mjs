/**
 * CI Result History Module
 *
 * Manages historical CI run data for trend analysis.
 * Stores up to 30 recent runs in docs/quality/ci-result-history.json.
 *
 * @module ci-result-history
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Default maximum number of history entries to keep
 */
export const DEFAULT_MAX_ENTRIES = 30

/**
 * Extract a minimal history entry from a full CI result
 *
 * @param {Object} result - Full CI result object
 * @returns {Object} Minimal history entry
 */
export function extractHistoryEntry(result) {
  return {
    run_id: result.meta?.run_id || 'unknown',
    generated_at: result.meta?.generated_at || new Date().toISOString(),
    branch: result.meta?.branch || 'unknown',
    commit: result.meta?.commit || 'unknown',
    score: result.summary?.score ?? 0,
    status: result.summary?.status || 'unknown',
    timing: {
      total_ms: result.timing?.total_ms || 0,
      total_human: result.timing?.total_human || '0ms',
    },
    summary: {
      exit_code: result.summary?.exit_code ?? 0,
      total_issues: result.summary?.total_issues ?? 0,
      blocking: result.summary?.blocking ?? 0,
      warnings: result.summary?.warnings ?? 0,
    },
  }
}

/**
 * Load history from file
 *
 * @param {string} filePath - Path to history file
 * @returns {Object} History object with entries array and metadata
 */
export function loadHistory(filePath) {
  if (!existsSync(filePath)) {
    return {
      $schema: 'https://kabran.dev/schemas/ci-result-history.json',
      version: '1.0.0',
      meta: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        max_entries: DEFAULT_MAX_ENTRIES,
      },
      entries: [],
    }
  }

  try {
    const content = readFileSync(filePath, 'utf8')
    const history = JSON.parse(content)

    // Ensure entries is an array
    if (!Array.isArray(history.entries)) {
      history.entries = []
    }

    return history
  } catch (error) {
    // If file is corrupted, start fresh
    return {
      $schema: 'https://kabran.dev/schemas/ci-result-history.json',
      version: '1.0.0',
      meta: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        max_entries: DEFAULT_MAX_ENTRIES,
        error: `Failed to load: ${error.message}`,
      },
      entries: [],
    }
  }
}

/**
 * Prune history to maximum number of entries
 *
 * @param {Array} entries - History entries
 * @param {number} maxEntries - Maximum entries to keep
 * @returns {Array} Pruned entries (most recent first)
 */
export function pruneHistory(entries, maxEntries = DEFAULT_MAX_ENTRIES) {
  if (!Array.isArray(entries)) {
    return []
  }

  // Sort by generated_at descending (most recent first)
  const sorted = [...entries].sort((a, b) => {
    const dateA = new Date(a.generated_at || 0)
    const dateB = new Date(b.generated_at || 0)
    return dateB - dateA
  })

  // Keep only the most recent entries
  return sorted.slice(0, maxEntries)
}

/**
 * Add a CI result to history
 *
 * @param {Object} result - Full CI result object
 * @param {Object} history - Existing history object
 * @returns {Object} Updated history object
 */
export function addToHistory(result, history) {
  const entry = extractHistoryEntry(result)

  // Check for duplicate run_id
  const existingIndex = history.entries.findIndex((e) => e.run_id === entry.run_id)

  if (existingIndex >= 0) {
    // Update existing entry
    history.entries[existingIndex] = entry
  } else {
    // Add new entry at the beginning
    history.entries.unshift(entry)
  }

  // Update metadata
  history.meta = {
    ...history.meta,
    updated_at: new Date().toISOString(),
  }

  return history
}

/**
 * Save history to file
 *
 * @param {Object} history - History object
 * @param {string} filePath - Path to save
 * @param {number} maxEntries - Maximum entries to keep
 */
export function saveHistory(history, filePath, maxEntries = DEFAULT_MAX_ENTRIES) {
  // Prune before saving
  history.entries = pruneHistory(history.entries, maxEntries)
  history.meta.max_entries = maxEntries
  history.meta.entry_count = history.entries.length

  // Ensure directory exists
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Write file
  writeFileSync(filePath, JSON.stringify(history, null, 2) + '\n')
}

/**
 * Get entries for a specific branch
 *
 * @param {Array} entries - History entries
 * @param {string} branch - Branch name to filter
 * @returns {Array} Filtered entries
 */
export function filterByBranch(entries, branch) {
  if (!branch) return entries
  return entries.filter((e) => e.branch === branch)
}

/**
 * Get entries within a date range
 *
 * @param {Array} entries - History entries
 * @param {number} days - Number of days to include
 * @returns {Array} Filtered entries
 */
export function filterByDays(entries, days) {
  if (!days || days <= 0) return entries

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  return entries.filter((e) => {
    const date = new Date(e.generated_at)
    return date >= cutoff
  })
}

/**
 * Get statistics from history
 *
 * @param {Array} entries - History entries
 * @returns {Object} Statistics object
 */
export function getHistoryStats(entries) {
  if (!entries || entries.length === 0) {
    return {
      total_runs: 0,
      oldest_run: null,
      newest_run: null,
      unique_branches: 0,
      branches: [],
    }
  }

  const sorted = [...entries].sort((a, b) => {
    return new Date(a.generated_at) - new Date(b.generated_at)
  })

  const branches = [...new Set(entries.map((e) => e.branch).filter(Boolean))]

  return {
    total_runs: entries.length,
    oldest_run: sorted[0]?.generated_at || null,
    newest_run: sorted[sorted.length - 1]?.generated_at || null,
    unique_branches: branches.length,
    branches,
  }
}

/**
 * Process a CI result and update history
 *
 * Convenience function that loads, updates, and saves history.
 *
 * @param {Object} result - Full CI result object
 * @param {string} historyPath - Path to history file
 * @param {number} maxEntries - Maximum entries to keep
 * @returns {Object} Updated history object
 */
export function processHistory(result, historyPath, maxEntries = DEFAULT_MAX_ENTRIES) {
  const history = loadHistory(historyPath)
  addToHistory(result, history)
  saveHistory(history, historyPath, maxEntries)
  return history
}
