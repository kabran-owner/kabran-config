# @kabran-owner/kabran-config

Shared quality configurations for Kabran projects. One package to standardize ESLint, Prettier, TypeScript, Commitlint, and lint-staged across all repositories.

> **AI-Native Design:** These configs are optimized for AI agent development workflows.

## Installation

```bash
npm install -D @kabran-owner/kabran-config
```

### Peer Dependencies

Install the required peer dependencies based on what you need:

**For all projects (minimum):**

```bash
npm install --save-dev \
  eslint@^9 \
  @eslint/js@^9 \
  typescript-eslint@^8 \
  eslint-config-prettier@^10 \
  eslint-plugin-import@^2 \
  prettier@^3 \
  typescript@^5 \
  @commitlint/cli@^19 \
  @commitlint/config-conventional@^19 \
  husky@^9 \
  lint-staged@^16
```

**For React projects (additional):**

```bash
npm install --save-dev \
  eslint-plugin-react-hooks@^5 \
  eslint-plugin-react-refresh@^0.4 \
  eslint-plugin-jsx-a11y@^6 \
  prettier-plugin-tailwindcss@^0.5
```

**For JSDoc enforcement (optional):**

```bash
npm install --save-dev eslint-plugin-jsdoc@^50
```

---

## Usage

### ESLint

Choose the configuration that matches your project:

**Base (TypeScript only):**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-owner/kabran-config/eslint';

export default [...kabranConfig];
```

**Node.js:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-owner/kabran-config/eslint/node';

export default [...kabranConfig];
```

**React:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-owner/kabran-config/eslint/react';

export default [...kabranConfig];
```

**With customizations:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-owner/kabran-config/eslint/react';

export default [
  ...kabranConfig,
  {
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
```

---

### JSDoc (Optional)

The configs include optional JSDoc enforcement for documenting complex functions. Install `eslint-plugin-jsdoc` to enable:

```bash
npm install --save-dev eslint-plugin-jsdoc@^50
```

**What gets enforced:**

- ✅ Exported functions and classes
- ✅ Public methods
- ✅ Interfaces and type aliases
- ❌ Arrow functions (usually simple)
- ❌ Private functions

**Severity:** `warn` (non-blocking) - meant as guidance, not hard requirement

**Customize per project:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-owner/kabran-config/eslint';

export default [
  ...kabranConfig,
  {
    rules: {
      // Disable JSDoc warnings
      'jsdoc/require-jsdoc': 'off',

      // Or make it stricter (error instead of warn)
      'jsdoc/require-jsdoc': 'error',

      // Or require JSDoc for arrow functions too
      'jsdoc/require-jsdoc': ['warn', {
        require: {
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
      }],
    },
  },
];
```

**Note:** If `eslint-plugin-jsdoc` is not installed, JSDoc rules are automatically skipped (no errors).

---

### Prettier

```javascript
// prettier.config.mjs
export { default } from '@kabran-owner/kabran-config/prettier';
```

**With customizations:**

```javascript
// prettier.config.mjs
import config from '@kabran-owner/kabran-config/prettier';

export default {
  ...config,
  printWidth: 120,
};
```

---

### TypeScript

**Node.js project:**

```json
// tsconfig.json
{
  "extends": "@kabran-owner/kabran-config/tsconfig/node",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**React project (Vite):**

```json
// tsconfig.json
{
  "extends": "@kabran-owner/kabran-config/tsconfig/react",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

### Commitlint

```javascript
// commitlint.config.mjs
export { default } from '@kabran-owner/kabran-config/commitlint';
```

**With custom scopes:**

```javascript
// commitlint.config.mjs
import config from '@kabran-owner/kabran-config/commitlint';

export default {
  ...config,
  rules: {
    ...config.rules,
    'scope-enum': [2, 'always', ['api', 'web', 'docs', 'ci']],
  },
};
```

---

### Lint-Staged

Add to your `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,scss,yaml,yml}": ["prettier --write"],
    "*.py": ["black"]
  }
}
```

Or use the config file:

```javascript
// lint-staged.config.mjs
export { default } from '@kabran-owner/kabran-config/lint-staged';
```

---

### Husky Setup

```bash
# Initialize Husky
npx husky init

# Add pre-commit hook
echo "npx lint-staged" > .husky/pre-commit

# Add commit-msg hook
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg

# Add pre-push hook (optional)
echo "npm run type-check && npm test" > .husky/pre-push
```

---

## Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "license:check": "node node_modules/@kabran-owner/kabran-config/src/scripts/license-check.mjs",
    "deps:report": "node node_modules/@kabran-owner/kabran-config/src/scripts/dependency-report.mjs",
    "deps:check": "node node_modules/@kabran-owner/kabran-config/src/scripts/dependency-report.mjs --strict",
    "readme:validate": "node node_modules/@kabran-owner/kabran-config/src/scripts/readme-validator.mjs",
    "env:validate": "node node_modules/@kabran-owner/kabran-config/src/scripts/env-validator.mjs",
    "prepare": "husky"
  }
}
```

