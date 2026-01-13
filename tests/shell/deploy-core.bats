#!/usr/bin/env bats
# ==============================================================================
# Deploy Core Tests
# ==============================================================================

# Load helpers
load '../helpers/bats-helpers.sh'

setup() {
  # Source the deploy-core.sh script (adjusted for tests/shell/ location)
  PROJECT_ROOT_DIR="$(dirname "$(dirname "$BATS_TEST_DIRNAME")")"
  DEPLOY_CORE_PATH="$PROJECT_ROOT_DIR/src/scripts/deploy/deploy-core.sh"
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
  cat > /tmp/test-deploy.sh << 'EOF'
#!/bin/bash
echo "Deploy successful"
exit 0
EOF
  chmod +x /tmp/test-deploy.sh

  run execute_stack "test" "/tmp/test-deploy.sh" "up" 10
  assert_success

  rm /tmp/test-deploy.sh
}

@test "execute_stack fails with non-executable script" {
  cat > /tmp/test-deploy-noexec.sh << 'EOF'
#!/bin/bash
echo "Deploy"
exit 0
EOF

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

