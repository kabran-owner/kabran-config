#!/usr/bin/env node

/**
 * PR Quality Comment Generator
 *
 * Generates a formatted PR comment comparing CI results between
 * the current branch and a baseline (typically main).
 *
 * Usage:
 *   node pr-quality-comment.mjs --current ci-result.json --baseline main-ci-result.json
 *   node pr-quality-comment.mjs --current ci-result.json --baseline-branch main
 *
 * Output: Markdown formatted comment to stdout
 *
 * @module pr-quality-comment
 */

import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { compareCiResults } from './ci-result-utils.mjs'

/**
 * Get trend emoji
 * @param {'improving'|'stable'|'degrading'} trend
 * @returns {string} Emoji
 */
function getTrendEmoji(trend) {
  switch (trend) {
    case 'improving': return '📈'
    case 'degrading': return '📉'
    default: return '➡️'
  }
}

/**
 * Get status emoji
 * @param {'passing'|'degraded'|'failing'} status
 * @returns {string} Emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'passing': return '✅'
    case 'degraded': return '⚠️'
    case 'failing': return '❌'
    default: return '❓'
  }
}

/**
 * Format diff with sign and color indicator
 * @param {number} diff - Difference value
 * @param {boolean} inverted - Whether positive is bad (for issues)
 * @returns {string} Formatted diff string
 */
function formatDiff(diff, inverted = false) {
  if (diff === 0) return '='
  const sign = diff > 0 ? '+' : ''
  const indicator = inverted
    ? (diff > 0 ? '🔴' : '🟢')
    : (diff > 0 ? '🟢' : '🔴')
  return `${sign}${diff} ${indicator}`
}

/**
 * Generate markdown comment from comparison
 * @param {Object} comparison - Comparison result from compareCiResults
 * @param {Object} current - Current CI result
 * @param {Object} baseline - Baseline CI result
 * @returns {string} Markdown formatted comment
 */
export function generateComment(comparison, current, baseline) {
  const lines = []

  // Header
  lines.push(`## ${getTrendEmoji(comparison.trend)} Quality Report`)
  lines.push('')

  // Status summary
  const currentStatus = `${getStatusEmoji(comparison.status.current)} ${comparison.status.current}`
  const baselineStatus = `${getStatusEmoji(comparison.status.baseline)} ${comparison.status.baseline}`

  lines.push(`| Metric | Current | Baseline | Diff |`)
  lines.push(`|--------|---------|----------|------|`)
  lines.push(`| **Status** | ${currentStatus} | ${baselineStatus} | - |`)
  lines.push(`| **Score** | ${comparison.score.current} | ${comparison.score.baseline} | ${formatDiff(comparison.score.diff)} |`)
  lines.push(`| **Issues** | ${comparison.issues.current} | ${comparison.issues.baseline} | ${formatDiff(comparison.issues.diff, true)} |`)
  lines.push(`| **Blocking** | ${comparison.blocking.current} | ${comparison.blocking.baseline} | ${formatDiff(comparison.blocking.diff, true)} |`)
  lines.push('')

  // Coverage section (if available)
  if (comparison.coverage) {
    lines.push(`### 📊 Coverage`)
    lines.push('')
    lines.push(`| Type | Current | Baseline | Diff |`)
    lines.push(`|------|---------|----------|------|`)

    const currentCov = current.checks?.test?.coverage || {}
    const baselineCov = baseline.checks?.test?.coverage || {}

    if (comparison.coverage.lines !== null) {
      lines.push(`| Lines | ${currentCov.lines || 0}% | ${baselineCov.lines || 0}% | ${formatDiff(comparison.coverage.lines)} |`)
    }
    if (comparison.coverage.branches !== null) {
      lines.push(`| Branches | ${currentCov.branches || 0}% | ${baselineCov.branches || 0}% | ${formatDiff(comparison.coverage.branches)} |`)
    }
    if (comparison.coverage.functions !== null) {
      lines.push(`| Functions | ${currentCov.functions || 0}% | ${baselineCov.functions || 0}% | ${formatDiff(comparison.coverage.functions)} |`)
    }
    lines.push('')
  }

  // Checks summary
  if (current.checks && Object.keys(current.checks).length > 0) {
    lines.push(`### 🔍 Checks`)
    lines.push('')
    lines.push(`| Check | Status | Errors | Warnings |`)
    lines.push(`|-------|--------|--------|----------|`)

    for (const [name, check] of Object.entries(current.checks)) {
      const emoji = getStatusEmoji(check.status)
      lines.push(`| ${name} | ${emoji} ${check.status} | ${check.errors || 0} | ${check.warnings || 0} |`)
    }
    lines.push('')
  }

  // New issues (if any)
  if (current.issues && current.issues.length > 0) {
    const newIssues = current.issues.filter(i => i.severity === 'error')
    if (newIssues.length > 0) {
      lines.push(`### ⚠️ Blocking Issues`)
      lines.push('')
      for (const issue of newIssues.slice(0, 5)) {
        lines.push(`- \`${issue.rule || issue.id}\`: ${issue.message}`)
        if (issue.file) {
          lines.push(`  - 📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`)
        }
      }
      if (newIssues.length > 5) {
        lines.push(`- ... and ${newIssues.length - 5} more`)
      }
      lines.push('')
    }
  }

  // Trends section (if available)
  if (current.trends && current.trends.data?.total_runs > 1) {
    lines.push(`### 📈 Trends`)
    lines.push('')
    lines.push(`| Metric | Direction | Change (7d) | Avg (30d) |`)
    lines.push(`|--------|-----------|-------------|-----------|`)

    const scoreTrend = current.trends.score
    if (scoreTrend) {
      const dirEmoji = scoreTrend.direction === 'improving' ? '📈' : scoreTrend.direction === 'degrading' ? '📉' : '➡️'
      lines.push(`| Score | ${dirEmoji} ${scoreTrend.direction} | ${scoreTrend.change_7d !== null ? formatDiff(scoreTrend.change_7d) : 'N/A'} | ${scoreTrend.avg_30d || 'N/A'} |`)
    }

    const perfTrend = current.trends.performance
    if (perfTrend && perfTrend.avg_30d) {
      const dirEmoji = perfTrend.direction === 'improving' ? '📈' : perfTrend.direction === 'degrading' ? '📉' : '➡️'
      const change7d = perfTrend.change_7d !== null ? `${(perfTrend.change_7d / 1000).toFixed(1)}s` : 'N/A'
      lines.push(`| Duration | ${dirEmoji} ${perfTrend.direction} | ${change7d} | ${(perfTrend.avg_30d / 1000).toFixed(1)}s |`)
    }

    lines.push('')
    lines.push(`<sub>Based on ${current.trends.data.total_runs} runs</sub>`)
    lines.push('')
  }

  // Timing info
  lines.push(`---`)
  lines.push(`<sub>`)
  lines.push(`⏱️ Duration: ${current.timing?.total_human || 'N/A'} | `)
  lines.push(`🔀 Branch: ${current.meta?.branch || 'N/A'} | `)
  lines.push(`📝 Commit: ${current.meta?.commit || 'N/A'}`)

  // Add trace link if available
  if (current.meta?.trace_id) {
    const traceUrl = current.extensions?.telemetry?.trace_url
    if (traceUrl) {
      lines.push(` | 🔍 [Trace](${traceUrl})`)
    } else {
      lines.push(` | 🔍 Trace: ${current.meta.trace_id}`)
    }
  }

  lines.push(`</sub>`)

  return lines.join('\n')
}

