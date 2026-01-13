/**
 * CI Result Utilities
 *
 * Utility functions for calculating quality scores, deriving status,
 * and formatting CI result data.
 *
 * @module ci-result-utils
 */

import { randomUUID } from 'node:crypto'
import { execSync } from 'node:child_process'

/**
 * Calculate quality score based on checks and issues
 *
 * Scoring algorithm:
 * - Start with 100
 * - -20 per failed check
 * - -5 per warned check
 * - -10 per blocking issue (severity: error)
 * - -1 per warning issue (severity: warning)
 *
 * @param {Object} checks - Check results object
 * @param {Array} issues - Array of issue objects
 * @returns {number} Score between 0-100
 */
export function calculateScore(checks = {}, issues = []) {
  let score = 100

  // Penalize by check status
  for (const check of Object.values(checks)) {
    if (check.status === 'fail') {
      score -= 20
    } else if (check.status === 'warn') {
      score -= 5
    }
  }

  // Penalize by issue severity
  for (const issue of issues) {
    if (issue.severity === 'error') {
      score -= 10
    } else if (issue.severity === 'warning') {
      score -= 1
    }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Derive overall status from score and blocking issues
 *
 * Status rules:
 * - passing: score >= 80 AND blocking = 0
 * - degraded: score >= 50 AND blocking = 0
 * - failing: score < 50 OR blocking > 0
 *
 * @param {number} score - Quality score (0-100)
 * @param {number} blocking - Number of blocking issues
 * @returns {'passing'|'degraded'|'failing'} Status string
 */
export function deriveStatus(score, blocking = 0) {
  if (blocking > 0 || score < 50) {
    return 'failing'
  }
  if (score >= 80) {
    return 'passing'
  }
  return 'degraded'
}

/**
 * Format milliseconds to human-readable string
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human-readable duration (e.g., "3m 45s", "1.2s", "150ms")
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

/**
 * Generate a unique run ID
 *
 * @returns {string} UUID v4
 */
export function generateRunId() {
  return randomUUID()
}

/**
 * Detect trigger type from environment variables
 *
 * @returns {'local'|'ci'|'pr'} Trigger type
 */
export function detectTrigger() {
  // GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
      return 'pr'
    }
    return 'ci'
  }

  // GitLab CI
  if (process.env.GITLAB_CI) {
    if (process.env.CI_MERGE_REQUEST_ID) {
      return 'pr'
    }
    return 'ci'
  }

  // Generic CI
  if (process.env.CI) {
    return 'ci'
  }

  return 'local'
}

/**
 * Get current git branch name
 *
 * @returns {string|null} Branch name or null
 */
export function getGitBranch() {
  // GitHub Actions
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME
  }
  if (process.env.GITHUB_HEAD_REF) {
    return process.env.GITHUB_HEAD_REF
  }

  // GitLab CI
  if (process.env.CI_COMMIT_BRANCH) {
    return process.env.CI_COMMIT_BRANCH
  }

  // Fallback: try to read from git
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/**
 * Get current git commit SHA
 *
 * @param {boolean} short - Return short SHA (default: true)
 * @returns {string|null} Commit SHA or null
 */
