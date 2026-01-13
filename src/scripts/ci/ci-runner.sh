#!/usr/bin/env bash
# ==============================================================================
# Kabran CI Runner
# Entry point for project CI pipelines
# ==============================================================================

set -euo pipefail

# Detect script location
RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_SCRIPT="$RUNNER_DIR/ci-core.sh"

# Load core functions
if [ ! -f "$CORE_SCRIPT" ]; then
  echo "ERROR: ci-core.sh not found at $CORE_SCRIPT" >&2
  exit 2
fi

source "$CORE_SCRIPT"

# ==============================================================================
# Configuration Defaults
# ==============================================================================

OUTPUT_FILE="${CI_OUTPUT_FILE:-.workspace/ci-result.json}"
VERBOSE="${CI_VERBOSE:-false}"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

# Track errors
declare -a ERRORS=()
FAILED=0

# ==============================================================================
# Dependency Checks
# ==============================================================================

if ! check_dependencies; then
  log_error "Missing required dependencies"
  exit 2
fi

# ==============================================================================
# Load Project Configuration
# ==============================================================================

CONFIG_FILE="${CI_CONFIG_FILE:-$PROJECT_ROOT/scripts/ci-config.sh}"

if [ ! -f "$CONFIG_FILE" ]; then
  log_error "Project CI config not found: $CONFIG_FILE"
  log_info "Expected file: scripts/ci-config.sh"
  exit 2
fi

log_info "Loading project configuration: $CONFIG_FILE"
source "$CONFIG_FILE"

# ==============================================================================
# Validate Configuration
# ==============================================================================

# Check version compatibility
if ! check_version_compatibility; then
  log_error "Version compatibility check failed"
  exit 2
fi

# Validate config
if ! validate_ci_config; then
  log_error "Configuration validation failed"
  exit 2
fi

# ==============================================================================
# Execute CI Pipeline
# ==============================================================================

log_info "Starting Kabran CI - $PROJECT_NAME"
log_info "Working directory: $PROJECT_ROOT"
log_info "CI Core Version: $CI_CORE_VERSION"
echo ""

# Call project-defined pipeline
if ci_steps; then
  log_success "CI pipeline completed successfully"
else
  FAILED=$?
  log_error "CI pipeline failed with exit code: $FAILED"
fi

# ==============================================================================
# Generate Output
# ==============================================================================

# Determine ci_passed
CI_PASSED="false"
if [ $FAILED -eq 0 ]; then
  CI_PASSED="true"
fi

# Build metadata (project can override via ci_metadata function)
METADATA="{}"
if declare -f ci_metadata >/dev/null; then
  METADATA=$(ci_metadata)
fi

generate_ci_json "$OUTPUT_FILE" "$CI_PASSED" "$FAILED" "$PROJECT_NAME" "$METADATA"

exit $FAILED
