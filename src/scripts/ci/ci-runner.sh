#!/usr/bin/env bash
# ==============================================================================
# Kabran CI Runner
# Entry point for project CI pipelines
# ==============================================================================

set -euo pipefail

# Detect script location
RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_SCRIPT="$RUNNER_DIR/ci-core.sh"

# ==============================================================================
# Command Line Arguments
# ==============================================================================

show_help() {
  cat << EOF
Usage: $(basename "$0") [options]

Kabran CI Runner - Execute project CI pipelines

Options:
  --list-scopes       List available scopes from ci-config.sh and exit
  --scope <name>      Run only the specified scope (component)
  --help              Show this help message and exit

Environment Variables:
  CI_SCOPE            Set the scope filter (default: all)
  CI_VERBOSE          Enable verbose output (default: false)
  CI_OUTPUT_FILE      Output file for legacy v1 format
  CI_OUTPUT_FILE_V2   Output file for v2 format (default: docs/quality/ci-result.json)
  CI_CONFIG_FILE      Path to project ci-config.sh

Examples:
  # Run all steps
  $(basename "$0")

  # Run only specific component
  $(basename "$0") --scope app

  # List available scopes
  $(basename "$0") --list-scopes
EOF
}

LIST_SCOPES=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --list-scopes)
      LIST_SCOPES=true
      shift
      ;;
    --scope)
      CI_SCOPE="$2"
      shift 2
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

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
# List Scopes (if requested)
# ==============================================================================

if [ "$LIST_SCOPES" = "true" ]; then
  echo "Available scopes in $PROJECT_NAME:"
  echo ""

  # Check if CI_COMPONENTS is defined (common pattern for monorepos)
  if [ -n "${CI_COMPONENTS:-}" ]; then
    echo "Components:"
    for component in $CI_COMPONENTS; do
      echo "  - $component"
    done
  elif declare -f list_scopes >/dev/null; then
    # Project can define custom list_scopes function
    list_scopes
  else
    echo "  all (single project - no components defined)"
  fi

  echo ""
  echo "Usage: CI_SCOPE=<scope> $(basename "$0")"
  echo "   or: $(basename "$0") --scope <scope>"
  exit 0
fi

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

# Setup trace context (generates trace_id if not provided externally)
setup_trace_context

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
