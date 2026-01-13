#!/usr/bin/env bats
# ==============================================================================
# Deploy Runner Integration Tests
# ==============================================================================

# Load helpers
load '../helpers/bats-helpers.sh'

setup() {
  # Set up paths (adjusted for tests/shell/ location)
  PROJECT_ROOT="$(dirname "$(dirname "$BATS_TEST_DIRNAME")")"
  RUNNER_PATH="$PROJECT_ROOT/src/scripts/deploy/deploy-runner.sh"
  FIXTURES_PATH="$PROJECT_ROOT/tests/fixtures"
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

  # Extract JSON from output (starts at first '{' and goes to end)
  echo "$output" | sed -n '/^{/,$p' > /tmp/deploy-result.json

  # Validate JSON structure
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

