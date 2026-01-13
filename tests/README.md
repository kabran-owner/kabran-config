# Tests

This directory contains tests for kabran-config using a hybrid testing approach.

## Test Frameworks

| Framework | Location | Purpose |
|-----------|----------|---------|
| **BATS** | `tests/shell/` | Shell script tests (CI/Deploy runners) |
| **Vitest** | `tests/node/` | Node.js module tests (.mjs scripts) |

## Running Tests

```bash
# Run all tests
npm test

# Run only shell tests (BATS)
npm run test:shell

# Run only Node.js tests (Vitest)
npm run test:node

# Run Vitest in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Structure

```
tests/
├── shell/                    # BATS tests for shell scripts
│   ├── ci-core.bats         # CI core functions
│   ├── ci-runner.bats       # CI runner integration
│   ├── deploy-core.bats     # Deploy core functions
│   └── deploy-runner.bats   # Deploy runner integration
│
├── node/                     # Vitest tests for Node.js modules
│   ├── readme-validator.test.mjs
│   ├── license-check.test.mjs
│   ├── env-validator.test.mjs
│   └── dependency-report.test.mjs
│
├── fixtures/                 # Test fixtures
│   ├── mock-simple/         # Simple project fixture
│   ├── mock-monorepo/       # Monorepo fixture
│   ├── mock-deploy/         # Deploy configuration fixture
│   ├── mock-readme/         # README validation fixtures
│   ├── mock-env/            # Env validation fixtures
│   └── mock-licenses/       # License check fixtures
│
└── helpers/
    └── bats-helpers.sh      # Shared BATS assertions
```

## Writing Tests

### BATS Tests (Shell)

```bash
#!/usr/bin/env bats

load '../helpers/bats-helpers.sh'

setup() {
  # Setup runs before each test
}

@test "description of test" {
  run some_function "arg"
  assert_success
  assert_output --partial "expected output"
}
```

### Vitest Tests (Node.js)

```javascript
import {describe, it, expect} from 'vitest';
import {myFunction} from '../../src/scripts/my-module.mjs';

describe('my-module', () => {
  it('does something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

## Coverage

Node.js modules are covered by Vitest. Run coverage with:

```bash
npm run test:coverage
```

Coverage excludes:

- `src/scripts/ci/` - Shell scripts (tested via BATS)
- `src/scripts/deploy/` - Shell scripts (tested via BATS)

## CI Integration

Tests run in CI using:

```bash
npm run test:ci
```

This runs BATS with TAP output and Vitest with JUnit reporter.
