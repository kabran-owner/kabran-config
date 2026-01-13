#!/usr/bin/env bash
# ==============================================================================
# Mock Simple Project - CI Configuration
# ==============================================================================

PROJECT_NAME="mock-simple"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM="npm"

ci_steps() {
  # Simple pipeline for testing
  if ! run_step "lint" "cd '$PROJECT_ROOT' && echo 'Running lint' && exit 0"; then
    FAILED=1
  fi
  echo ""

  if ! run_step "test" "cd '$PROJECT_ROOT' && echo 'Running tests' && exit 0"; then
    FAILED=1
  fi
  echo ""

  if ! run_step "build" "cd '$PROJECT_ROOT' && echo 'Running build' && exit 0"; then
    FAILED=2
  fi
  echo ""

  return $FAILED
}

ci_metadata() {
  jq -n \
    --arg node_version "$(node --version 2>/dev/null || echo 'unknown')" \
    --arg steps "lint,test,build" \
    '{
      node_version: $node_version,
      steps_completed: ($steps | split(","))
    }'
}