export function getGitCommit(short = true) {
  // GitHub Actions
  if (process.env.GITHUB_SHA) {
    return short ? process.env.GITHUB_SHA.substring(0, 7) : process.env.GITHUB_SHA
  }

  // GitLab CI
  if (process.env.CI_COMMIT_SHA) {
    return short ? process.env.CI_COMMIT_SHA.substring(0, 7) : process.env.CI_COMMIT_SHA
  }

  // Fallback: try to read from git
  try {
    const flag = short ? '--short' : ''
    return execSync(`git rev-parse ${flag} HEAD`, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/**
 * Aggregate step results by category
 *
 * @param {Array} steps - Array of step results
 * @returns {Object} Checks object keyed by category
 */
export function aggregateByCategory(steps) {
  const checks = {}

  for (const step of steps) {
    const category = step.category || 'custom'

    if (!checks[category]) {
      checks[category] = {
        status: 'pass',
        errors: 0,
        warnings: 0,
        by_component: {},
      }
    }

    const check = checks[category]

    // Update status (worst wins)
    if (step.status === 'fail') {
      check.status = 'fail'
    } else if (step.status === 'warn' && check.status !== 'fail') {
      check.status = 'warn'
    }

    // Aggregate counts
    if (step.output) {
      check.errors += step.output.errors || 0
      check.warnings += step.output.warnings || 0
    }

    // Aggregate by component
    if (step.component) {
      if (!check.by_component[step.component]) {
        check.by_component[step.component] = { errors: 0, warnings: 0 }
      }
      if (step.output) {
        check.by_component[step.component].errors += step.output.errors || 0
        check.by_component[step.component].warnings += step.output.warnings || 0
      }
    }
  }

  return checks
}

/**
 * Calculate execution statistics from steps
 *
 * @param {Array} steps - Array of step results
 * @returns {Object} Execution statistics
 */
export function calculateExecutionStats(steps) {
  const stats = {
    steps_total: steps.length,
    steps_executed: 0,
    steps_skipped: 0,
    steps_passed: 0,
    steps_failed: 0,
    steps_warned: 0,
  }

  for (const step of steps) {
    if (step.status === 'skip') {
      stats.steps_skipped++
    } else {
      stats.steps_executed++
      if (step.status === 'pass') {
        stats.steps_passed++
      } else if (step.status === 'fail') {
        stats.steps_failed++
      } else if (step.status === 'warn') {
        stats.steps_warned++
      }
    }
  }

  return stats
}

/**
 * Count issues by severity
 *
 * @param {Array} issues - Array of issue objects
 * @returns {Object} Issue counts { total, blocking, warnings }
 */
export function countIssues(issues) {
  const counts = {
    total: issues.length,
    blocking: 0,
    warnings: 0,
  }

  for (const issue of issues) {
    if (issue.severity === 'error') {
      counts.blocking++
    } else if (issue.severity === 'warning') {
      counts.warnings++
    }
  }

  return counts
}

/**
 * Extract unique components from steps
 *
 * @param {Array} steps - Array of step results
 * @returns {Array} Array of component names
 */
export function extractComponents(steps) {
  const components = new Set()
  for (const step of steps) {
    if (step.component) {
      components.add(step.component)
    }
  }
  return Array.from(components).sort()
}

/**
 * Create a minimal valid CI result object
 *
 * @param {Object} options - Options
 * @param {string} options.projectName - Project name
 * @param {boolean} options.passed - Whether CI passed
 * @returns {Object} CI result object
 */
export function createMinimalResult({ projectName, passed = true }) {
  const now = new Date().toISOString()

  return {
    $schema: 'https://kabran.dev/schemas/ci-result.v2.json',
    version: '1.0.0',
    meta: {
      generated_at: now,
      generator: '@kabran-tecnologia/kabran-config',
      run_id: generateRunId(),
      trigger: detectTrigger(),
      branch: getGitBranch(),
      commit: getGitCommit(),
    },
    project: {
      name: projectName,
      type: 'single',
      components: [],
    },
    summary: {
      status: passed ? 'passing' : 'failing',
      exit_code: passed ? 0 : 1,
      score: passed ? 100 : 0,
      total_issues: 0,
      blocking: 0,
      warnings: 0,
    },
    timing: {
      total_ms: 0,
      total_human: '0ms',
      started_at: now,
      finished_at: now,
    },
    execution: {
      scope: 'all',
      components_executed: [],
      steps_total: 0,
      steps_executed: 0,
      steps_skipped: 0,
      steps_passed: 0,
      steps_failed: 0,
      steps_warned: 0,
    },
    steps: [],
    checks: {},
    issues: [],
    errors: [],
    extensions: {},
  }
}