---

## Quick Setup (Copy-Paste)

### New React Project

```bash
# Install dependencies
npm install --save-dev @kabran-owner/kabran-config \
  eslint@^9 @eslint/js@^9 typescript-eslint@^8 \
  eslint-config-prettier@^10 eslint-plugin-import@^2 \
  eslint-plugin-react-hooks@^5 eslint-plugin-react-refresh@^0.4 \
  eslint-plugin-jsx-a11y@^6 \
  prettier@^3 prettier-plugin-tailwindcss@^0.5 \
  typescript@^5 \
  @commitlint/cli@^19 @commitlint/config-conventional@^19 \
  husky@^9 lint-staged@^16

# Optional: Add JSDoc enforcement
npm install --save-dev eslint-plugin-jsdoc@^50

# Create config files
echo "import config from '@kabran-owner/kabran-config/eslint/react';\nexport default [...config];" > eslint.config.mjs
echo "export { default } from '@kabran-owner/kabran-config/prettier';" > prettier.config.mjs
echo "export { default } from '@kabran-owner/kabran-config/commitlint';" > commitlint.config.mjs

# Setup Husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### New Node.js Project

```bash
# Install dependencies
npm install --save-dev @kabran-owner/kabran-config \
  eslint@^9 @eslint/js@^9 typescript-eslint@^8 \
  eslint-config-prettier@^10 eslint-plugin-import@^2 \
  prettier@^3 typescript@^5 \
  @commitlint/cli@^19 @commitlint/config-conventional@^19 \
  husky@^9 lint-staged@^16

# Optional: Add JSDoc enforcement
npm install --save-dev eslint-plugin-jsdoc@^50

# Create config files
echo "import config from '@kabran-owner/kabran-config/eslint/node';\nexport default [...config];" > eslint.config.mjs
echo "export { default } from '@kabran-owner/kabran-config/prettier';" > prettier.config.mjs
echo "export { default } from '@kabran-owner/kabran-config/commitlint';" > commitlint.config.mjs

# Setup Husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

---

## Enforcement Scripts

The package includes compliance and security scripts:

### License Check

Scans dependencies for prohibited licenses (GPL, AGPL) to ensure legal compliance.

```bash
# Run directly
node node_modules/@kabran-owner/kabran-config/src/scripts/license-check.mjs

# Or add to package.json
{
  "scripts": {
    "license:check": "node node_modules/@kabran-owner/kabran-config/src/scripts/license-check.mjs"
  }
}
```

**Usage in CI/CD:**

```yaml
# .github/workflows/quality.yml
- name: License Check
  run: npm run license:check
```

**Usage in Husky:**

```bash
# .husky/pre-push
npm run license:check
```

**Blocked licenses:** GPL, AGPL, LGPL, EUPL (viral copyleft)
**Exit code:** 1 if prohibited licenses found, 0 otherwise

---

### Dependency Report

Generates a report of outdated dependencies. Supports both informational and strict modes.

```bash
# Run directly
node node_modules/@kabran-owner/kabran-config/src/scripts/dependency-report.mjs

# Or add to package.json
{
  "scripts": {
    "deps:report": "node node_modules/@kabran-owner/kabran-config/src/scripts/dependency-report.mjs",
    "deps:check": "node node_modules/@kabran-owner/kabran-config/src/scripts/dependency-report.mjs --strict"
  }
}
```

**Modes:**

```bash
# Informational mode (default) - always exits 0
npm run deps:report

# Strict mode - fails if packages > 2 years old
npm run deps:check

# JSON output
npm run deps:report -- --json
```

**Usage in CI/CD:**

```yaml
# .github/workflows/quality.yml
- name: Dependency Age Check
  run: npm run deps:check  # Blocks if critical
```

**Blocked criteria (strict mode):**

- Packages > 2 years outdated (based on current version publish date)
- Exit code: 1 if blocked, 0 otherwise

**Note:** Informational mode is useful for reports. Use Renovate/Dependabot for automated updates.

---

### README Validator

Validates that README.md exists and contains required sections for proper documentation.

```bash
# Run directly
node node_modules/@kabran-owner/kabran-config/src/scripts/readme-validator.mjs

# Or add to package.json
{
  "scripts": {
    "readme:validate": "node node_modules/@kabran-owner/kabran-config/src/scripts/readme-validator.mjs"
  }
}
```

