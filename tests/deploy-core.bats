#!/usr/bin/env bats
# ==============================================================================
# Deploy Core Tests
# ==============================================================================

setup() {
  # Source the deploy-core.sh script
  DEPLOY_CORE_PATH="$(dirname "$BATS_TEST_DIRNAME")/src/scripts/deploy/deploy-core.sh"
  source "$DEPLOY_CORE_PATH"

  # Set up test environment
  export PROJECT_ROOT="/tmp"
}

# ==============================================================================
# Logging Tests
# ==============================================================================

@test "log_human outputs to stderr with timestamp" {
  run log_human "test message" 2>&1
  assert_success
  assert_output --partial "test message"
}

@test "json_error outputs JSON and exits" {
  run json_error "test error"
  assert_failure
  assert_output --partial "\"error\": \"test error\""
  assert_output --partial "\"status\": \"failed\""
}

# ==============================================================================
# Stack Condition Tests
# ==============================================================================

@test "should_deploy_stack returns success for no condition" {
  stack='{"name": "test"}'
  run should_deploy_stack "$stack"
  assert_success
}

@test "should_deploy_stack returns success for always condition" {
  stack='{"name": "test", "condition": {"type": "always"}}'
  run should_deploy_stack "$stack"
  assert_success
}

@test "should_deploy_stack returns failure for never condition" {
  stack='{"name": "test", "condition": {"type": "never"}}'
  run should_deploy_stack "$stack"
  assert_failure
}

# ==============================================================================
# Execute Stack Tests
# ==============================================================================

@test "execute_stack succeeds with valid executable script" {
  # Create a test script
  echo '#!/bin/bash\necho "Deploy successful"\nexit 0' > /tmp/test-deploy.sh
  chmod +x /tmp/test-deploy.sh

  run execute_stack "test" "/tmp/test-deploy.sh" "up" 10
  assert_success

  rm /tmp/test-deploy.sh
}

@test "execute_stack fails with non-executable script" {
  echo '#!/bin/bash\necho "Deploy"\nexit 0' > /tmp/test-deploy-noexec.sh

  run execute_stack "test" "/tmp/test-deploy-noexec.sh" "up" 10
  assert_failure

  rm /tmp/test-deploy-noexec.sh
}

@test "execute_stack fails with missing script" {
  run execute_stack "test" "/tmp/nonexistent-deploy.sh" "up" 10
  assert_failure
}

# ==============================================================================
# Timeout Command Detection Tests
# ==============================================================================

@test "TIMEOUT_CMD is set correctly" {
  if command -v timeout &>/dev/null; then
    assert [ "$TIMEOUT_CMD" = "timeout" ]
  elif command -v gtimeout &>/dev/null; then
    assert [ "$TIMEOUT_CMD" = "gtimeout" ]
  else
    assert [ "$TIMEOUT_CMD" = "" ]
  fi
}

# ==============================================================================
# Helper Functions
# ==============================================================================

assert() {
  if ! "$@"; then
    echo "Assertion failed: $*"
    return 1
  fi
}

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
