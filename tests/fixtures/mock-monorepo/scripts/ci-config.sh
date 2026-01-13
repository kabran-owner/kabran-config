#!/usr/bin/env bash
# ==============================================================================
# Mock Monorepo - CI Configuration (Multi-component)
# ==============================================================================

PROJECT_NAME="mock-monorepo"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM="pnpm"

ci_steps() {
  local FAILED=0

  # ===========================================================================
  # PART 1: Frontend CI
  # ===========================================================================
  log_section "PART 1: FRONTEND CI"
  echo ""

  if ! run_step "frontend-lint" "cd '$PROJECT_ROOT' && echo 'Frontend lint'"; then
    FAILED=1
  fi
  echo ""

  if ! run_step "frontend-test" "cd '$PROJECT_ROOT' && echo 'Frontend tests'"; then
    FAILED=1
  fi
  echo ""

  if ! run_step "frontend-build" "cd '$PROJECT_ROOT' && echo 'Frontend build'"; then
    FAILED=2
  fi
  echo ""

  # ===========================================================================
  # PART 2: Backend CI
  # ===========================================================================
  log_section "PART 2: BACKEND CI"
  echo ""

  if ! run_step "backend-lint" "cd '$PROJECT_ROOT' && echo 'Backend lint'"; then
    FAILED=1
  fi
  echo ""

  if ! run_step "backend-test" "cd '$PROJECT_ROOT' && echo 'Backend tests'"; then
    FAILED=1
  fi
  echo ""

  if ! run_step "backend-build" "cd '$PROJECT_ROOT' && echo 'Backend build'"; then
    FAILED=2
  fi
  echo ""

  return $FAILED
}

ci_metadata() {
  jq -n \
    --arg node_version "$(node --version 2>/dev/null || echo 'unknown')" \
    '{
      node_version: $node_version,
      components: {
        frontend: {steps: ["lint", "test", "build"]},
        backend: {steps: ["lint", "test", "build"]}
      },
      total_steps: 6
    }'
}