**Required sections (blocking if missing):**

- `# Project Title` (h1 heading)
- `## Installation`
- `## Usage`
- `## License`

**Recommended sections (warnings only):**

- `## Development`
- `## Contributing`
- `## Testing`

**Usage in CI/CD:**

```yaml
# .github/workflows/quality.yml
- name: README Validation
  run: npm run readme:validate
```

**Exit code:** 1 if required sections missing, 0 otherwise (warnings allowed)

---

### Environment Variables Validator

Validates .env.example exists (if project uses env vars) and ensures .env is not committed to git.

```bash
# Run directly
node node_modules/@kabran-owner/kabran-config/src/scripts/env-validator.mjs

# Or add to package.json
{
  "scripts": {
    "env:validate": "node node_modules/@kabran-owner/kabran-config/src/scripts/env-validator.mjs"
  }
}
```

**What it checks:**

1. **CRITICAL:** `.env` file is not tracked in git (security risk)
2. Detects if project uses env vars (searches for `process.env`, `os.getenv`, `import.meta.env`)
3. If env vars detected, validates `.env.example` exists
4. Warns if vars in `.env.example` lack comments/documentation

**Usage in Husky:**

```bash
# .husky/pre-push
npm run env:validate
```

**Usage in CI/CD:**

```yaml
# .github/workflows/security.yml
- name: Environment Variables Check
  run: npm run env:validate
```

**Exit codes:**

- 1 (blocking) if `.env` is committed to git
- 1 (blocking) if project uses env vars but `.env.example` missing
- 0 + warnings if vars lack documentation

---

## CI/CD Scripts

The package provides standardized CI/CD tooling for consistent build and deployment across all Kabran projects.

### Quick Start

```bash
# Install kabran-config
npm install -D @kabran-owner/kabran-config

# Create CI configuration
cat > scripts/ci-config.sh << 'EOF'
#!/usr/bin/env bash
PROJECT_NAME="my-project"
PM="npm"

ci_steps() {
  run_step "lint" "cd '$PROJECT_ROOT' && $PM run lint" || FAILED=1
  run_step "test" "cd '$PROJECT_ROOT' && $PM test" || FAILED=1
  run_step "build" "cd '$PROJECT_ROOT' && $PM run build" || FAILED=2
  return $FAILED
}
EOF

# Create CI wrapper
cat > scripts/ci.sh << 'EOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/node_modules/@kabran-owner/kabran-config/src/scripts/ci/ci-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export CI_CONFIG_FILE="$SCRIPT_DIR/ci-config.sh"
exec bash "$RUNNER" "$@"
EOF

chmod +x scripts/*.sh

# Run CI
npm run ci
```

### API Reference

#### Core Functions (ci-core.sh)

**Logging:**

- `log_info "message"` - Blue info message
- `log_success "message"` - Green success message
- `log_error "message"` - Red error message
- `log_warn "message"` - Yellow warning message
- `log_section "message"` - Section header

**Execution:**

- `run_step "name" "command" [results_file]` - Execute CI step with error handling
- `verify_test_results "file"` - Validate test results JSON (fallback for OOM)

**Output:**

- `generate_ci_json "$file" "$passed" "$code" "$project" "$metadata"` - Generate JSON output

#### Configuration API (ci-config.sh)

**Required Variables:**

- `PROJECT_NAME` - Project identifier
- `PM` - Package manager (npm, pnpm, yarn)

**Required Functions:**

- `ci_steps()` - Define pipeline steps, return exit code

**Optional Functions:**

- `ci_metadata()` - Return JSON metadata for output

**Optional Variables:**

- `CI_CORE_MIN_VERSION` - Minimum core version required

### Configuration Examples

**Simple Project:**

```bash
#!/usr/bin/env bash
PROJECT_NAME="my-app"
PM="npm"

ci_steps() {
  run_step "lint" "cd '$PROJECT_ROOT' && $PM run lint" || FAILED=1
  run_step "test" "cd '$PROJECT_ROOT' && $PM test" || FAILED=1
  run_step "build" "cd '$PROJECT_ROOT' && $PM run build" || FAILED=2
  return $FAILED
}
```

**Monorepo (Multi-component):**

```bash
#!/usr/bin/env bash
PROJECT_NAME="my-monorepo"
PM="pnpm"

ci_steps() {
  # Frontend
  log_section "FRONTEND CI"
  run_step "frontend-lint" "cd '$PROJECT_ROOT/apps/web' && $PM lint" || FAILED=1
  run_step "frontend-test" "cd '$PROJECT_ROOT/apps/web' && $PM test" || FAILED=1
  run_step "frontend-build" "cd '$PROJECT_ROOT/apps/web' && $PM build" || FAILED=2

  # Backend
  log_section "BACKEND CI"
  run_step "api-lint" "cd '$PROJECT_ROOT/apps/api' && $PM lint" || FAILED=1
  run_step "api-test" "cd '$PROJECT_ROOT/apps/api' && $PM test" || FAILED=1
  run_step "api-build" "cd '$PROJECT_ROOT/apps/api' && $PM build" || FAILED=2

  return $FAILED
}
```

