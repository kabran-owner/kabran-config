#!/usr/bin/env bash
# ==============================================================================
# Kabran CI Core - Shared Functions
# Part of @kabran-owner/kabran-config
# ==============================================================================

# Version
# Version
# Dynamically resolve from package.json to avoid hardcoding
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_PKG_JSON="$_SCRIPT_DIR/../../../package.json"
if [ -f "$_PKG_JSON" ]; then
  CI_CORE_VERSION=$(grep '"version":' "$_PKG_JSON" | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
else
  CI_CORE_VERSION="unknown"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

# ==============================================================================
# Logging Functions
# ==============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_section() {
  echo -e "${BLUE}[====]${NC} $1"
}

log_debug() {
  [ "${CI_LOG_LEVEL:-INFO}" = "DEBUG" ] && echo -e "${GRAY}[DEBUG]${NC} $1"
}

# ==============================================================================
# Version Compatibility Check
# ==============================================================================

check_version_compatibility() {
  local min_version="${CI_CORE_MIN_VERSION:-}"

  if [ -z "$min_version" ]; then
    return 0
  fi

  log_debug "Checking version compatibility: CI_CORE_VERSION=$CI_CORE_VERSION, required=$min_version"

  # Simple version comparison (major.minor only)
  local core_major="${CI_CORE_VERSION%%.*}"
  local core_minor="${CI_CORE_VERSION#*.}"
  core_minor="${core_minor%%.*}"

  local min_major="${min_version%%.*}"
  local min_minor="${min_version#*.}"
  min_minor="${min_minor%%.*}"

  if [ "$core_major" -lt "$min_major" ] ||
     { [ "$core_major" -eq "$min_major" ] && [ "$core_minor" -lt "$min_minor" ]; }; then
    log_error "CI core version $CI_CORE_VERSION < required $min_version"
    return 1
  fi

  log_debug "Version check passed"
  return 0
}

# ==============================================================================
# Configuration Validation
# ==============================================================================

validate_ci_config() {
  local errors=0

  log_debug "Validating CI configuration..."

  # Check required functions
  if ! declare -f ci_steps >/dev/null; then
    log_error "ci_steps() function not defined in ci-config.sh"
    ((errors++))
  fi

  # Check project name
  if [ -z "${PROJECT_NAME:-}" ]; then
    log_error "PROJECT_NAME not set in ci-config.sh"
    ((errors++))
  fi

  # Check package manager
  if [ -z "${PM:-}" ]; then
    log_warn "PM not set, defaulting to npm"
    PM="npm"
  fi

  # Validate PM is available
  if ! command -v "$PM" &>/dev/null; then
    log_error "Package manager '$PM' not found in PATH"
    ((errors++))
  fi

  if [ $errors -gt 0 ]; then
    log_error "Configuration validation failed with $errors error(s)"
    return 1
  fi

  log_debug "Configuration validation passed"
  return 0
}

# ==============================================================================
# Dependency Checks
# ==============================================================================

check_dependencies() {
  local missing=0

  log_debug "Checking required dependencies..."

  # Required tools
  for tool in jq git; do
    if ! command -v "$tool" &>/dev/null; then
      log_error "Required tool not found: $tool"
      ((missing++))
    fi
  done

  # Check for timeout (GNU vs BSD)
  if ! command -v timeout &>/dev/null && ! command -v gtimeout &>/dev/null; then
    log_warn "timeout command not found (install coreutils for better timeout support)"
  fi

  if [ $missing -gt 0 ]; then
    log_error "Missing $missing required dependencies"
    return 1
  fi

  log_debug "All required dependencies found"
  return 0
}

# ==============================================================================
# Step Execution
# ==============================================================================

