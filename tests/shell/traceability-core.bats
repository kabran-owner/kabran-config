#!/usr/bin/env bats
# ==============================================================================
# Traceability Core Tests
# ==============================================================================

# Load helpers
load '../helpers/bats-helpers.sh'

setup() {
  PROJECT_ROOT="$(dirname "$(dirname "$BATS_TEST_DIRNAME")")"
  TRACEABILITY_CORE_PATH="$PROJECT_ROOT/src/scripts/traceability/traceability-core.sh"
  source "$TRACEABILITY_CORE_PATH"

  # Test fixtures
  FIXTURES="$PROJECT_ROOT/tests/fixtures/traceability"
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

# ==============================================================================
# Orphan @implements Detection Tests
# ==============================================================================

@test "check_orphan_implements passes for valid file with @spec and @implements" {
  run check_orphan_implements "$FIXTURES/valid/component.tsx"
  assert_success
}

@test "check_orphan_implements fails for file with @implements but no @spec" {
  run check_orphan_implements "$FIXTURES/orphan/service.ts"
  assert_failure
}

@test "check_orphan_implements passes for file without any @implements" {
  # Create temp file without @implements
  local temp_file
  temp_file=$(mktemp --suffix=.ts)
  echo "// No tags here" > "$temp_file"
  run check_orphan_implements "$temp_file"
  rm "$temp_file"
  assert_success
}

# ==============================================================================
# @spec Format Validation Tests
# ==============================================================================

@test "check_spec_format passes for valid format (@spec S25)" {
  run check_spec_format "$FIXTURES/valid/component.tsx"
  assert_success
}

@test "check_spec_format fails for invalid format (@spec S25-full-name)" {
  run check_spec_format "$FIXTURES/invalid-format/hook.ts"
  assert_failure
}

# ==============================================================================
# Extraction Function Tests
# ==============================================================================

@test "extract_specs returns spec ID from file" {
  run extract_specs "$FIXTURES/valid/component.tsx"
  assert_output --partial "S25"
  assert_success
}

@test "extract_implements returns AC IDs from file" {
  run extract_implements "$FIXTURES/valid/component.tsx"
  assert_output --partial "AC-01"
  assert_success
}

# ==============================================================================
# Count Function Tests
# ==============================================================================

@test "count_tagged_files returns correct count" {
  run count_tagged_files "$FIXTURES/valid"
  # Should find 1 file
  assert_output --partial "1"
  assert_success
}

@test "count_total_files returns correct count" {
  run count_total_files "$FIXTURES/valid"
  # Should find 1 file
  assert_output --partial "1"
  assert_success
}
