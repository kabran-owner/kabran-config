# CI/CD Migration Guide

This guide helps you migrate existing CI/CD scripts to use `@kabran-owner/kabran-config` standardized scripts.

## Before/After Comparison

### Before (Old Pattern)

```bash
# scripts/ci.sh - 250 lines mixing logic + config
#!/usr/bin/env bash
set -euo pipefail

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
# ...

# Define logging functions
log_info() { ... }
log_error() { ... }
# ...

# Define execution function
run_step() { ... }

# CI steps (project-specific)
run_step "lint" "pnpm lint:ci"
run_step "test" "pnpm test:ci"
# ...

# Generate JSON output
echo "CI_RESULT_JSON: ..."
```

### After (New Pattern)

```bash
# scripts/ci.sh - 15 lines (wrapper)
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/node_modules/@kabran-owner/kabran-config/src/scripts/ci/ci-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export CI_CONFIG_FILE="$SCRIPT_DIR/ci-config.sh"
exec bash "$RUNNER" "$@"
```

```bash
# scripts/ci-config.sh - 60 lines (config only)
#!/usr/bin/env bash
PROJECT_NAME="my-project"
PM="pnpm"

ci_steps() {
  run_step "lint" "cd '$PROJECT_ROOT' && $PM lint:ci" || FAILED=1
  run_step "test" "cd '$PROJECT_ROOT' && $PM test:ci" || FAILED=1
  run_step "build" "cd '$PROJECT_ROOT' && $PM build" || FAILED=2
  return $FAILED
}
```

## Migration Steps

### Step 1: Install kabran-config

```bash
npm install --save-dev @kabran-owner/kabran-config@^1.5.0
```

### Step 2: Extract Configuration

1. Identify your CI steps in existing `scripts/ci.sh`
2. Create `scripts/ci-config.sh` with only config
3. Move step definitions to `ci_steps()` function

**Example extraction:**

```bash
# OLD scripts/ci.sh
run_step "format-check" "pnpm format:check"
run_step "lint" "pnpm lint:ci"
run_step "typecheck" "pnpm type-check"

# NEW scripts/ci-config.sh
ci_steps() {
  run_step "format-check" "cd '$PROJECT_ROOT' && $PM format:check" || FAILED=1
  run_step "lint" "cd '$PROJECT_ROOT' && $PM lint:ci" || FAILED=1
  run_step "typecheck" "cd '$PROJECT_ROOT' && $PM type-check" || FAILED=1
  return $FAILED
}
```

### Step 3: Replace Wrapper

```bash
# Backup old script
mv scripts/ci.sh scripts/ci.sh.backup

# Create new wrapper
cat > scripts/ci.sh << 'EOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/node_modules/@kabran-owner/kabran-config/src/scripts/ci/ci-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export CI_CONFIG_FILE="$SCRIPT_DIR/ci-config.sh"
exec bash "$RUNNER" "$@"
EOF

chmod +x scripts/ci.sh
```

### Step 4: Test Locally

```bash
# Dry run
CI_VERBOSE=true bash scripts/ci.sh

# Check JSON output
cat .workspace/ci-result.json | jq .
```

### Step 5: Validate in CI

Push to a test branch and verify GitHub Actions / bash-worker works correctly.

## Common Pitfalls

### Path Issues

❌ **Wrong:**
```bash
run_step "lint" "pnpm lint:ci"  # Runs in wrong directory
```

✅ **Correct:**
```bash
run_step "lint" "cd '$PROJECT_ROOT' && $PM lint:ci"
```

### Exit Code Handling

❌ **Wrong:**
```bash
ci_steps() {
  run_step "build" "pnpm build"  # Doesn't track failure
}
```

✅ **Correct:**
```bash
ci_steps() {
  run_step "build" "cd '$PROJECT_ROOT' && $PM build" || FAILED=2
  return $FAILED
}
```

### Missing PM Variable

❌ **Wrong:**
```bash
# ci-config.sh without PM
ci_steps() {
  run_step "lint" "npm run lint"  # Hardcoded npm
}
```

✅ **Correct:**
```bash
PM="npm"  # Or pnpm, yarn

ci_steps() {
  run_step "lint" "cd '$PROJECT_ROOT' && $PM run lint"
}
```

## Rollback Procedure

If migration fails:

```bash
# Restore old script
mv scripts/ci.sh.backup scripts/ci.sh

# Remove kabran-config (optional)
npm uninstall @kabran-owner/kabran-config
```

## Project-Specific Examples

### Tricket (Monorepo with pnpm)

```bash
#!/usr/bin/env bash
PROJECT_NAME="tricket-monorepo"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/..\" && pwd)"
PM="pnpm"

ci_steps() {
  run_step "format-check" "cd '$PROJECT_ROOT' && $PM format:check" || FAILED=1
  run_step "lint" "cd '$PROJECT_ROOT' && $PM lint:ci" || FAILED=1
  run_step "typecheck" "cd '$PROJECT_ROOT' && $PM type-check" || FAILED=1
  run_step "test" "cd '$PROJECT_ROOT' && $PM test:ci" || FAILED=1
  run_step "build" "cd '$PROJECT_ROOT' && $PM build" || FAILED=2
  return $FAILED
}

ci_metadata() {
  jq -n \
    --arg node_version "$(node --version)" \
    --arg pm_version "$($PM --version)" \
    --arg steps "format-check,lint,typecheck,test,build" \
    '{
      node_version: $node_version,
      pnpm_version: $pm_version,
      steps_completed: ($steps | split(","))
    }'
}
```

