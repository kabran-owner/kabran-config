#!/usr/bin/env node

/**
 * Generate CI Result
 *
 * Generates a ci-result.json file from CI step data.
 * Can be called from bash scripts or used programmatically.
 *
 * Usage:
 *   # Via stdin (JSON input)
 *   echo '{"steps": [...]}' | node generate-ci-result.mjs
 *
 *   # Via file
 *   node generate-ci-result.mjs --input /tmp/ci-steps.json
 *
 *   # With options
 *   node generate-ci-result.mjs --input data.json --output docs/quality/ci-result.json
 *
 * @module generate-ci-result
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  calculateScore,
  deriveStatus,
  formatDuration,
  generateRunId,
  detectTrigger,
  getGitBranch,
  getGitCommit,
  aggregateByCategory,
  calculateExecutionStats,
  countIssues,
  extractComponents,
  getTraceId,
  buildTelemetryExtension,
} from './ci-result-utils.mjs'

// History and trends imports
import { loadHistory, addToHistory, saveHistory } from './ci-result-history.mjs'
import { calculateTrends } from './ci-result-trends.mjs'

// Validator imports
import { getLicenseCheckResult } from './license-check.mjs'
import { getReadmeCheckResult } from './readme-validator.mjs'
import { getEnvCheckResult } from './env-validator.mjs'
import { getQualityStandardCheckResult } from './quality-standard-validator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Read package.json to get generator version
 */
function getGeneratorVersion() {
  try {
    const pkgPath = resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return `@kabran-tecnologia/kabran-config@${pkg.version}`
  } catch {
    return '@kabran-tecnologia/kabran-config'
  }
}

/**
 * Read project package.json
 */
