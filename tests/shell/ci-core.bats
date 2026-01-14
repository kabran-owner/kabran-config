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

# ==============================================================================
# OpenTelemetry Metrics Export Tests
# ==============================================================================

@test "export_ci_metrics_to_otel skips when OTEL_ENDPOINT not set" {
  unset OTEL_ENDPOINT
  run export_ci_metrics_to_otel "/tmp/ci-data.json"
  assert_success
}

@test "export_ci_metrics_to_otel fails when data file not found" {
  export OTEL_ENDPOINT="http://localhost:4318"
  run export_ci_metrics_to_otel "/tmp/nonexistent-file.json"
  assert_failure
  assert_output --partial "CI data file not found"
  unset OTEL_ENDPOINT
}

@test "build_otlp_metrics_payload generates valid JSON structure" {
  local steps_json='[{"name":"lint","status":"pass","duration_ms":1000,"category":"quality"},{"name":"test","status":"pass","duration_ms":2000,"category":"test"}]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "3000" "true" "$steps_json" "$timestamp_ns" "abc123"

  assert_success

  # Validate it's valid JSON
  echo "$output" | jq -e '.' > /dev/null
  assert [ $? -eq 0 ]

  # Validate structure
  local has_resource_metrics
  has_resource_metrics=$(echo "$output" | jq -e '.resourceMetrics | length > 0' 2>/dev/null)
  assert [ "$has_resource_metrics" = "true" ]

  # Validate service name
  local service_name
  service_name=$(echo "$output" | jq -r '.resourceMetrics[0].resource.attributes[] | select(.key == "service.name") | .value.stringValue' 2>/dev/null)
  assert [ "$service_name" = "ci-runner" ]

  # Validate project name
  local project_name
  project_name=$(echo "$output" | jq -r '.resourceMetrics[0].resource.attributes[] | select(.key == "project.name") | .value.stringValue' 2>/dev/null)
  assert [ "$project_name" = "test-project" ]
}

@test "build_otlp_metrics_payload includes trace_id when provided" {
  local steps_json='[]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "1000" "true" "$steps_json" "$timestamp_ns" "trace123abc"

  assert_success

  # Validate trace_id is included
  local trace_id
  trace_id=$(echo "$output" | jq -r '.resourceMetrics[0].resource.attributes[] | select(.key == "trace.id") | .value.stringValue' 2>/dev/null)
  assert [ "$trace_id" = "trace123abc" ]
}

@test "build_otlp_metrics_payload excludes trace_id when empty" {
  local steps_json='[]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "1000" "true" "$steps_json" "$timestamp_ns" ""

  assert_success

  # Validate trace_id is NOT included
  local trace_attr
  trace_attr=$(echo "$output" | jq -r '.resourceMetrics[0].resource.attributes[] | select(.key == "trace.id")' 2>/dev/null)
  assert [ -z "$trace_attr" ]
}

@test "build_otlp_metrics_payload includes ci.build.duration metric" {
  local steps_json='[]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "5000" "true" "$steps_json" "$timestamp_ns" ""

  assert_success

  # Validate ci.build.duration metric exists
  local duration_metric
  duration_metric=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.build.duration") | .name' 2>/dev/null)
  assert [ "$duration_metric" = "ci.build.duration" ]

  # Validate duration value
  local duration_value
  duration_value=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.build.duration") | .gauge.dataPoints[0].asDouble' 2>/dev/null)
  assert [ "$duration_value" = "5000" ]
}

@test "build_otlp_metrics_payload includes ci.build.status metric" {
  local steps_json='[]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "1000" "false" "$steps_json" "$timestamp_ns" ""

  assert_success

  # Validate ci.build.status metric exists with fail status
  local status_value
  status_value=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.build.status") | .sum.dataPoints[0].attributes[] | select(.key == "status") | .value.stringValue' 2>/dev/null)
  assert [ "$status_value" = "fail" ]
}

@test "build_otlp_metrics_payload includes ci.step.duration metrics" {
  local steps_json='[{"name":"lint","status":"pass","duration_ms":1500,"category":"quality"},{"name":"test","status":"fail","duration_ms":3000,"category":"test"}]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "4500" "false" "$steps_json" "$timestamp_ns" ""

  assert_success

  # Validate ci.step.duration metric exists
  local step_metric
  step_metric=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.step.duration") | .name' 2>/dev/null)
  assert [ "$step_metric" = "ci.step.duration" ]

  # Validate step data points count
  local step_count
  step_count=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.step.duration") | .gauge.dataPoints | length' 2>/dev/null)
  assert [ "$step_count" = "2" ]
}

@test "build_otlp_metrics_payload includes ci.step.count metric" {
  local steps_json='[{"name":"lint","status":"pass","duration_ms":1000,"category":"quality"},{"name":"test","status":"pass","duration_ms":2000,"category":"test"},{"name":"build","status":"fail","duration_ms":500,"category":"build"},{"name":"deploy","status":"skip","duration_ms":0,"category":"deploy"}]'
  local timestamp_ns="1704067200000000000"

  run build_otlp_metrics_payload "test-project" "3500" "false" "$steps_json" "$timestamp_ns" ""

  assert_success

  # Validate ci.step.count metric exists
  local count_metric
  count_metric=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.step.count") | .name' 2>/dev/null)
  assert [ "$count_metric" = "ci.step.count" ]

  # Validate pass count
  local pass_count
  pass_count=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.step.count") | .sum.dataPoints[] | select(.attributes[] | select(.key == "status" and .value.stringValue == "pass")) | .asInt' 2>/dev/null)
  assert [ "$pass_count" = "2" ]

  # Validate fail count
  local fail_count
  fail_count=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.step.count") | .sum.dataPoints[] | select(.attributes[] | select(.key == "status" and .value.stringValue == "fail")) | .asInt' 2>/dev/null)
  assert [ "$fail_count" = "1" ]

  # Validate skip count
  local skip_count
  skip_count=$(echo "$output" | jq -r '.resourceMetrics[0].scopeMetrics[0].metrics[] | select(.name == "ci.step.count") | .sum.dataPoints[] | select(.attributes[] | select(.key == "status" and .value.stringValue == "skip")) | .asInt' 2>/dev/null)
  assert [ "$skip_count" = "1" ]
}

