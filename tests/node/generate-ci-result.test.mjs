import { describe, it, expect } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateCiResult, runValidators } from '../../src/scripts/generate-ci-result.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesPath = join(__dirname, '../fixtures')

describe('generate-ci-result', () => {
  describe('generateCiResult', () => {
    it('generates valid result from empty input', () => {
      const result = generateCiResult({})

      expect(result.$schema).toBe('ci-result.v2.json')
      expect(result.version).toBe('1.0.0')
      expect(result.meta.generated_at).toBeDefined()
      expect(result.meta.generator).toContain('kabran-config')
      expect(result.summary.status).toBe('passing')
      expect(result.summary.score).toBe(100)
    })

    it('calculates score and status from steps', () => {
      const input = {
        steps: [
          { name: 'lint', status: 'pass', exit_code: 0, duration_ms: 1000, category: 'lint' },
          { name: 'test', status: 'fail', exit_code: 1, duration_ms: 2000, category: 'test' },
        ],
        errors: ['test: some error'],
      }

      const result = generateCiResult(input)

      expect(result.summary.status).toBe('passing') // score 80 >= 80, blocking 0
      expect(result.summary.score).toBe(80) // 100 - 20 (failed check)
      expect(result.summary.exit_code).toBe(1)
      expect(result.execution.steps_passed).toBe(1)
      expect(result.execution.steps_failed).toBe(1)
    })

    it('aggregates checks by category', () => {
      const input = {
        steps: [
          { name: 'app-lint', status: 'pass', exit_code: 0, duration_ms: 1000, category: 'lint', component: 'app', output: { errors: 0, warnings: 5 } },
          { name: 'web-lint', status: 'pass', exit_code: 0, duration_ms: 1000, category: 'lint', component: 'website', output: { errors: 0, warnings: 3 } },
        ],
      }

      const result = generateCiResult(input)

      expect(result.checks.lint).toBeDefined()
      expect(result.checks.lint.warnings).toBe(8)
      expect(result.checks.lint.by_component.app.warnings).toBe(5)
      expect(result.checks.lint.by_component.website.warnings).toBe(3)
    })

    it('detects monorepo from components', () => {
      const input = {
        steps: [
          { name: 'app-lint', component: 'app', status: 'pass', exit_code: 0, duration_ms: 1000 },
          { name: 'web-lint', component: 'website', status: 'pass', exit_code: 0, duration_ms: 1000 },
        ],
      }

      const result = generateCiResult(input)

      expect(result.project.type).toBe('monorepo')
      expect(result.project.components).toContain('app')
      expect(result.project.components).toContain('website')
    })

    it('detects single project when no components', () => {
      const input = {
        steps: [
          { name: 'lint', status: 'pass', exit_code: 0, duration_ms: 1000 },
        ],
      }

      const result = generateCiResult(input)

      expect(result.project.type).toBe('single')
      expect(result.project.components).toEqual([])
    })

    it('includes timing information', () => {
      const input = {
        timing: {
          total_ms: 180000,
          started_at: '2026-01-13T12:00:00Z',
          finished_at: '2026-01-13T12:03:00Z',
        },
      }

      const result = generateCiResult(input)

      expect(result.timing.total_ms).toBe(180000)
      expect(result.timing.total_human).toBe('3m 00s')
      expect(result.timing.started_at).toBe('2026-01-13T12:00:00Z')
    })

    it('counts issues correctly', () => {
      const input = {
        issues: [
          { id: '1', severity: 'error', message: 'blocking' },
          { id: '2', severity: 'warning', message: 'warn1' },
          { id: '3', severity: 'warning', message: 'warn2' },
          { id: '4', severity: 'info', message: 'info' },
        ],
      }

      const result = generateCiResult(input)

      expect(result.summary.total_issues).toBe(4)
      expect(result.summary.blocking).toBe(1)
      expect(result.summary.warnings).toBe(2)
    })

    it('calculates score with issues', () => {
      const input = {
        issues: [
          { id: '1', severity: 'error', message: 'blocking' },  // -10
          { id: '2', severity: 'warning', message: 'warn' },    // -1
        ],
      }

      const result = generateCiResult(input)

      expect(result.summary.score).toBe(89) // 100 - 10 - 1
    })

    it('sets failing status with blocking issues', () => {
      const input = {
        issues: [
          { id: '1', severity: 'error', message: 'blocking' },
        ],
      }

      const result = generateCiResult(input)

      expect(result.summary.status).toBe('failing') // blocking > 0 -> always failing
    })

    it('includes project info when provided', () => {
      const input = {
        project: {
          name: 'my-project',
          version: '1.2.3',
        },
      }

      const result = generateCiResult(input)

      expect(result.project.name).toBe('my-project')
      expect(result.project.version).toBe('1.2.3')
    })

    it('includes errors array', () => {
      const input = {
        errors: ['lint: failed', 'test: timeout'],
      }

      const result = generateCiResult(input)

      expect(result.errors).toEqual(['lint: failed', 'test: timeout'])
    })

    it('includes extensions from metadata', () => {
      const input = {
        metadata: {
          scope: 'app',
          extensions: {
            custom: { foo: 'bar' },
          },
        },
      }

      const result = generateCiResult(input)

      expect(result.execution.scope).toBe('app')
      expect(result.extensions.custom.foo).toBe('bar')
    })

    it('preserves step details', () => {
      const input = {
        steps: [
          {
            name: 'lint',
            status: 'warn',
            exit_code: 0,
            duration_ms: 3420,
            duration_human: '3.4s',
            category: 'lint',
            output: { errors: 0, warnings: 8, fixable: 3 },
          },
        ],
      }

      const result = generateCiResult(input)

      expect(result.steps[0].name).toBe('lint')
      expect(result.steps[0].duration_ms).toBe(3420)
      expect(result.steps[0].output.warnings).toBe(8)
    })

    it('merges validators into checks', () => {
      const input = {
        steps: [
          { name: 'lint', status: 'pass', exit_code: 0, duration_ms: 1000, category: 'lint' },
        ],
        validators: {
          readme: { status: 'pass', found: true, missing_required: [], missing_recommended: [] },
          env: { status: 'warn', env_tracked: false, example_exists: true, undocumented: ['API_KEY'] },
        },
      }

      const result = generateCiResult(input)

      expect(result.checks.lint).toBeDefined()
      expect(result.checks.readme).toBeDefined()
      expect(result.checks.env).toBeDefined()
      expect(result.checks.readme.status).toBe('pass')
      expect(result.checks.env.status).toBe('warn')
    })
  })

  describe('runValidators', () => {
    it('runs all validators by default', async () => {
      const results = await runValidators(join(fixturesPath, 'mock-simple'), {
        skipLicense: true, // Skip license to avoid npx dependency
      })

      expect(results).toHaveProperty('readme')
      expect(results).toHaveProperty('env')
      expect(results).toHaveProperty('quality_standard')
    })

    it('skips validators when options are set', async () => {
      const results = await runValidators(join(fixturesPath, 'mock-simple'), {
        skipLicense: true,
        skipReadme: true,
        skipEnv: true,
        skipQualityStandard: true,
      })

      expect(results).toEqual({})
    })

    it('returns correct structure for readme check', async () => {
      const results = await runValidators(join(fixturesPath, 'mock-readme/valid'), {
        skipLicense: true,
        skipEnv: true,
        skipQualityStandard: true,
      })

      expect(results.readme).toHaveProperty('status')
      expect(results.readme).toHaveProperty('found')
      expect(results.readme).toHaveProperty('missing_required')
      expect(results.readme).toHaveProperty('missing_recommended')
    })

    it('returns correct structure for env check', async () => {
      const results = await runValidators(join(fixturesPath, 'mock-env/with-example'), {
        skipLicense: true,
        skipReadme: true,
        skipQualityStandard: true,
      })

      expect(results.env).toHaveProperty('status')
      expect(results.env).toHaveProperty('env_tracked')
      expect(results.env).toHaveProperty('example_exists')
      expect(results.env).toHaveProperty('undocumented')
    })

    it('returns correct structure for quality_standard check', async () => {
      const results = await runValidators(join(fixturesPath, 'mock-quality-standard/valid'), {
        skipLicense: true,
        skipReadme: true,
        skipEnv: true,
      })

      expect(results.quality_standard).toHaveProperty('status')
      expect(results.quality_standard).toHaveProperty('file_exists')
      expect(results.quality_standard).toHaveProperty('undocumented_overrides')
      expect(results.quality_standard).toHaveProperty('orphaned_overrides')
    })
  })
})