# Run a CI step and capture result
# Usage: run_step "step_name" "command" [results_file_for_fallback]
# Returns: 0 on success, 1 on failure
run_step() {
  local name="$1"
  local cmd="$2"
  local results_file="${3:-}"
  local log_file="/tmp/ci_${name}.log"

  log_info "Running: $name"
  log_debug "  Command: $cmd"

  if eval "$cmd" > "$log_file" 2>&1; then
    log_success "$name completed"
    if [ "${CI_VERBOSE:-false}" = "true" ]; then
      cat "$log_file"
    fi
    return 0
  else
    local exit_code=$?
    log_warn "$name exited with code: $exit_code"

    # Fallback validation (for test OOM scenarios like AGT-507)
    if [ -n "$results_file" ] && [ -f "$results_file" ]; then
      log_info "Checking test results file for fallback validation..."
      if verify_test_results "$results_file"; then
        log_success "$name passed (via test results validation)"
        return 0
      fi
    fi

    log_error "$name failed"
    log_info "  Command: $cmd"
    log_info "  Exit code: $exit_code"
    log_info "  Log file: $log_file"

    # Capture error summary
    local error_summary
    error_summary=$(tail -10 "$log_file" | tr '\n' ' ' | sed 's/"/\\"/g')
    ERRORS+=("$name: $error_summary")

    # Show error output
    echo "--- Error output (last 30 lines) ---"
    tail -30 "$log_file"
    echo "--- End error output ---"

    return 1
  fi
}

# ==============================================================================
# Test Results Verification
# ==============================================================================

# Verify test results from JSON file (fallback for OOM during cleanup)
# Usage: verify_test_results "/path/to/test-results.json"
# Returns: 0 if tests passed, 1 otherwise
verify_test_results() {
  local results_file="$1"

  if [ ! -f "$results_file" ]; then
    log_warn "Test results file not found: $results_file"
    return 1
  fi

  local success failed_tests
  success=$(jq -r '.success // false' "$results_file" 2>/dev/null)
  failed_tests=$(jq -r '.numFailedTests // -1' "$results_file" 2>/dev/null)

  if [ "$success" = "true" ] && [ "$failed_tests" = "0" ]; then
    log_success "Test results validation: success=true, numFailedTests=0"
    return 0
  else
    log_error "Test results validation failed: success=$success, numFailedTests=$failed_tests"
    return 1
  fi
}

# ==============================================================================
# JSON Output Generation
# ==============================================================================

# Generate CI JSON output
# Usage: generate_ci_json "$OUTPUT_FILE" "$CI_PASSED" "$EXIT_CODE" "$PROJECT_NAME" "$METADATA_JSON"
generate_ci_json() {
  local output_file="$1"
  local ci_passed="$2"
  local exit_code="$3"
  local project="$4"
  local metadata="${5:-{}}"

  log_debug "Generating CI JSON output: $output_file"

  # Create output directory if needed
  mkdir -p "$(dirname "$output_file")"

  # Build errors array as JSON
  local errors_json="[]"
  if [ ${#ERRORS[@]} -gt 0 ]; then
    errors_json=$(printf '%s\n' "${ERRORS[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]')
  fi

  # Write JSON result file
  jq -n \
    --argjson ci_passed "$ci_passed" \
    --argjson exit_code "$exit_code" \
    --argjson errors "$errors_json" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --arg working_directory "$(pwd)" \
    --arg project "$project" \
    --argjson metadata "$metadata" \
    '{
      ci_passed: $ci_passed,
      exit_code: $exit_code,
      errors: $errors,
      timestamp: $timestamp,
      working_directory: $working_directory,
      project: $project,
      metadata: $metadata
    }' > "$output_file"

  # Print structured output for Kosmos to parse
  echo ""
  echo "=========================================="
  if [ "$ci_passed" = "true" ]; then
    log_success "CI PASSED - All checks completed successfully"
  else
    log_error "CI FAILED (exit code: $exit_code)"
    if [ ${#ERRORS[@]} -gt 0 ]; then
      echo ""
      log_error "Failed steps:"
      for error in "${ERRORS[@]}"; do
        echo "  - $error"
      done
    fi
  fi
  echo "=========================================="
  echo ""

  # IMPORTANT: This line is parsed by Kosmos orchestration
  echo "CI_RESULT_JSON: $(cat "$output_file" | tr -d '\n')"
}