### Deploy Scripts

Create `scripts/deploy.json`:

```json
{
  "project": "my-project",
  "version": "1.0.0",
  "stacks": [
    {
      "name": "api",
      "type": "backend",
      "path": "../apps/api/docker",
      "script": "api-deploy.sh",
      "condition": {
        "type": "path_changed",
        "paths": ["apps/api/", "packages/"]
      }
    }
  ],
  "settings": {
    "timeout_seconds": 300,
    "skip_unchanged": true
  }
}
```

Create `scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/node_modules/@kabran-owner/kabran-config/src/scripts/deploy/deploy-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export SCRIPT_DIR="$SCRIPT_DIR"
export DEPLOY_CONFIG_FILE="$SCRIPT_DIR/deploy.json"

exec bash "$RUNNER" "$@"
```

### Troubleshooting

**"ci-core.sh not found"**

- Ensure `@kabran-owner/kabran-config` is installed
- Check path in wrapper script

**"ci_steps() function not defined"**

- Ensure `ci-config.sh` defines `ci_steps()` function
- Check `CI_CONFIG_FILE` points to correct file

**"Package manager 'pnpm' not found"**

- Install package manager: `npm install -g pnpm`
- Or change `PM="npm"` in ci-config.sh

### Migration Guide

For detailed migration instructions from existing CI/CD scripts, see [CI-CD-MIGRATION.md](./CI-CD-MIGRATION.md).

---

## What's Included

| Config | Description |
|--------|-------------|
| `@kabran-owner/kabran-config/eslint` | Base ESLint for TypeScript (includes optional JSDoc) |
| `@kabran-owner/kabran-config/eslint/node` | ESLint for Node.js (allows console, includes optional JSDoc) |
| `@kabran-owner/kabran-config/eslint/react` | ESLint for React (hooks, a11y, refresh, includes optional JSDoc) |
| `@kabran-owner/kabran-config/prettier` | Prettier with Tailwind plugin |
| `@kabran-owner/kabran-config/tsconfig/base` | Base TypeScript (strict mode) |
| `@kabran-owner/kabran-config/tsconfig/node` | TypeScript for Node.js |
| `@kabran-owner/kabran-config/tsconfig/react` | TypeScript for React/Vite |
| `@kabran-owner/kabran-config/commitlint` | Conventional commits |
| `@kabran-owner/kabran-config/lint-staged` | Pre-commit lint + format |
| `@kabran-owner/kabran-config/scripts/license-check` | License compliance validator (blocking) |
| `@kabran-owner/kabran-config/scripts/dependency-report` | Outdated dependencies report (non-blocking/strict modes) |
| `@kabran-owner/kabran-config/scripts/readme-validator` | README.md structure validator (blocking) |
| `@kabran-owner/kabran-config/scripts/env-validator` | Environment variables validator (blocking) |
| `@kabran-owner/kabran-config/scripts/ci/*` | Standardized CI pipeline runner and core functions |
| `@kabran-owner/kabran-config/scripts/deploy/*` | Standardized deployment orchestration |

---

## AI-Native Design Decisions

These configurations are optimized for AI agent development workflows. Key decisions:

| Decision | Value | Rationale |
|----------|-------|-----------|
| `printWidth` | 120 | Balance between token density (AI) and readability (human review) |
| `bracketSpacing` | false | AI-First: saves 2 tokens per object at scale |
| `trailingComma` | all | Cleaner diffs, fewer syntax errors when AI edits lists |
| `import/order` | off | Auto-fix via Prettier; agents shouldn't reason about import order |
| `no-unused-vars` | off (ESLint) | Prevents "Refactor Loop Syndrome" where agents delete/re-add imports |
| `noUnusedLocals` | true (tsconfig) | Catch unused vars at build time, not during development |
| Security rules | error | Block any code injection (no-eval, no-implied-eval, no-new-func) |
| `no-explicit-any` | error | Force explicit types to reduce AI hallucinations |

**Reference:** These decisions are based on Kabran's AI-Native development research.

---

## Development & Publishing

### Publishing to npm

```bash
# Login (once)
npm login

# Bump version and publish
npm version patch && npm publish
npm version minor && npm publish
npm version major && npm publish
```

### After publishing

```bash
git push && git push --tags
```

---

## License

MIT
