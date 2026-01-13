#!/usr/bin/env bats
# ==============================================================================
# CI Core Tests
# ==============================================================================

# Load helpers
load '../helpers/bats-helpers.sh'

setup() {
  # Source the ci-core.sh script (path adjusted for tests/shell/ location)
  PROJECT_ROOT="$(dirname "$(dirname "$BATS_TEST_DIRNAME")")"
  CI_CORE_PATH="$PROJECT_ROOT/src/scripts/ci/ci-core.sh"
  source "$CI_CORE_PATH"

  # Set up test environment
  export PROJECT_NAME="test-project"
  export PM="npm"
  declare -a ERRORS=()
}

# ==============================================================================
# Logging Function Tests
# ==============================================================================

@test "log_info outputs blue INFO prefix" {
  run log_info "test message"
  assert_output --partial "[INFO]"
  assert_success
}

@test "log_success outputs green PASS prefix" {
  run log_success "test passed"
  assert_output --partial "[PASS]"
  assert_success
}

@test "log_error outputs red FAIL prefix" {
  run log_error "test error"
  assert_output --partial "[FAIL]"
  assert_success
}

@test "log_warn outputs yellow WARN prefix" {
  run log_warn "test warning"
  assert_output --partial "[WARN]"
  assert_success
}

@test "log_section outputs section header" {
  run log_section "Test Section"
  assert_output --partial "[====]"
  assert_success
}

# ==============================================================================
# Version Compatibility Tests
# ==============================================================================

@test "check_version_compatibility passes when no min version set" {
  unset CI_CORE_MIN_VERSION
  run check_version_compatibility
  assert_success
}

@test "check_version_compatibility passes for compatible version" {
  # CI_CORE_VERSION is read from package.json, so min must be <= current version
  export CI_CORE_MIN_VERSION="0.9.0"
  run check_version_compatibility
  assert_success
}

@test "check_version_compatibility fails for incompatible version" {
  export CI_CORE_MIN_VERSION="2.0.0"
  run check_version_compatibility
  assert_failure
}

# ==============================================================================
# Configuration Validation Tests
# ==============================================================================

@test "validate_ci_config fails when ci_steps not defined" {
  unset -f ci_steps
  run validate_ci_config
  assert_failure
  assert_output --partial "ci_steps() function not defined"
}

@test "validate_ci_config fails when PROJECT_NAME not set" {
  ci_steps() { return 0; }
  unset PROJECT_NAME
  run validate_ci_config
  assert_failure
  assert_output --partial "PROJECT_NAME not set"
}

@test "validate_ci_config warns when PM not set and defaults to npm" {
  ci_steps() { return 0; }
  export PROJECT_NAME="test"
  unset PM
  run validate_ci_config
  assert_output --partial "PM not set, defaulting to npm"
  assert_success
}

@test "validate_ci_config fails when PM is not available" {
  ci_steps() { return 0; }
  export PROJECT_NAME="test"
  export PM="nonexistent-package-manager"
  run validate_ci_config
  assert_failure
  assert_output --partial "Package manager 'nonexistent-package-manager' not found"
}

@test "validate_ci_config passes with valid configuration" {
  ci_steps() { return 0; }
  export PROJECT_NAME="test"
  export PM="npm"
  run validate_ci_config
  assert_success
}

# ==============================================================================
# Dependency Check Tests
# ==============================================================================

@test "check_dependencies succeeds when all dependencies present" {
  run check_dependencies
  assert_success
}

# ==============================================================================
# Step Execution Tests
# ==============================================================================

@test "run_step succeeds with exit 0 command" {
  run run_step "test-pass" "true"
  assert_success
  assert_output --partial "test-pass completed"
}

@test "run_step fails with exit 1 command" {
  run run_step "test-fail" "false"
  assert_failure
  assert_output --partial "test-fail failed"
}

@test "run_step captures command in error output" {
  run run_step "test-fail" "false"
  assert_output --partial "Command: false"
}

@test "run_step captures exit code in error output" {
  run run_step "test-fail" "false"
  assert_output --partial "Exit code: 1"
}

# ==============================================================================
# Test Results Verification Tests
# ==============================================================================

@test "verify_test_results accepts valid passing JSON" {
  echo '{"success": true, "numFailedTests": 0}' > /tmp/test-results.json
  run verify_test_results /tmp/test-results.json
  assert_success
  assert_output --partial "success=true, numFailedTests=0"
  rm /tmp/test-results.json
}

@test "verify_test_results rejects failed tests JSON" {
  echo '{"success": false, "numFailedTests": 3}' > /tmp/test-results.json
  run verify_test_results /tmp/test-results.json
  assert_failure
  assert_output --partial "success=false, numFailedTests=3"
  rm /tmp/test-results.json
}

@test "verify_test_results fails for missing file" {
  run verify_test_results /tmp/nonexistent.json
  assert_failure
  assert_output --partial "Test results file not found"
}

# ==============================================================================
# JSON Output Generation Tests
# ==============================================================================

@test "generate_ci_json creates valid JSON file" {
  ERRORS=()
  run generate_ci_json "/tmp/ci-test.json" "true" "0" "test-project" "{}"
  assert_success
  assert [ -f "/tmp/ci-test.json" ]

  # Validate JSON structure
  run jq -e '.ci_passed == true' /tmp/ci-test.json
  assert_success

  run jq -e '.exit_code == 0' /tmp/ci-test.json
  assert_success

  run jq -e '.project == "test-project"' /tmp/ci-test.json
  assert_success

  rm /tmp/ci-test.json
}

@test "generate_ci_json includes errors in output" {
  ERRORS=("step1: error1" "step2: error2")
  run generate_ci_json "/tmp/ci-test.json" "false" "1" "test-project" "{}"
  assert_success

  # Check errors array
  run jq -e '.errors | length == 2' /tmp/ci-test.json
  assert_success

  rm /tmp/ci-test.json
}

@test "generate_ci_json includes metadata" {
  ERRORS=()
  METADATA='{"node_version": "v20.0.0"}'
  run generate_ci_json "/tmp/ci-test.json" "true" "0" "test-project" "$METADATA"
  assert_success

  run jq -e '.metadata.node_version == "v20.0.0"' /tmp/ci-test.json
  assert_success

  rm /tmp/ci-test.json
}

@test "generate_ci_json outputs CI_RESULT_JSON line" {
  ERRORS=()
  run generate_ci_json "/tmp/ci-test.json" "true" "0" "test-project" "{}"
  assert_output --partial "CI_RESULT_JSON:"
  rm /tmp/ci-test.json
}