function getProjectInfo(projectRoot) {
  try {
    const pkgPath = resolve(projectRoot, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return {
      name: pkg.name || 'unknown',
      version: pkg.version || '0.0.0',
    }
  } catch {
    return { name: 'unknown', version: '0.0.0' }
  }
}

/**
 * Run all validators and return check results
 *
 * @param {string} projectRoot - Project root directory
 * @param {Object} [options] - Options
 * @param {boolean} [options.skipLicense] - Skip license check
 * @param {boolean} [options.skipReadme] - Skip README check
 * @param {boolean} [options.skipEnv] - Skip env check
 * @param {boolean} [options.skipQualityStandard] - Skip quality standard check
 * @returns {Promise<Object>} Validator results for checks object
 */
async function runValidators(projectRoot, options = {}) {
  const results = {}

  if (!options.skipLicense) {
    try {
      results.license = await getLicenseCheckResult(projectRoot)
    } catch (err) {
      results.license = { status: 'fail', error: err.message }
    }
  }

  if (!options.skipReadme) {
    try {
      results.readme = await getReadmeCheckResult(projectRoot)
    } catch (err) {
      results.readme = { status: 'fail', error: err.message }
    }
  }

  if (!options.skipEnv) {
    try {
      results.env = await getEnvCheckResult(projectRoot)
    } catch (err) {
      results.env = { status: 'fail', error: err.message }
    }
  }

  if (!options.skipQualityStandard) {
    try {
      results.quality_standard = await getQualityStandardCheckResult(projectRoot)
    } catch (err) {
      results.quality_standard = { status: 'fail', error: err.message }
    }
  }

  return results
}

/**
 * Generate CI result from input data
 *
 * @param {Object} input - Input data
 * @param {Array} input.steps - Array of step results
 * @param {Array} input.errors - Array of error messages
 * @param {Object} input.timing - Timing information
 * @param {Object} input.project - Project information
 * @param {Object} input.metadata - Additional metadata
 * @param {Object} input.validators - Validator results (from runValidators)
 * @param {Object} input.trends - Pre-calculated trends (optional)
 * @returns {Object} CI result object
 */
export function generateCiResult(input) {
  const {
    steps = [],
    errors = [],
    timing = {},
    project = {},
    metadata = {},
    issues = [],
    validators = {},
    trends = null,
  } = input

  const now = new Date().toISOString()
  const startedAt = timing.started_at || now
  const finishedAt = timing.finished_at || now
  const totalMs = timing.total_ms || 0

  // Calculate aggregations
  const stepChecks = aggregateByCategory(steps)

  // Merge step-based checks with validator results
  const checks = {
    ...stepChecks,
    ...validators,
  }
  const executionStats = calculateExecutionStats(steps)
  const issueCounts = countIssues(issues)
  const components = extractComponents(steps)

  // Calculate score and status
  const score = calculateScore(checks, issues)
  const status = deriveStatus(score, issueCounts.blocking)

  // Determine exit code
  const exitCode = executionStats.steps_failed > 0 ? 1 : 0

  // Get trace ID - prefer trace_context from input (shell-generated) over env vars
  const traceContext = input.trace_context || {}
  const traceId = traceContext.trace_id || getTraceId()

  // Build meta object
  const meta = {
    generated_at: now,
    generator: getGeneratorVersion(),
    run_id: generateRunId(),
    trigger: detectTrigger(),
    branch: getGitBranch(),
    commit: getGitCommit(),
  }

  // Add trace_id if available
  if (traceId) {
    meta.trace_id = traceId
  }

  // Build extensions with telemetry if trace_id exists
  const extensions = { ...(metadata.extensions || {}) }
  if (traceId) {
    // Count errors from failed steps
    const errorsRecorded = executionStats.steps_failed || 0

    extensions.telemetry = buildTelemetryExtension(traceId, {
      errorsRecorded,
      // spans_exported remains 0 until we implement actual OTel export (GAP-004/Q12)
      spansExported: 0,
    })

    // Add trace source info if available
    if (traceContext.source) {
      extensions.telemetry.trace_source = traceContext.source
    }
  }

  // Build result object
  const result = {
    $schema: 'https://kabran.dev/schemas/ci-result.v2.json',
    version: '1.0.0',

    meta,

    project: {
      name: project.name || 'unknown',
      version: project.version,
      type: components.length > 0 ? 'monorepo' : 'single',
      components,
    },

    summary: {
      status,
      exit_code: exitCode,
      score,
      total_issues: issueCounts.total,
      blocking: issueCounts.blocking,
      warnings: issueCounts.warnings,
    },

    timing: {
      total_ms: totalMs,
      total_human: formatDuration(totalMs),
      started_at: startedAt,
      finished_at: finishedAt,
    },

    execution: {
      scope: metadata.scope || 'all',
      components_executed: components,
      ...executionStats,
    },

    steps,
    checks,
    issues,
    errors,
    extensions,
  }

  // Add trends if provided
  if (trends) {
    result.trends = trends
  }

  return result
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    input: null,
    output: null,
    projectRoot: process.cwd(),
    stdout: false,
    runValidators: false,
    skipLicense: false,
    skipReadme: false,
    skipEnv: false,
    skipQualityStandard: false,
    trackHistory: false,
    historyFile: null,
    maxHistoryEntries: 30,
    calculateTrends: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--input' || arg === '-i') {
      options.input = args[++i]
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i]
    } else if (arg === '--project-root' || arg === '-p') {
      options.projectRoot = args[++i]
    } else if (arg === '--stdout') {
      options.stdout = true
    } else if (arg === '--run-validators') {
      options.runValidators = true
    } else if (arg === '--skip-license') {
      options.skipLicense = true
    } else if (arg === '--skip-readme') {
      options.skipReadme = true
    } else if (arg === '--skip-env') {
      options.skipEnv = true
    } else if (arg === '--skip-quality-standard') {
      options.skipQualityStandard = true
    } else if (arg === '--track-history') {
      options.trackHistory = true
    } else if (arg === '--history-file') {
      options.historyFile = args[++i]
      options.trackHistory = true
    } else if (arg === '--max-history') {
      options.maxHistoryEntries = parseInt(args[++i], 10) || 30
    } else if (arg === '--calculate-trends') {
      options.calculateTrends = true
      options.trackHistory = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: generate-ci-result.mjs [options]

Options:
  -i, --input <file>        Input JSON file with step data
  -o, --output <file>       Output file path (default: docs/quality/ci-result.json)
  -p, --project-root <dir>  Project root directory (default: cwd)
  --stdout                  Print result to stdout instead of file
  --run-validators          Run all validators (license, readme, env, quality-standard)
  --skip-license            Skip license check when running validators
  --skip-readme             Skip README check when running validators
  --skip-env                Skip env check when running validators
  --skip-quality-standard   Skip quality-standard check when running validators
  --track-history           Track result in history file (max 30 entries)
  --history-file <file>     Custom history file path (default: docs/quality/ci-result-history.json)
  --max-history <n>         Maximum history entries to keep (default: 30)
  --calculate-trends        Calculate and include trends from history
  -h, --help                Show this help message

Input format:
  {
    "steps": [
      {
        "name": "lint",
        "status": "pass",
        "exit_code": 0,
        "duration_ms": 3420,
        "category": "lint",
        "output": { "errors": 0, "warnings": 5 }
      }
    ],
    "errors": [],
    "timing": {
      "total_ms": 180000,
      "started_at": "2026-01-13T12:00:00Z",
      "finished_at": "2026-01-13T12:03:00Z"
    }
  }
`)
      process.exit(0)
    }
  }

  return options
}

/**
 * Read input data from file or stdin
 */
async function readInput(inputPath) {
  if (inputPath) {
    const content = readFileSync(inputPath, 'utf8')
    return JSON.parse(content)
  }

  // Read from stdin
  return new Promise((resolve, reject) => {
    let data = ''

    // If stdin is a TTY (no pipe), return empty object
    if (process.stdin.isTTY) {
      resolve({})
      return
    }

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => {
      data += chunk
    })
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (err) {
        reject(new Error(`Invalid JSON input: ${err.message}`))
      }
    })
    process.stdin.on('error', reject)
  })
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  try {
    // Read input
    const input = await readInput(options.input)

    // Get project info if not provided
    if (!input.project) {
      input.project = getProjectInfo(options.projectRoot)
    }

    // Run validators if requested
    if (options.runValidators) {
      input.validators = await runValidators(options.projectRoot, {
        skipLicense: options.skipLicense,
        skipReadme: options.skipReadme,
        skipEnv: options.skipEnv,
        skipQualityStandard: options.skipQualityStandard,
      })
    }

    // Determine paths
    const outputPath = options.output || resolve(options.projectRoot, 'docs/quality/ci-result.json')
    const historyPath = options.historyFile || resolve(options.projectRoot, 'docs/quality/ci-result-history.json')

    // Load history and calculate trends if requested
    let history = null
    if (options.trackHistory || options.calculateTrends) {
      history = loadHistory(historyPath)

      // Calculate trends if requested
      if (options.calculateTrends && history.entries.length > 0) {
        input.trends = calculateTrends(history.entries)
      }
    }

    // Generate result
    const result = generateCiResult(input)

    // Update history with new result
    if (options.trackHistory && history) {
      addToHistory(result, history)
      saveHistory(history, historyPath, options.maxHistoryEntries)
      console.log(`History updated: ${historyPath} (${history.entries.length} entries)`)
    }

    // Output
    if (options.stdout) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      // Ensure directory exists
      mkdirSync(dirname(outputPath), { recursive: true })

      // Write file
      writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n')
      console.log(`CI result written to: ${outputPath}`)

      // Also print minified for Kosmos parsing
      console.log(`CI_RESULT_JSON: ${JSON.stringify(result)}`)
    }

    // Exit with result exit code
    process.exit(result.summary.exit_code)
  } catch (err) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}

export { generateCiResult as default, runValidators }
