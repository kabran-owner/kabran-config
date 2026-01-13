#!/usr/bin/env bash
# ==============================================================================
# Kabran Deploy Runner
# Entry point for project deployments
# ==============================================================================

set -o pipefail

# Detect script location
RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_SCRIPT="$RUNNER_DIR/deploy-core.sh"

# Load core functions
if [ ! -f "$CORE_SCRIPT" ]; then
  echo "ERROR: deploy-core.sh not found at $CORE_SCRIPT" >&2
  exit 2
fi

source "$CORE_SCRIPT"

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="${SCRIPT_DIR:-$(pwd)}"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-$SCRIPT_DIR/deploy.json}"
COMMAND="${1:-up}"
FORCE_DEPLOY="${DEPLOY_FORCE:-false}"
RESULTS=()

# Check for --force flag
if [[ "$2" == "--force" ]] || [[ "$COMMAND" == "--force" ]]; then
  FORCE_DEPLOY="true"
  [ "$COMMAND" == "--force" ] && COMMAND="up"
fi

# ==============================================================================
# Secrets Management (Auto-detect)
# ==============================================================================

# Load .env if exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Infisical injection
if [ -z "$SECRETS_INJECTED" ] && [ -n "$INFISICAL_TOKEN" ]; then
  if command -v infisical &>/dev/null; then
    log_human "Infisical detected - injecting secrets..."
    exec env SECRETS_INJECTED=1 INFISICAL_TOKEN="$INFISICAL_TOKEN" infisical run -- "$0" "$@"
  fi
fi

# Doppler injection
if [ -z "$DOPPLER_INJECTED" ] && command -v doppler &>/dev/null; then
  CONFIGURED_TOKEN=$(doppler configure get token --scope "$SCRIPT_DIR" --plain 2>/dev/null || echo "")
  if [ -n "$CONFIGURED_TOKEN" ] || [ -n "$DOPPLER_TOKEN" ]; then
    DOPPLER_TOKEN="${DOPPLER_TOKEN:-$CONFIGURED_TOKEN}"
    log_human "Doppler detected - injecting secrets..."
    exec env DOPPLER_INJECTED=1 DOPPLER_TOKEN="$DOPPLER_TOKEN" doppler run -- "$0" "$@"
  fi
fi

# ==============================================================================
# Dependency Checks
# ==============================================================================

if ! command -v jq &>/dev/null; then
  json_error "jq not installed"
fi

if [ ! -f "$CONFIG_FILE" ]; then
  json_error "deploy.json not found at $CONFIG_FILE"
fi

# ==============================================================================
# Read Configuration
# ==============================================================================

PROJECT=$(jq -r '.project' "$CONFIG_FILE")
VERSION=$(jq -r '.version // "1.0.0"' "$CONFIG_FILE")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TIMEOUT=$(jq -r '.settings.timeout_seconds // 300' "$CONFIG_FILE")
SKIP_UNCHANGED=$(jq -r '.settings.skip_unchanged // false' "$CONFIG_FILE")

if [ "$FORCE_DEPLOY" == "true" ]; then
  SKIP_UNCHANGED="false"
fi

log_human "Starting deploy for project: $PROJECT v$VERSION"
log_human "Command: $COMMAND"
log_human "Commit: $COMMIT"
log_human "Skip unchanged: $SKIP_UNCHANGED"
[ "$FORCE_DEPLOY" == "true" ] && log_human "Force deploy: enabled"
[ -n "$TIMEOUT_CMD" ] && log_human "Timeout command: $TIMEOUT_CMD" || log_human "Timeout: disabled (command not found)"

# ==============================================================================
# Execute Stacks
# ==============================================================================

while IFS= read -r stack; do
  name=$(echo "$stack" | jq -r '.name')
  path=$(echo "$stack" | jq -r '.path')
  script=$(echo "$stack" | jq -r '.script')

  log_human "Processing stack: $name"

  # Check condition
  if [ "$SKIP_UNCHANGED" == "true" ] && [ "$COMMAND" == "up" ]; then
    if ! should_deploy_stack "$stack"; then
      log_human "Stack $name: SKIPPED (no changes)"
      result=$(jq -n --arg name "$name" '{name: $name, status: "skipped", reason: "no_changes"}')
      RESULTS+=("$result")
      continue
    fi
  fi

  stack_start=$(date +%s%3N)
  script_path="$SCRIPT_DIR/$path/$script"

  # Execute stack
  execute_stack "$name" "$script_path" "$COMMAND" "$TIMEOUT"
  exit_code=$?

  stack_end=$(date +%s%3N)
  duration=$((stack_end - stack_start))

  # Build result
  if [ $exit_code -eq 0 ]; then
    log_human "Stack $name: SUCCESS (${duration}ms)"
    result=$(jq -n --arg name "$name" --argjson duration "$duration" \
      '{name: $name, status: "success", duration_ms: $duration}')
  else
    log_human "Stack $name: FAILED (exit code: $exit_code)"
    error_raw=$(echo "$output" | tail -10 | tr '\n' ' ' | cut -c1-500)
    result=$(jq -n --arg name "$name" --argjson duration "$duration" \
      --argjson exit_code "$exit_code" --arg error "$error_raw" \
      '{name: $name, status: "failed", duration_ms: $duration, exit_code: $exit_code, error: $error}')
  fi

  RESULTS+=("$result")

done < <(jq -c '.stacks[]' "$CONFIG_FILE")

# ==============================================================================
# Summary & Output
# ==============================================================================

total=${#RESULTS[@]}
success=0
failed=0
skipped=0

for result in "${RESULTS[@]}"; do
  stack_status=$(echo "$result" | jq -r '.status')
  case "$stack_status" in
    "success") ((success++)) ;;
    "failed") ((failed++)) ;;
    "skipped") ((skipped++)) ;;
  esac
done

executed=$((total - skipped))
if [ $executed -eq 0 ]; then
  status="skipped"
elif [ $failed -eq 0 ]; then
  status="success"
elif [ $success -eq 0 ] && [ $skipped -eq 0 ]; then
  status="failed"
else
  status="partial"
fi

log_human "Deploy complete: $success success, $failed failed, $skipped skipped (of $total total)"

# Output JSON
stacks_json=$(printf '%s\n' "${RESULTS[@]}" | jq -s '.')

jq -n \
  --arg project "$PROJECT" \
  --arg version "$VERSION" \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg commit "$COMMIT" \
  --arg command "$COMMAND" \
  --arg status "$status" \
  --argjson stacks "$stacks_json" \
  --argjson total "$total" \
  --argjson success "$success" \
  --argjson failed "$failed" \
  --argjson skipped "$skipped" \
  '{
    project: $project,
    version: $version,
    timestamp: $timestamp,
    commit: $commit,
    command: $command,
    status: $status,
    stacks: $stacks,
    summary: {total: $total, success: $success, failed: $failed, skipped: $skipped}
  }'

[ "$status" = "success" ] && exit 0
[ "$status" = "skipped" ] && exit 0
[ "$status" = "partial" ] && exit 1
exit 2
