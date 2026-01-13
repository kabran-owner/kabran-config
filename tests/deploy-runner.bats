#!/usr/bin/env bats
# ==============================================================================
# Deploy Runner Integration Tests
# ==============================================================================

setup() {
  # Set up paths
  RUNNER_PATH="$(dirname "$BATS_TEST_DIRNAME")/src/scripts/deploy/deploy-runner.sh"
  FIXTURES_PATH="$(dirname "$BATS_TEST_DIRNAME")/tests/fixtures"
  export DOPPLER_INJECTED=1
}

# ==============================================================================
# Basic Execution Tests
# ==============================================================================

@test "deploy-runner loads and executes deploy.json" {
  cd "$FIXTURES_PATH/mock-deploy/scripts"
  export PROJECT_ROOT="$(pwd)/.."
  export SCRIPT_DIR="$(pwd)"
  export DEPLOY_CONFIG_FILE="deploy.json"

  run bash "$RUNNER_PATH" up
  assert_success
  assert_output --partial "Starting deploy for project: mock-deploy"
  assert_output --partial "Deploy complete"
}

@test "deploy-runner fails with missing deploy.json" {
  cd /tmp
  export PROJECT_ROOT="$(pwd)"
  export SCRIPT_DIR="$(pwd)"
  export DEPLOY_CONFIG_FILE="nonexistent.json"

  run bash "$RUNNER_PATH" up
  assert_failure
  assert_output --partial "deploy.json not found"
}

@test "deploy-runner outputs valid JSON" {
  cd "$FIXTURES_PATH/mock-deploy/scripts"
  export PROJECT_ROOT="$(pwd)/.."
  export SCRIPT_DIR="$(pwd)"
  export DEPLOY_CONFIG_FILE="deploy.json"

  run bash "$RUNNER_PATH" up
  assert_success

  # Validate JSON structure
  echo "$output" | tail -1 > /tmp/deploy-result.json
  run jq -e '.project == "mock-deploy"' /tmp/deploy-result.json
  assert_success

  run jq -e '.status' /tmp/deploy-result.json
  assert_success

  rm /tmp/deploy-result.json
}

@test "deploy-runner respects --force flag" {
  cd "$FIXTURES_PATH/mock-deploy/scripts"
  export PROJECT_ROOT="$(pwd)/.."
  export SCRIPT_DIR="$(pwd)"
  export DEPLOY_CONFIG_FILE="deploy.json"

  run bash "$RUNNER_PATH" up --force
  assert_success
  assert_output --partial "Force deploy: enabled"
}

@test "deploy-runner executes multiple stacks" {
  cd "$FIXTURES_PATH/mock-deploy/scripts"
  export PROJECT_ROOT="$(pwd)/.."
  export SCRIPT_DIR="$(pwd)"
  export DEPLOY_CONFIG_FILE="deploy.json"

  run bash "$RUNNER_PATH" up
  assert_success
  assert_output --partial "Processing stack: api"
  assert_output --partial "Processing stack: frontend"
}

# ==============================================================================
# Helper Functions
# ==============================================================================

assert_success() {
  if [ "$status" -ne 0 ]; then
    echo "Expected success but got exit code: $status"
    echo "Output: $output"
    return 1
  fi
}

assert_failure() {
  if [ "$status" -eq 0 ]; then
    echo "Expected failure but got success"
    echo "Output: $output"
    return 1
  fi
}

assert_output() {
  if [ "$1" = "--partial" ]; then
    if ! echo "$output" | grep -q "$2"; then
      echo "Expected output to contain: $2"
      echo "Actual output: $output"
      return 1
    fi
  fi
}