### CIE (Multi-Component with Doppler)

```bash
#!/usr/bin/env bash
PROJECT_NAME="cie-monorepo"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/..\" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
CMS_DIR="$PROJECT_ROOT/cms"
WEBSITE_DIR="$PROJECT_ROOT/website"
PM="npm"

ci_steps() {
  # Frontend
  log_section "PART 1: FRONTEND CI (React + Vite)"
  run_step "frontend-format" "cd '$FRONTEND_DIR' && $PM run format:ci" || FAILED=1
  run_step "frontend-lint" "cd '$FRONTEND_DIR' && $PM run lint" || FAILED=1
  run_step "frontend-typecheck" "cd '$FRONTEND_DIR' && $PM run type-check" || FAILED=1
  run_step "frontend-test" "cd '$FRONTEND_DIR' && $PM run test:ci" "$FRONTEND_DIR/test-results.json" || FAILED=1
  run_step "frontend-build" "cd '$FRONTEND_DIR' && $PM run build" || FAILED=2

  # CMS
  log_section "PART 2: CMS CI (Next.js + PayloadCMS)"
  run_step "cms-typecheck" "cd '$CMS_DIR' && $PM run typecheck" || FAILED=1
  run_step "cms-build" "cd '$CMS_DIR' && doppler run -- $PM run build" || FAILED=2

  # Website
  log_section "PART 3: WEBSITE CI (React + Vite)"
  run_step "website-format" "cd '$WEBSITE_DIR' && $PM run format:ci" || FAILED=1
  run_step "website-lint" "cd '$WEBSITE_DIR' && $PM run lint" || FAILED=1
  run_step "website-typecheck" "cd '$WEBSITE_DIR' && $PM run type-check" || FAILED=1
  run_step "website-test" "cd '$WEBSITE_DIR' && $PM run test:ci" "$WEBSITE_DIR/test-results.json" || FAILED=1
  run_step "website-build" "cd '$WEBSITE_DIR' && $PM run build" || FAILED=2

  return $FAILED
}
```

### Kabran-app (with Supabase)

```bash
#!/usr/bin/env bash
PROJECT_NAME="kabran-app"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/..\" && pwd)"
SUPABASE_DIR="$PROJECT_ROOT/supabase"
PM="npm"

SUPABASE_STARTED=false

cleanup_supabase() {
  if [ "$SUPABASE_STARTED" = "true" ]; then
    log_warn "Cleaning up Supabase containers..."
    cd "$PROJECT_ROOT" 2>/dev/null && supabase stop 2>/dev/null || true
  fi
}

trap cleanup_supabase EXIT

has_migrations_changed() {
  local base_branch="${CI_BASE_BRANCH:-main}"

  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    return 1
  fi

  git fetch origin "$base_branch" --quiet 2>/dev/null || true

  if git diff --name-only "origin/${base_branch}...HEAD" 2>/dev/null | grep -qE "^(supabase/migrations/|supabase/functions/)"; then
    return 0
  fi

  return 1
}

ci_steps() {
  # Frontend CI
  log_section "PART 1: FRONTEND CI"
  run_step "lint" "cd '$PROJECT_ROOT' && $PM run lint -w @kabran/web -- --max-warnings=0" || FAILED=1
  run_step "typecheck" "cd '$PROJECT_ROOT' && $PM run type-check" || FAILED=1
  run_step "test" "cd '$PROJECT_ROOT' && $PM run test -w @kabran/web -- run" || FAILED=1
  run_step "build" "cd '$PROJECT_ROOT' && $PM run build" || FAILED=2

  # Database CI (Conditional)
  if has_migrations_changed; then
    log_section "PART 2: DATABASE CI (Supabase Migrations)"

    if ! run_step "supabase-start" "cd '$PROJECT_ROOT' && supabase start"; then
      FAILED=2
      supabase stop 2>/dev/null || true
    else
      SUPABASE_STARTED=true

      run_step "supabase-migrations" "cd '$PROJECT_ROOT' && supabase db reset --linked=false" || FAILED=1

      if ! run_step "supabase-stop" "cd '$PROJECT_ROOT' && supabase stop"; then
        log_warn "Failed to stop Supabase cleanly"
      fi
      SUPABASE_STARTED=false
    fi
  else
    log_info "No migrations/functions changed, skipping database CI"
  fi

  return $FAILED
}
```

## Deploy Migration

### Before

```bash
# scripts/deploy.sh - 300+ lines
# (manual JSON parsing, stack execution, etc.)
```

### After

```bash
# scripts/deploy.sh - 15 lines
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/node_modules/@kabran-owner/kabran-config/src/scripts/deploy/deploy-runner.sh"

export PROJECT_ROOT="$PROJECT_ROOT"
export SCRIPT_DIR="$SCRIPT_DIR"
export DEPLOY_CONFIG_FILE="$SCRIPT_DIR/deploy.json"

exec bash "$RUNNER" "$@"
```

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

## Support

Issues? Check:
1. kabran-config README.md
2. Example configs in this migration guide
3. Create issue in nexus repo

---

**Version:** 1.5.0
**Last Updated:** 2026-01-12
