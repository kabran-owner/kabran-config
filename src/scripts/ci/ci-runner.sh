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
OUTPUT_FILE_V2="${CI_OUTPUT_FILE_V2:-docs/quality/ci-result.json}"
VERBOSE="${CI_VERBOSE:-false}"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
USE_V2="${CI_USE_V2:-true}"
CI_SCOPE="${CI_SCOPE:-all}"  # Scope filter: "all" or component name (e.g., "app", "website")

# Track errors (reinitialize to avoid issues with sourced scripts)
ERRORS=()
STEP_RESULTS=()
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
if [ "$CI_SCOPE" != "all" ]; then
  log_info "Scope: $CI_SCOPE (filtered)"
fi
echo ""

# Start timing
ci_start

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

# Generate v2 output using Node.js generator
if [ "$USE_V2" = "true" ]; then
  log_info "Generating CI result v2..."

  # Export intermediate data
  INTERMEDIATE_FILE="/tmp/ci-data-$$.json"
  export_ci_data "$INTERMEDIATE_FILE"

  # Find the generate-ci-result.mjs script
  GENERATOR_SCRIPT="$RUNNER_DIR/../generate-ci-result.mjs"

  if [ -f "$GENERATOR_SCRIPT" ] && command -v node &>/dev/null; then
    # Determine output path (support absolute paths)
    V2_OUTPUT_PATH="$OUTPUT_FILE_V2"
    if [[ "$OUTPUT_FILE_V2" != /* ]]; then
      V2_OUTPUT_PATH="$PROJECT_ROOT/$OUTPUT_FILE_V2"
    fi

    # Use Node.js generator for v2 format
    node "$GENERATOR_SCRIPT" \
      --input "$INTERMEDIATE_FILE" \
      --output "$V2_OUTPUT_PATH" \
      --project-root "$PROJECT_ROOT" || {
        log_warn "V2 generator failed, falling back to v1"
        generate_ci_json "$OUTPUT_FILE" "$CI_PASSED" "$FAILED" "$PROJECT_NAME" "$METADATA"
      }
  else
    log_warn "Node.js generator not available, using v1 format"
    generate_ci_json "$OUTPUT_FILE" "$CI_PASSED" "$FAILED" "$PROJECT_NAME" "$METADATA"
  fi

  # Cleanup
  rm -f "$INTERMEDIATE_FILE"
else
  # Use legacy v1 format
  generate_ci_json "$OUTPUT_FILE" "$CI_PASSED" "$FAILED" "$PROJECT_NAME" "$METADATA"
fi

exit $FAILED
