#!/usr/bin/env bats
# ==============================================================================
# Validate Traceability Tests
# ==============================================================================

# Load helpers
load '../helpers/bats-helpers.sh'

setup() {
  PROJECT_ROOT="$(dirname "$(dirname "$BATS_TEST_DIRNAME")")"
  VALIDATE_SCRIPT="$PROJECT_ROOT/src/scripts/traceability/validate-traceability.sh"
  FIXTURES="$PROJECT_ROOT/tests/fixtures/traceability"
}

# ==============================================================================
# Help Tests
# ==============================================================================

@test "validate-traceability.sh --help shows usage" {
  run "$VALIDATE_SCRIPT" --help
  assert_output --partial "Usage:"
  assert_output --partial "PROP-006"
  assert_success
}

# ==============================================================================
# Validation Tests
# ==============================================================================

@test "validation passes for directory with valid tags" {
  run "$VALIDATE_SCRIPT" "$FIXTURES/valid"
  assert_output --partial "[PASS]"
  assert_success
}

@test "validation fails for directory with orphan @implements" {
  run "$VALIDATE_SCRIPT" "$FIXTURES/orphan"
  assert_output --partial "Orphan @implements"
  assert_output --partial "[FAIL]"
  assert_failure
}

@test "validation warns for invalid @spec format" {
  run "$VALIDATE_SCRIPT" "$FIXTURES/invalid-format"
  assert_output --partial "Invalid @spec format"
  assert_output --partial "[WARN]"
  assert_success
}

@test "validation fails for invalid format in strict mode" {
  export STRICT_MODE=true
  run "$VALIDATE_SCRIPT" "$FIXTURES/invalid-format"
  assert_failure
  unset STRICT_MODE
}

# ==============================================================================
# Coverage Stats Tests
# ==============================================================================

@test "validation shows coverage stats" {
  run "$VALIDATE_SCRIPT" "$FIXTURES/valid"
  assert_output --partial "Traceability coverage:"
  assert_success
}
