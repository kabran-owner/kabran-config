import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  deriveStatus,
  formatDuration,
  aggregateByCategory,
  calculateExecutionStats,
  countIssues,
  extractComponents,
  createMinimalResult,
  aggregateCoverage,
  compareCiResults,
} from '../../src/scripts/ci-result-utils.mjs'

describe('ci-result-utils', () => {
  describe('calculateScore', () => {
    it('returns 100 for empty inputs', () => {
      expect(calculateScore({}, [])).toBe(100)
    })

    it('deducts 20 points per failed check', () => {
      const checks = {
        lint: { status: 'fail' },
        test: { status: 'pass' },
      }
      expect(calculateScore(checks, [])).toBe(80)
    })

    it('deducts 5 points per warned check', () => {
      const checks = {
        lint: { status: 'warn' },
        test: { status: 'pass' },
      }
      expect(calculateScore(checks, [])).toBe(95)
    })

    it('deducts 10 points per blocking issue', () => {
      const issues = [
        { severity: 'error' },
        { severity: 'error' },
      ]
      expect(calculateScore({}, issues)).toBe(80)
    })

    it('deducts 1 point per warning issue', () => {
      const issues = [
        { severity: 'warning' },
        { severity: 'warning' },
        { severity: 'warning' },
      ]
      expect(calculateScore({}, issues)).toBe(97)
    })

    it('combines all deductions', () => {
      const checks = {
        lint: { status: 'fail' },    // -20
        deps: { status: 'warn' },    // -5
      }
      const issues = [
        { severity: 'error' },       // -10
        { severity: 'warning' },     // -1
        { severity: 'info' },        // 0
      ]
      // 100 - 20 - 5 - 10 - 1 = 64
      expect(calculateScore(checks, issues)).toBe(64)
    })

    it('clamps score to minimum 0', () => {
      const checks = {
        a: { status: 'fail' },
        b: { status: 'fail' },
        c: { status: 'fail' },
        d: { status: 'fail' },
        e: { status: 'fail' },
        f: { status: 'fail' },
      }
      expect(calculateScore(checks, [])).toBe(0)
    })

    it('clamps score to maximum 100', () => {
      expect(calculateScore({}, [])).toBe(100)
    })
  })

  describe('deriveStatus', () => {
    it('returns passing for score >= 80 and no blocking', () => {
      expect(deriveStatus(100, 0)).toBe('passing')
      expect(deriveStatus(80, 0)).toBe('passing')
    })

    it('returns degraded for score 50-79 and no blocking', () => {
      expect(deriveStatus(79, 0)).toBe('degraded')
      expect(deriveStatus(50, 0)).toBe('degraded')
    })

    it('returns failing for score < 50', () => {
      expect(deriveStatus(49, 0)).toBe('failing')
      expect(deriveStatus(0, 0)).toBe('failing')
    })

    it('returns failing if blocking > 0 regardless of score', () => {
      expect(deriveStatus(100, 1)).toBe('failing')
      expect(deriveStatus(80, 1)).toBe('failing')
    })
  })

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(50)).toBe('50ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    it('formats seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s')
      expect(formatDuration(5500)).toBe('5.5s')
      expect(formatDuration(59999)).toBe('60.0s')
    })

    it('formats minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 00s')
      expect(formatDuration(90000)).toBe('1m 30s')
      expect(formatDuration(3661000)).toBe('61m 01s')
    })
  })

  describe('aggregateByCategory', () => {
    it('returns empty object for empty steps', () => {
      expect(aggregateByCategory([])).toEqual({})
    })

    it('aggregates steps by category', () => {
      const steps = [
        { name: 'app-lint', category: 'lint', status: 'pass', output: { errors: 0, warnings: 5 } },
        { name: 'web-lint', category: 'lint', status: 'pass', output: { errors: 0, warnings: 3 } },
        { name: 'test', category: 'test', status: 'pass', output: { errors: 0, warnings: 0 } },
      ]
      const result = aggregateByCategory(steps)

      expect(result.lint.status).toBe('pass')
      expect(result.lint.warnings).toBe(8)
      expect(result.test.status).toBe('pass')
    })

    it('sets status to fail if any step fails', () => {
      const steps = [
        { name: 'lint1', category: 'lint', status: 'pass' },
        { name: 'lint2', category: 'lint', status: 'fail' },
      ]
      const result = aggregateByCategory(steps)

      expect(result.lint.status).toBe('fail')
    })

    it('tracks by_component', () => {
      const steps = [
        { name: 'app-lint', category: 'lint', component: 'app', status: 'pass', output: { errors: 0, warnings: 5 } },
        { name: 'web-lint', category: 'lint', component: 'website', status: 'pass', output: { errors: 0, warnings: 3 } },
      ]
      const result = aggregateByCategory(steps)

      expect(result.lint.by_component.app.warnings).toBe(5)
      expect(result.lint.by_component.website.warnings).toBe(3)
    })

    it('defaults to custom category', () => {
      const steps = [
        { name: 'custom-step', status: 'pass' },
      ]
      const result = aggregateByCategory(steps)

      expect(result.custom).toBeDefined()
    })
  })

  describe('calculateExecutionStats', () => {
    it('returns zero stats for empty steps', () => {
      const result = calculateExecutionStats([])

      expect(result.steps_total).toBe(0)
      expect(result.steps_executed).toBe(0)
    })

    it('calculates stats correctly', () => {
      const steps = [
        { status: 'pass' },
        { status: 'pass' },
        { status: 'fail' },
        { status: 'warn' },
        { status: 'skip' },
      ]
      const result = calculateExecutionStats(steps)

      expect(result.steps_total).toBe(5)
      expect(result.steps_executed).toBe(4)
      expect(result.steps_skipped).toBe(1)
      expect(result.steps_passed).toBe(2)
      expect(result.steps_failed).toBe(1)
      expect(result.steps_warned).toBe(1)
    })
  })

  describe('countIssues', () => {
    it('returns zero counts for empty issues', () => {
      const result = countIssues([])

      expect(result.total).toBe(0)
      expect(result.blocking).toBe(0)
      expect(result.warnings).toBe(0)
    })

    it('counts issues by severity', () => {
      const issues = [
        { severity: 'error' },
        { severity: 'error' },
        { severity: 'warning' },
        { severity: 'warning' },
        { severity: 'warning' },
        { severity: 'info' },
      ]
      const result = countIssues(issues)

      expect(result.total).toBe(6)
      expect(result.blocking).toBe(2)
      expect(result.warnings).toBe(3)
    })
  })

  describe('extractComponents', () => {
    it('returns empty array for no components', () => {
      const steps = [
        { name: 'lint' },
        { name: 'test' },
      ]
      expect(extractComponents(steps)).toEqual([])
    })

    it('extracts unique components sorted', () => {
      const steps = [
        { name: 'app-lint', component: 'app' },
        { name: 'web-lint', component: 'website' },
        { name: 'app-test', component: 'app' },
        { name: 'cms-lint', component: 'cms' },
      ]
      expect(extractComponents(steps)).toEqual(['app', 'cms', 'website'])
    })
  })

  describe('createMinimalResult', () => {
    it('creates valid minimal result', () => {
      const result = createMinimalResult({ projectName: 'test-project', passed: true })

      expect(result.$schema).toBe('ci-result.v2.json')
      expect(result.version).toBe('1.0.0')
      expect(result.project.name).toBe('test-project')
      expect(result.summary.status).toBe('passing')
      expect(result.summary.exit_code).toBe(0)
      expect(result.summary.score).toBe(100)
    })

    it('creates failing result', () => {
      const result = createMinimalResult({ projectName: 'test', passed: false })

      expect(result.summary.status).toBe('failing')
      expect(result.summary.exit_code).toBe(1)
      expect(result.summary.score).toBe(0)
    })

    it('includes required fields', () => {
      const result = createMinimalResult({ projectName: 'test' })

      expect(result.meta.generated_at).toBeDefined()
      expect(result.meta.run_id).toBeDefined()
      expect(result.timing).toBeDefined()
      expect(result.execution).toBeDefined()
      expect(result.steps).toEqual([])
      expect(result.errors).toEqual([])
    })
  })

  describe('aggregateCoverage', () => {
    it('returns null for steps without coverage', () => {
      const steps = [
        { name: 'lint', status: 'pass' },
        { name: 'build', status: 'pass' },
      ]
      expect(aggregateCoverage(steps)).toBeNull()
    })

    it('aggregates coverage from single step', () => {
      const steps = [
        {
          name: 'test',
          status: 'pass',
          output: {
            passed: 100,
            failed: 0,
            coverage: { lines: 80, branches: 70, functions: 90 },
          },
        },
      ]
      const result = aggregateCoverage(steps)

      expect(result.lines).toBe(80)
      expect(result.branches).toBe(70)
      expect(result.functions).toBe(90)
    })

    it('calculates weighted average from multiple components', () => {
      const steps = [
        {
          name: 'app-test',
          component: 'app',
          status: 'pass',
          output: {
            passed: 100,
            failed: 0,
            coverage: { lines: 80 },
          },
        },
        {
          name: 'web-test',
          component: 'website',
          status: 'pass',
          output: {
            passed: 50,
            failed: 0,
            coverage: { lines: 50 },
          },
        },
      ]
      const result = aggregateCoverage(steps)

      // Weighted: (80*100 + 50*50) / 150 = 10500/150 = 70
      expect(result.lines).toBe(70)
      expect(result.by_component.app.lines).toBe(80)
      expect(result.by_component.website.lines).toBe(50)
    })
  })

  describe('compareCiResults', () => {
    it('detects improving trend', () => {
      const current = { summary: { score: 90, total_issues: 0, blocking: 0, status: 'passing' } }
      const baseline = { summary: { score: 80, total_issues: 2, blocking: 0, status: 'passing' } }

      const result = compareCiResults(current, baseline)

      expect(result.trend).toBe('improving')
      expect(result.score.diff).toBe(10)
    })

    it('detects degrading trend', () => {
      const current = { summary: { score: 70, total_issues: 5, blocking: 0, status: 'degraded' } }
      const baseline = { summary: { score: 90, total_issues: 0, blocking: 0, status: 'passing' } }

      const result = compareCiResults(current, baseline)

      expect(result.trend).toBe('degrading')
      expect(result.score.diff).toBe(-20)
    })

    it('detects stable trend', () => {
      const current = { summary: { score: 85, total_issues: 1, blocking: 0, status: 'passing' } }
      const baseline = { summary: { score: 82, total_issues: 1, blocking: 0, status: 'passing' } }

      const result = compareCiResults(current, baseline)

      expect(result.trend).toBe('stable')
    })

    it('compares coverage when available', () => {
      const current = {
        summary: { score: 85, total_issues: 0, blocking: 0, status: 'passing' },
        checks: { test: { coverage: { lines: 80, branches: 70, functions: 90 } } },
      }
      const baseline = {
        summary: { score: 85, total_issues: 0, blocking: 0, status: 'passing' },
        checks: { test: { coverage: { lines: 75, branches: 65, functions: 85 } } },
      }

      const result = compareCiResults(current, baseline)

      expect(result.coverage.lines).toBe(5)
      expect(result.coverage.branches).toBe(5)
      expect(result.coverage.functions).toBe(5)
    })

    it('returns null coverage when not available', () => {
      const current = { summary: { score: 85, total_issues: 0, blocking: 0, status: 'passing' } }
      const baseline = { summary: { score: 85, total_issues: 0, blocking: 0, status: 'passing' } }

      const result = compareCiResults(current, baseline)

      expect(result.coverage).toBeNull()
    })
  })
})
