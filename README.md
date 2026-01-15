# @kabran-tecnologia/kabran-config

Shared quality configurations for Kabran projects. One package to standardize ESLint, Prettier, TypeScript, Commitlint, and lint-staged across all repositories.

> **AI-Native Design:** These configs are optimized for AI agent development workflows.

## Installation

```bash
npm install -D @kabran-tecnologia/kabran-config
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

## Project Templates (Recommended)

The fastest way to set up a new project with Kabran quality standards.

### Quick Start

```bash
# Install kabran-config
npm install -D @kabran-tecnologia/kabran-config

# Run setup CLI
npx kabran-setup              # Default: Node.js project
npx kabran-setup --type=react # React project
npx kabran-setup --type=base  # Base TypeScript
```

This will create:

- GitHub workflows (`ci.yml`, `commitlint.yml`, `validate-pr-source.yml`)
- Husky hooks (`pre-commit`, `commit-msg`, `pre-push`)
- Config files (`eslint.config.mjs`, `prettier.config.mjs`, `commitlint.config.mjs`, `lint-staged.config.mjs`)
- Quality standard (`docs/quality/001-quality-standard.md`)

### CLI Options

```bash
npx kabran-setup [options]

Options:
  --type=<type>           Project type: node, react, base (default: node)
  --skip-husky            Don't copy husky hooks
  --skip-workflows        Don't copy GitHub workflow files
  --skip-quality-standard Don't create quality-standard.md
  --sync-workflows        Overwrite existing workflow files
  --sync-husky            Overwrite existing husky hooks
  --force                 Overwrite all existing files
  --dry-run               Preview changes without modifying files
  --help                  Show help message
```

### Update Strategy

| Type | Behavior | How to Update |
|------|----------|---------------|
| **Config files** | Re-export from kabran-config | Automatic via `npm update` |
| **Workflows** | Copied once | Manual via `npx kabran-setup --sync-workflows` |
| **Husky hooks** | Copied once | Manual via `npx kabran-setup --sync-husky` |
| **Quality standard** | Created once with placeholders | Manual (project-specific) |

**Why this strategy?**

- **Configs:** Should always be in sync with Kabran standards. Re-export pattern ensures automatic updates.
- **Workflows/Husky:** May need project-specific customization (secrets, extra steps). Copy allows local control.
- **Quality standard:** Contains project-specific override documentation. Should be maintained manually.

### Post-Setup Checklist

After running `kabran-setup`:

1. Install peer dependencies (see Installation section above)
2. Initialize husky: `npx husky init`
3. Add scripts to `package.json`:

   ```json
   {
     "scripts": {
       "lint": "eslint .",
       "lint:fix": "eslint . --fix",
       "type-check": "tsc --noEmit",
       "prepare": "husky"
     }
   }
   ```

4. Commit your changes

### Examples

```bash
# Setup new Node.js API project
npx kabran-setup --type=node

# Setup new React frontend
npx kabran-setup --type=react

# Update only workflows (after kabran-config update)
npx kabran-setup --sync-workflows

# Update only husky hooks
npx kabran-setup --sync-husky

# Preview what would be created
npx kabran-setup --dry-run

# Force overwrite all files
npx kabran-setup --force
```

---

## Usage

### ESLint

Choose the configuration that matches your project:

**Base (TypeScript only):**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-tecnologia/kabran-config/eslint';

export default [...kabranConfig];
```

**Node.js:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/node';

export default [...kabranConfig];
```

**React:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/react';

export default [...kabranConfig];
```

**With customizations:**

```javascript
// eslint.config.mjs
import kabranConfig from '@kabran-tecnologia/kabran-config/eslint/react';

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
import kabranConfig from '@kabran-tecnologia/kabran-config/eslint';

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
export { default } from '@kabran-tecnologia/kabran-config/prettier';
```

**With customizations:**

