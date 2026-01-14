#!/usr/bin/env bash
# ==============================================================================
# Kabran Deploy Core - Shared Functions
# Part of @kabran-tecnologia/kabran-config
# ==============================================================================

# ==============================================================================
# Portable Timeout Detection
# ==============================================================================

# Detect timeout command (GNU vs BSD)
TIMEOUT_CMD="timeout"
if ! command -v timeout &>/dev/null; then
  if command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD="gtimeout"
  else
    TIMEOUT_CMD=""
  fi
fi

# ==============================================================================
# Logging Functions
# ==============================================================================

# Logging (stderr to avoid polluting JSON stdout)
log_human() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Error with JSON output
json_error() {
  echo "{\"error\": \"$1\", \"status\": \"failed\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
  exit 2
}

# ==============================================================================
# Path Change Detection
# ==============================================================================

# Check if paths changed since BASE_REF
# Usage: check_paths_changed '["apps/api/", "packages/"]'
# Returns: 0 if changes detected, 1 if no changes
check_paths_changed() {
  local paths_json="$1"
  local paths_count
  paths_count=$(echo "$paths_json" | jq -r 'length')

  if [ "$paths_count" -eq 0 ]; then
    return 0
  fi

  cd "$PROJECT_ROOT" || return 1

  if ! git rev-parse "${DEPLOY_BASE_REF:-HEAD~1}" &>/dev/null; then
    log_human "Base ref ${DEPLOY_BASE_REF:-HEAD~1} not found, assuming changes"
    return 0
  fi

  while IFS= read -r path_pattern; do
    path_pattern=$(echo "$path_pattern" | tr -d '"')

    if git diff --quiet "${DEPLOY_BASE_REF:-HEAD~1}" HEAD -- "$path_pattern" 2>/dev/null; then
      continue
    else
      log_human "Changes detected in: $path_pattern"
      return 0
    fi
  done < <(echo "$paths_json" | jq -r '.[]')

  log_human "No changes detected in monitored paths"
  return 1
}

# ==============================================================================
# Stack Condition Evaluation
# ==============================================================================

# Evaluate stack condition
# Usage: should_deploy_stack "$stack_json"
# Returns: 0 if should deploy, 1 if should skip
should_deploy_stack() {
  local stack="$1"
  local condition
  condition=$(echo "$stack" | jq -r '.condition // empty')

  if [ -z "$condition" ] || [ "$condition" == "null" ]; then
    return 0
  fi

  local condition_type
  condition_type=$(echo "$condition" | jq -r '.type // empty')

  case "$condition_type" in
    "path_changed")
      local paths
      paths=$(echo "$condition" | jq -c '.paths // []')
      check_paths_changed "$paths"
      return $?
      ;;
    "always")
      return 0
      ;;
    "never")
      return 1
      ;;
    *)
      log_human "Unknown condition type: $condition_type, assuming deploy"
      return 0
      ;;
  esac
}

# ==============================================================================
# Stack Execution
# ==============================================================================

# Execute stack script with timeout
# Usage: execute_stack "$name" "$script_path" "$command" "$timeout"
# Returns: exit code, sets $output variable
execute_stack() {
  local name="$1"
  local script_path="$2"
  local command="$3"
  local timeout="${4:-300}"

  if [ -x "$script_path" ]; then
    if [ -n "$TIMEOUT_CMD" ]; then
      output=$($TIMEOUT_CMD "$timeout" "$script_path" "$command" 2>&1)
      exit_code=$?
      if [ $exit_code -eq 124 ]; then
        output="Script timed out after ${timeout}s: $script_path"
      fi
    else
      # No timeout available, run directly
      log_human "Warning: timeout command not available, running without timeout"
      output=$("$script_path" "$command" 2>&1)
      exit_code=$?
    fi
  elif [ -f "$script_path" ]; then
    output="Script exists but is not executable: $script_path"
    exit_code=126
  else
    output="Script not found: $script_path"
    exit_code=127
  fi

  return $exit_code
}