/**
 * Fetch baseline CI result from another branch
 * @param {string} branch - Branch name
 * @param {string} filePath - Path to ci-result.json in repo
 * @returns {Object|null} CI result or null
 */
export function fetchBaselineFromBranch(branch, filePath = 'docs/quality/ci-result.json') {
  try {
    const content = execSync(`git show ${branch}:${filePath}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    current: null,
    baseline: null,
    baselineBranch: null,
    output: 'stdout',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--current' || arg === '-c') {
      options.current = args[++i]
    } else if (arg === '--baseline' || arg === '-b') {
      options.baseline = args[++i]
    } else if (arg === '--baseline-branch') {
      options.baselineBranch = args[++i]
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pr-quality-comment.mjs [options]

Options:
  -c, --current <file>        Current CI result JSON file (required)
  -b, --baseline <file>       Baseline CI result JSON file
  --baseline-branch <branch>  Fetch baseline from git branch
  -o, --output <file>         Output file (default: stdout)
  -h, --help                  Show this help message

Examples:
  # Compare with file
  node pr-quality-comment.mjs -c ci-result.json -b main-ci-result.json

  # Compare with main branch
  node pr-quality-comment.mjs -c ci-result.json --baseline-branch main
`)
      process.exit(0)
    }
  }

  return options
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  // Validate current file
  if (!options.current) {
    console.error('Error: --current is required')
    process.exit(1)
  }

  if (!existsSync(options.current)) {
    console.error(`Error: Current file not found: ${options.current}`)
    process.exit(1)
  }

  // Load current result
  const current = JSON.parse(readFileSync(options.current, 'utf8'))

  // Load baseline result
  let baseline = null
  if (options.baseline) {
    if (!existsSync(options.baseline)) {
      console.error(`Error: Baseline file not found: ${options.baseline}`)
      process.exit(1)
    }
    baseline = JSON.parse(readFileSync(options.baseline, 'utf8'))
  } else if (options.baselineBranch) {
    baseline = fetchBaselineFromBranch(options.baselineBranch)
    if (!baseline) {
      console.error(`Warning: Could not fetch baseline from branch ${options.baselineBranch}`)
      // Create a minimal baseline for first PR
      baseline = {
        summary: { score: 100, total_issues: 0, blocking: 0, status: 'passing' },
        checks: {},
      }
    }
  } else {
    // No baseline provided, create empty comparison
    baseline = {
      summary: { score: 100, total_issues: 0, blocking: 0, status: 'passing' },
      checks: {},
    }
  }

  // Generate comparison
  const comparison = compareCiResults(current, baseline)

  // Generate comment
  const comment = generateComment(comparison, current, baseline)

  // Output
  if (options.output === 'stdout') {
    console.log(comment)
  } else {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(options.output, comment)
    console.log(`Comment written to: ${options.output}`)
  }
}

// Run if called directly
import { fileURLToPath } from 'node:url'
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}

export { generateComment as default, fetchBaselineFromBranch }