```javascript
// prettier.config.mjs
import config from '@kabran-tecnologia/kabran-config/prettier';

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
  "extends": "@kabran-tecnologia/kabran-config/tsconfig/node",
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
  "extends": "@kabran-tecnologia/kabran-config/tsconfig/react",
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
export { default } from '@kabran-tecnologia/kabran-config/commitlint';
```

**With custom scopes:**

```javascript
// commitlint.config.mjs
import config from '@kabran-tecnologia/kabran-config/commitlint';

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
export { default } from '@kabran-tecnologia/kabran-config/lint-staged';
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

# Add pre-push hook (optional - kept lightweight by design)
# Full validation runs in CI. Uncomment type-check if desired:
# echo "npm run type-check" > .husky/pre-push
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
    "license:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/license-check.mjs",
    "deps:report": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs",
    "deps:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs --strict",
    "readme:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/readme-validator.mjs",
    "env:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/env-validator.mjs",
    "quality:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs",
    "prepare": "husky"
  }
}
```

---

## Quick Setup (Copy-Paste)

### New React Project

```bash
# Install dependencies
npm install --save-dev @kabran-tecnologia/kabran-config \
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
echo "import config from '@kabran-tecnologia/kabran-config/eslint/react';\nexport default [...config];" > eslint.config.mjs
echo "export { default } from '@kabran-tecnologia/kabran-config/prettier';" > prettier.config.mjs
echo "export { default } from '@kabran-tecnologia/kabran-config/commitlint';" > commitlint.config.mjs

# Setup Husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### New Node.js Project

```bash
# Install dependencies
npm install --save-dev @kabran-tecnologia/kabran-config \
  eslint@^9 @eslint/js@^9 typescript-eslint@^8 \
  eslint-config-prettier@^10 eslint-plugin-import@^2 \
  prettier@^3 typescript@^5 \
  @commitlint/cli@^19 @commitlint/config-conventional@^19 \
  husky@^9 lint-staged@^16

# Optional: Add JSDoc enforcement
npm install --save-dev eslint-plugin-jsdoc@^50

# Create config files
echo "import config from '@kabran-tecnologia/kabran-config/eslint/node';\nexport default [...config];" > eslint.config.mjs
echo "export { default } from '@kabran-tecnologia/kabran-config/prettier';" > prettier.config.mjs
echo "export { default } from '@kabran-tecnologia/kabran-config/commitlint';" > commitlint.config.mjs

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
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/license-check.mjs

# Or add to package.json
{
  "scripts": {
    "license:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/license-check.mjs"
  }
}
```

**Usage in CI (recommended):**

```yaml
# .github/workflows/ci.yml
- name: License Check
  run: npm run license:check
```

**Blocked licenses:** GPL, AGPL, LGPL, EUPL (viral copyleft)
**Exit code:** 1 if prohibited licenses found, 0 otherwise

---

### Dependency Report

Generates a report of outdated dependencies. Supports both informational and strict modes.

```bash
# Run directly
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs

