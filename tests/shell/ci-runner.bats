#!/usr/bin/env bats
# ==============================================================================
# CI Runner Integration Tests
# ==============================================================================

# Load helpers
load '../helpers/bats-helpers.sh'

setup() {
  # Set up paths (adjusted for tests/shell/ location)
  PROJECT_ROOT="$(dirname "$(dirname "$BATS_TEST_DIRNAME")")"
  RUNNER_PATH="$PROJECT_ROOT/src/scripts/ci/ci-runner.sh"
  FIXTURES_PATH="$PROJECT_ROOT/tests/fixtures"
}

# ==============================================================================
# Basic Execution Tests
# ==============================================================================

@test "ci-runner loads and executes simple project" {
  cd "$FIXTURES_PATH/mock-simple"
  export PROJECT_ROOT="$(pwd)"
  export CI_CONFIG_FILE="scripts/ci-config.sh"
  export CI_OUTPUT_FILE_V2="/tmp/ci-simple-result.json"

  run bash "$RUNNER_PATH"
  assert_success
  assert_output --partial "CI pipeline completed successfully"

  # Verify JSON output was created (v2 format)
  assert [ -f "/tmp/ci-simple-result.json" ]

  # Verify JSON structure (v2 schema)
  run jq -e '.summary.status == "passing"' /tmp/ci-simple-result.json
  assert_success

  run jq -e '.project.name == "mock-simple"' /tmp/ci-simple-result.json
  assert_success

  rm /tmp/ci-simple-result.json
}

@test "ci-runner loads and executes monorepo project" {
  cd "$FIXTURES_PATH/mock-monorepo"
  export PROJECT_ROOT="$(pwd)"
  export CI_CONFIG_FILE="scripts/ci-config.sh"
  export CI_OUTPUT_FILE_V2="/tmp/ci-monorepo-result.json"

  run bash "$RUNNER_PATH"
  assert_success
  assert_output --partial "CI pipeline completed successfully"
  assert_output --partial "FRONTEND CI"
  assert_output --partial "BACKEND CI"

  # Verify JSON output (v2 format)
  assert [ -f "/tmp/ci-monorepo-result.json" ]

  run jq -e '.summary.status == "passing"' /tmp/ci-monorepo-result.json
  assert_success

  run jq -e '.project.name == "mock-monorepo"' /tmp/ci-monorepo-result.json
  assert_success

  rm /tmp/ci-monorepo-result.json
}

@test "ci-runner fails with missing ci-config.sh" {
  cd /tmp
  export PROJECT_ROOT="$(pwd)"
  export CI_CONFIG_FILE="nonexistent-config.sh"

  run bash "$RUNNER_PATH"
  assert_failure
  assert_output --partial "Project CI config not found"
}

@test "ci-runner fails with invalid config (missing ci_steps)" {
  # Create temporary invalid config
  mkdir -p /tmp/test-invalid-ci
  cat > /tmp/test-invalid-ci/ci-config.sh << 'EOF'
#!/usr/bin/env bash
PROJECT_NAME="invalid"
PM="npm"
# Missing ci_steps function
EOF

  cd /tmp/test-invalid-ci
  export PROJECT_ROOT="$(pwd)"
  export CI_CONFIG_FILE="ci-config.sh"

  run bash "$RUNNER_PATH"
  assert_failure
  assert_output --partial "ci_steps() function not defined"

  rm -rf /tmp/test-invalid-ci
}

@test "ci-runner respects CI_VERBOSE environment variable" {
  cd "$FIXTURES_PATH/mock-simple"
  export PROJECT_ROOT="$(pwd)"
  export CI_CONFIG_FILE="scripts/ci-config.sh"
  export CI_OUTPUT_FILE_V2="/tmp/ci-verbose-result.json"
  export CI_VERBOSE="true"

  run bash "$RUNNER_PATH"
  assert_success

  rm /tmp/ci-verbose-result.json
}

@test "ci-runner outputs CI core version" {
  cd "$FIXTURES_PATH/mock-simple"
  export PROJECT_ROOT="$(pwd)"
  export CI_CONFIG_FILE="scripts/ci-config.sh"
  export CI_OUTPUT_FILE_V2="/tmp/ci-version-result.json"

  run bash "$RUNNER_PATH"
  assert_success
  # Version is read from package.json
  assert_output --partial "CI Core Version:"

  rm /tmp/ci-version-result.json
}

