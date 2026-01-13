#!/usr/bin/env bash
# ==============================================================================
# Kabran Traceability Validator
# Part of @kabran-owner/kabran-config
# Implements PROP-006: JSDoc Traceability Tags
#
# Validates FORMAT of traceability tags (not presence).
# Tags are optional - this script only checks:
# 1. @implements without @spec (integrity error)
# 2. @spec with full name instead of ID (format warning)
# ==============================================================================

set -uo pipefail

# Source core functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=traceability-core.sh
source "$SCRIPT_DIR/traceability-core.sh"

# ==============================================================================
# Configuration
# ==============================================================================

SEARCH_PATH="${1:-.}"
STRICT_MODE="${STRICT_MODE:-false}"
EXIT_CODE=0

# ==============================================================================
# Main Validation
# ==============================================================================

main() {
  log_section "Traceability Validation v${TRACEABILITY_VERSION}"
  log_info "Search path: $SEARCH_PATH"
  log_info "Strict mode: $STRICT_MODE"

  local orphan_count=0
  local format_count=0
  local files_checked=0

  # Find all TypeScript files
  local files
  files=$(find "$SEARCH_PATH" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null || true)

  if [ -z "$files" ]; then
    log_info "No TypeScript files found"
    return 0
  fi

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    files_checked=$((files_checked + 1))

    # Check for orphan @implements (ERROR)
    if ! check_orphan_implements "$file"; then
      log_error "Orphan @implements (no @spec): $file"
      orphan_count=$((orphan_count + 1))
    fi

    # Check for invalid @spec format (WARNING)
    if ! check_spec_format "$file"; then
      log_warn "Invalid @spec format (use ID only): $file"
      format_count=$((format_count + 1))
    fi

  done <<< "$files"

  # Summary
  log_section "Validation Summary"
  log_info "Files checked: $files_checked"

  if [ "$orphan_count" -gt 0 ]; then
    log_error "Orphan @implements found: $orphan_count"
    EXIT_CODE=1
  else
    log_success "No orphan @implements found"
  fi

  if [ "$format_count" -gt 0 ]; then
    log_warn "Invalid @spec format: $format_count"
    if [ "$STRICT_MODE" = "true" ]; then
      EXIT_CODE=1
    fi
  else
    log_success "All @spec tags use correct format"
  fi

  # Coverage stats (informational)
  local tagged_files
  local total_files
  tagged_files=$(count_tagged_files "$SEARCH_PATH")
  total_files=$(count_total_files "$SEARCH_PATH")

  if [ "$total_files" -gt 0 ]; then
    local coverage=$((tagged_files * 100 / total_files))
    log_info "Traceability coverage: $tagged_files/$total_files files ($coverage%)"
  fi

  return $EXIT_CODE
}

# ==============================================================================
# Help
# ==============================================================================

show_help() {
  cat << EOF
Kabran Traceability Validator v${TRACEABILITY_VERSION}

Usage: validate-traceability.sh [path] [options]

Arguments:
  path              Directory to validate (default: current directory)

Environment Variables:
  STRICT_MODE       If "true", format warnings become errors (default: false)

Exit Codes:
  0                 Validation passed
  1                 Validation failed (orphan @implements or strict mode violations)

Examples:
  validate-traceability.sh ./src
  STRICT_MODE=true validate-traceability.sh ./src

Tags Validated (PROP-006):
  @spec S25         Link to spec (ID only, not full name)
  @implements AC-01 Acceptance criteria implemented
  @task AGT-123     Link to Linear task
  @prd RF-007       Link to PRD requirement

Rules:
  - All tags are OPTIONAL
  - @implements WITHOUT @spec is an ERROR
  - @spec with full name (S25-name) is a WARNING

EOF
}

# ==============================================================================
# Entry Point
# ==============================================================================

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  show_help
  exit 0
fi

main
exit $EXIT_CODE