# Or add to package.json
{
  "scripts": {
    "deps:report": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs",
    "deps:check": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/dependency-report.mjs --strict"
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
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/readme-validator.mjs

# Or add to package.json
{
  "scripts": {
    "readme:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/readme-validator.mjs"
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
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/env-validator.mjs

# Or add to package.json
{
  "scripts": {
    "env:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/env-validator.mjs"
  }
}
```

**What it checks:**

1. **CRITICAL:** `.env` file is not tracked in git (security risk)
2. Detects if project uses env vars (searches for `process.env`, `os.getenv`, `import.meta.env`)
3. If env vars detected, validates `.env.example` exists
4. Warns if vars in `.env.example` lack comments/documentation

**Usage in CI (recommended):**

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

### Quality Standard Validator

Validates that projects have a `docs/quality/001-quality-standard.md` file documenting the quality configuration and any overrides.

```bash
# Run directly
node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs

# Or add to package.json
{
  "scripts": {
    "quality:validate": "node node_modules/@kabran-tecnologia/kabran-config/src/scripts/quality-standard-validator.mjs"
  }
}
```

**What it validates:**

1. File exists at `docs/quality/001-quality-standard.md`
2. Valid frontmatter (title, type, status)
3. Required sections present:
   - `## Configuracao Base`
   - `## Overrides Aplicados`
4. Override consistency (code vs documentation)

**Override Tracking:**

Any ESLint rule customizations should be documented in the quality-standard.md file:

```markdown
### OVR-001: no-console

| Campo | Valor |
|-------|-------|
| **Regra** | `no-console` |
| **Severidade Original** | error |
| **Severidade Aplicada** | off |
| **Arquivo** | `eslint.config.mjs` |

**Motivo:**
Este projeto e uma CLI que usa console.log para output ao usuario.

**Tracking:**
- Issue: N/A (decisao arquitetural)
- Aprovado por: @joao
- Data: 2026-01-13

**Condicao de Remocao:**
Permanente - natureza do projeto requer console output.
```

**Exit codes:**

- 1 (blocking) if file missing or invalid structure
- 0 + warnings if overrides are undocumented or documented but not in code

**Auto-generation:**

The `npx kabran-setup` command automatically creates this file with proper placeholders filled in.

```bash
# Creates docs/quality/001-quality-standard.md automatically
npx kabran-setup --type=node

# Skip if you want to create manually
npx kabran-setup --skip-quality-standard
```

---

## CI/CD Scripts

The package provides standardized CI/CD tooling for consistent build and deployment across all Kabran projects.

### Quick Start

```bash
# Install kabran-config
npm install -D @kabran-tecnologia/kabran-config

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
RUNNER="$PROJECT_ROOT/node_modules/@kabran-tecnologia/kabran-config/src/scripts/ci/ci-runner.sh"

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
RUNNER="$PROJECT_ROOT/node_modules/@kabran-tecnologia/kabran-config/src/scripts/deploy/deploy-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export SCRIPT_DIR="$SCRIPT_DIR"
export DEPLOY_CONFIG_FILE="$SCRIPT_DIR/deploy.json"

exec bash "$RUNNER" "$@"
```

### Troubleshooting

**"ci-core.sh not found"**

- Ensure `@kabran-tecnologia/kabran-config` is installed
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

## Telemetry (OpenTelemetry)

Unified observability for Kabran projects. Distributed tracing, error tracking, and performance monitoring using OpenTelemetry.

> **Optional Feature:** Telemetry dependencies are optional. Only install them if your project needs observability.

### Quick Start

```javascript
// Frontend (React/Vite)
import { initTelemetry, createSpan } from '@kabran-tecnologia/kabran-config/telemetry/frontend'

initTelemetry({ serviceName: 'my-app' })

// Edge Functions (Supabase/Deno)
import { withTelemetry, traceSupabaseQuery } from '@kabran-tecnologia/kabran-config/telemetry/edge'

serve(withTelemetry('my-function', async (req, span) => {
  const result = await traceSupabaseQuery('select', 'users', () => supabase.from('users').select())
  return new Response(JSON.stringify(result.data))
}))

// Node.js Backend
import { initTelemetry, telemetryMiddleware } from '@kabran-tecnologia/kabran-config/telemetry/node'

await initTelemetry({ serviceName: 'my-api' })
app.use(telemetryMiddleware())
```

### Installation

Install the required peer dependencies only if using telemetry:

```bash
npm install --save-dev \
  @opentelemetry/api@^1.9 \
  @opentelemetry/sdk-trace-base@^1.28 \
  @opentelemetry/exporter-trace-otlp-http@^0.56 \
  @opentelemetry/resources@^1.28 \
  @opentelemetry/semantic-conventions@^1.28 \
  @opentelemetry/core@^1.28

# Frontend additional
npm install --save-dev \
  @opentelemetry/sdk-trace-web@^1.28 \
  @opentelemetry/instrumentation@^0.56 \
  @opentelemetry/instrumentation-fetch@^0.56 \
  @opentelemetry/instrumentation-document-load@^0.43 \
  @opentelemetry/instrumentation-user-interaction@^0.43

# Node.js additional
npm install --save-dev @opentelemetry/sdk-trace-node@^1.28
```

### Frontend Module

For browser/frontend applications (React, Vue, etc.):

```javascript
// main.tsx or App.tsx
import { initTelemetry, createSpan, createAsyncSpan } from '@kabran-tecnologia/kabran-config/telemetry/frontend'

// Initialize at app startup
initTelemetry({
  serviceName: 'my-frontend',
  serviceVersion: '1.0.0',
  endpoint: 'https://otel.example.com',
})

// Create custom spans for tracking operations
function handleCheckout(items) {
  return createSpan('checkout.process', (span) => {
    span.setAttribute('items.count', items.length)
    return processCheckout(items)
  })
}

// Async operations
async function fetchUserData(userId) {
  return createAsyncSpan('user.fetch', async (span) => {
    span.setAttribute('user.id', userId)
    const response = await fetch(`/api/users/${userId}`)
    return response.json()
  })
}
```

**Auto-instrumentation included:**

- Fetch API requests
- Document load performance
- User interactions (click, submit)
- Global error handlers

### Edge Module (Supabase/Deno)

For serverless/edge functions with immediate trace export:

```javascript
import { serve } from 'https://deno.land/std/http/server.ts'
import { withTelemetry, traceSupabaseQuery, getTraceId } from '@kabran-tecnologia/kabran-config/telemetry/edge'

serve(withTelemetry('user-api', async (req, span) => {
  // Automatic HTTP attributes (method, url, status)
  span.setAttribute('custom.attribute', 'value')

  // Trace database queries
  const { data, error } = await traceSupabaseQuery('select', 'users', () =>
    supabase.from('users').select('*').limit(10)
  )

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ data, trace_id: getTraceId() }))
}))
```

**Features:**

- W3C Trace Context propagation
- SimpleSpanProcessor for immediate export (serverless-friendly)
- Supabase query wrapper with automatic attributes
- Error response includes trace_id for debugging

### Node.js Module

For Node.js backends with Express/Fastify:

```javascript
import express from 'express'
import { initTelemetry, telemetryMiddleware, createSpan } from '@kabran-tecnologia/kabran-config/telemetry/node'

const app = express()

// Initialize before routes
await initTelemetry({
  serviceName: 'my-api',
  serviceVersion: '1.0.0',
})

// Add middleware (creates spans for all requests)
app.use(telemetryMiddleware({
  ignorePaths: ['/health', '/ready', '/metrics'],
}))

// Access span in handlers via req.span
app.get('/users/:id', async (req, res) => {
  req.span.setAttribute('user.id', req.params.id)
  const user = await getUserById(req.params.id)
  res.json(user)
})

// Graceful shutdown on SIGTERM/SIGINT
```

**Features:**

- BatchSpanProcessor for efficient export
- Express/Fastify middleware
- Automatic request/response tracing
- Parent context extraction from headers
- Process signal handlers for graceful shutdown

### Logger Module

Structured logging with trace correlation:

```javascript
import { createLogger, createSpanLogger } from '@kabran-tecnologia/kabran-config/telemetry/logger'

// Basic logger
const logger = createLogger({
  name: 'my-service',
  level: 'info',
  format: 'json', // or 'pretty'
})

logger.info('User logged in', { userId: '123' })

// Span-aware logger (adds events to active span)
const spanLogger = createSpanLogger(span)
spanLogger.info('Processing started')
spanLogger.error('Processing failed', { error: err.message })
```

### Configuration

Configuration is resolved from multiple sources (in order of precedence):

1. Explicit config object
2. Environment variables (Vite-style: `VITE_*`)
3. Environment variables (Node-style: `OTEL_*`)
4. Smart defaults

**Environment Variables:**

| Variable | Vite Equivalent | Description | Default |
|----------|-----------------|-------------|---------|
| `OTEL_ENDPOINT` | `VITE_OTEL_ENDPOINT` | Collector endpoint URL | - |
| `OTEL_ENABLED` | `VITE_OTEL_ENABLED` | Enable/disable telemetry | `true` in prod |
| `SERVICE_NAME` | `VITE_SERVICE_NAME` | Service identifier | Required |
| `SERVICE_VERSION` | `VITE_SERVICE_VERSION` | Service version | `1.0.0` |
| `ENVIRONMENT` | `VITE_ENVIRONMENT` | Deployment environment | `development` |
| `OTEL_SAMPLE_RATE` | `VITE_OTEL_SAMPLE_RATE` | Sampling rate (0.0-1.0) | `0.1` (10%) |

**Programmatic Configuration:**

```javascript
import { defineTelemetryConfig } from '@kabran-tecnologia/kabran-config/telemetry/config'

const config = defineTelemetryConfig({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  endpoint: 'https://otel.example.com',
  environment: 'production',
  sampleRate: 0.5, // 50% sampling
  instrumentation: {
    fetch: true,
    documentLoad: true,
    userInteraction: false,
  },
  resourceAttributes: {
    'deployment.region': 'us-east-1',
  },
})
```

### API Reference

**Frontend (`telemetry/frontend`):**

- `initTelemetry(config)` - Initialize OpenTelemetry
- `getTracer(name?)` - Get tracer instance
- `getCurrentSpan()` - Get active span
- `getTraceId()` - Get current trace ID
- `createSpan(name, fn, attrs?)` - Create sync span
- `createAsyncSpan(name, fn, attrs?)` - Create async span
- `addSpanEvent(name, attrs?)` - Add event to current span
- `setSpanAttributes(attrs)` - Set attributes on current span
- `shutdownTelemetry()` - Graceful shutdown
- `isInitialized()` - Check if initialized
- `getConfig()` - Get resolved config

**Edge (`telemetry/edge`):**

- `withTelemetry(name, handler, config?)` - Wrap request handler
- `traceSupabaseQuery(op, table, fn)` - Wrap Supabase query
- `extractContext(headers)` - Extract W3C trace context
- `injectContext(headers)` - Inject W3C trace context
- `getTracer(name?)`, `getCurrentSpan()`, `getTraceId()`
- `createSpan()`, `createAsyncSpan()`, `addSpanEvent()`, `setSpanAttributes()`
- `shutdownTelemetry()`

**Node (`telemetry/node`):**

- `initTelemetry(config)` - Initialize OpenTelemetry
- `telemetryMiddleware(options?)` - Express/Fastify middleware
- `getTracer(name?)`, `getCurrentSpan()`, `getTraceId()`
- `createSpan()`, `createAsyncSpan()`, `addSpanEvent()`, `setSpanAttributes()`
- `shutdownTelemetry()`, `isInitialized()`, `getConfig()`

**Logger (`telemetry/logger`):**

- `createLogger(options)` - Create structured logger
- `createSpanLogger(span)` - Create span-aware logger

**Config (`telemetry/config`):**

- `defineTelemetryConfig(config)` - Define configuration
- `resolveConfig(config, env, mode)` - Resolve from sources
- `validateConfig(config)` - Validate configuration
- `detectEnabled(mode, env)` - Auto-detect if enabled

---

## What's Included

| Config | Description |
|--------|-------------|
| `@kabran-tecnologia/kabran-config/eslint` | Base ESLint for TypeScript (includes optional JSDoc) |
| `@kabran-tecnologia/kabran-config/eslint/node` | ESLint for Node.js (allows console, includes optional JSDoc) |
| `@kabran-tecnologia/kabran-config/eslint/react` | ESLint for React (hooks, a11y, refresh, includes optional JSDoc) |
| `@kabran-tecnologia/kabran-config/prettier` | Prettier with Tailwind plugin |
| `@kabran-tecnologia/kabran-config/tsconfig/base` | Base TypeScript (strict mode) |
| `@kabran-tecnologia/kabran-config/tsconfig/node` | TypeScript for Node.js |
| `@kabran-tecnologia/kabran-config/tsconfig/react` | TypeScript for React/Vite |
| `@kabran-tecnologia/kabran-config/commitlint` | Conventional commits |
| `@kabran-tecnologia/kabran-config/lint-staged` | Pre-commit lint + format |
| `@kabran-tecnologia/kabran-config/scripts/license-check` | License compliance validator (blocking) |
| `@kabran-tecnologia/kabran-config/scripts/dependency-report` | Outdated dependencies report (non-blocking/strict modes) |
| `@kabran-tecnologia/kabran-config/scripts/readme-validator` | README.md structure validator (blocking) |
| `@kabran-tecnologia/kabran-config/scripts/env-validator` | Environment variables validator (blocking) |
| `@kabran-tecnologia/kabran-config/scripts/quality-standard-validator` | Quality standard documentation validator |
| `@kabran-tecnologia/kabran-config/scripts/ci/*` | Standardized CI pipeline runner and core functions |
| `@kabran-tecnologia/kabran-config/scripts/deploy/*` | Standardized deployment orchestration |
| `@kabran-tecnologia/kabran-config/scripts/setup` | Project setup CLI (`npx kabran-setup`) |
| `@kabran-tecnologia/kabran-config/telemetry/config` | Telemetry configuration and validation |
| `@kabran-tecnologia/kabran-config/telemetry/frontend` | OpenTelemetry for browser/frontend apps |
| `@kabran-tecnologia/kabran-config/telemetry/edge` | OpenTelemetry for Supabase/Deno edge functions |
| `@kabran-tecnologia/kabran-config/telemetry/node` | OpenTelemetry for Node.js backends |
| `@kabran-tecnologia/kabran-config/telemetry/logger` | Structured logging with trace correlation |
| `@kabran-tecnologia/kabran-config/telemetry/shared` | Shared telemetry utilities and types |

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

### Automated Releases (semantic-release)

This package uses **semantic-release** for fully automated versioning and publishing. When a PR is merged to `main`:

1. CI analyzes commit messages (conventional commits)
2. Determines version bump (patch/minor/major)
3. Updates `CHANGELOG.md` automatically
4. Bumps `package.json` version
5. Creates GitHub release with notes
6. Publishes to npm

**Commit types and version impact:**

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:` | Patch (1.0.0 → 1.0.1) | `fix: correct license check exit code` |
| `feat:` | Minor (1.0.0 → 1.1.0) | `feat: add quality standard validator` |
| `feat!:` or `BREAKING CHANGE:` | Major (1.0.0 → 2.0.0) | `feat!: change config export format` |
| `docs:`, `chore:`, `test:`, `ci:` | No release | `docs: update README` |

**How to trigger a release:**

Simply merge a PR with conventional commits. The release happens automatically.

```bash
# These commits will trigger releases:
git commit -m "fix: resolve parsing issue"      # → patch
git commit -m "feat: add new validator"         # → minor
git commit -m "feat!: redesign API"             # → major

# These commits won't trigger releases:
git commit -m "docs: update examples"
git commit -m "chore: update dependencies"
git commit -m "test: add more test cases"
```

**Required secrets (GitHub repo settings):**

- `NPM_TOKEN` - npm automation token for publishing

### Manual Publishing (fallback)

If needed, you can still publish manually:

```bash
# Login (once)
npm login

# Bump version and publish
npm version patch && npm publish
npm version minor && npm publish
npm version major && npm publish

# Push tags
git push && git push --tags
```

---

## License

MIT
