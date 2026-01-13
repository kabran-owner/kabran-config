#!/usr/bin/env bash
# ==============================================================================
# Kabran Traceability Coverage Report
# Part of @kabran-owner/kabran-config
# Implements PROP-006: JSDoc Traceability Tags
#
# Generates a report of spec coverage in the codebase.
# Shows which specs have code implementing them and which ACs are covered.
# ==============================================================================

set -euo pipefail

# Source core functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=traceability-core.sh
source "$SCRIPT_DIR/traceability-core.sh"

# ==============================================================================
# Configuration
# ==============================================================================

SEARCH_PATH="${1:-.}"
SPEC_FILTER="${2:-}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"

# ==============================================================================
# Report Functions
# ==============================================================================

# Generate report for a specific spec
report_spec() {
  local spec="$1"
  local files

  files=$(grep -rl "@spec $spec" --include="*.ts" --include="*.tsx" "$SEARCH_PATH" 2>/dev/null || true)

  if [ -z "$files" ]; then
    return
  fi

  echo ""
  echo "=== $spec ==="
  echo ""
  echo "Files:"
  echo "$files" | while read -r file; do
    [ -n "$file" ] && echo "  - $file"
  done

  echo ""
  echo "ACs Implemented:"
  echo "$files" | while read -r file; do
    [ -n "$file" ] && extract_implements "$file"
  done | sort -u | while read -r ac; do
    [ -n "$ac" ] && echo "  - $ac"
  done
}

# Generate summary report
report_summary() {
  log_section "Traceability Coverage Report v${TRACEABILITY_VERSION}"
  log_info "Search path: $SEARCH_PATH"
  echo ""

  local total_files
  local tagged_files
  local specs

  total_files=$(count_total_files "$SEARCH_PATH")
  tagged_files=$(count_tagged_files "$SEARCH_PATH")

  echo "## Overview"
  echo ""
  echo "| Metric | Value |"
  echo "|--------|-------|"
  echo "| Total TypeScript files | $total_files |"
  echo "| Files with @spec | $tagged_files |"

  if [ "$total_files" -gt 0 ]; then
    local coverage=$((tagged_files * 100 / total_files))
    echo "| Coverage | $coverage% |"
  fi

  echo ""
  echo "## Specs Found"
  echo ""

  # Find all unique specs
  specs=$(grep -roh '@spec S[0-9]*' --include="*.ts" --include="*.tsx" "$SEARCH_PATH" 2>/dev/null | sed 's/@spec //' | sort -u || true)

  if [ -z "$specs" ]; then
    echo "No @spec tags found in codebase."
    return
  fi

  echo "$specs" | while read -r spec; do
    if [ -n "$spec" ]; then
      local file_count
      file_count=$(grep -rl "@spec $spec" --include="*.ts" --include="*.tsx" "$SEARCH_PATH" 2>/dev/null | wc -l)
      echo "- **$spec**: $file_count files"
    fi
  done
}

# Generate detailed report for all specs
report_detailed() {
  report_summary

  echo ""
  echo "## Detailed Coverage"

  local specs
  specs=$(grep -roh '@spec S[0-9]*' --include="*.ts" --include="*.tsx" "$SEARCH_PATH" 2>/dev/null | sed 's/@spec //' | sort -u || true)

  if [ -n "$specs" ]; then
    echo "$specs" | while read -r spec; do
      [ -n "$spec" ] && report_spec "$spec"
    done
  fi
}

# Generate JSON report
report_json() {
  local total_files
  local tagged_files
  local specs

  total_files=$(count_total_files "$SEARCH_PATH")
  tagged_files=$(count_tagged_files "$SEARCH_PATH")
  specs=$(grep -roh '@spec S[0-9]*' --include="*.ts" --include="*.tsx" "$SEARCH_PATH" 2>/dev/null | sed 's/@spec //' | sort -u || true)

  local coverage=0
  if [ "$total_files" -gt 0 ]; then
    coverage=$((tagged_files * 100 / total_files))
  fi

  echo "{"
  echo "  \"version\": \"${TRACEABILITY_VERSION}\","
  echo "  \"searchPath\": \"$SEARCH_PATH\","
  echo "  \"totalFiles\": $total_files,"
  echo "  \"taggedFiles\": $tagged_files,"
  echo "  \"coverage\": $coverage,"
  echo "  \"specs\": ["

  local first=true
  if [ -n "$specs" ]; then
    echo "$specs" | while read -r spec; do
      if [ -n "$spec" ]; then
        local file_count
        file_count=$(grep -rl "@spec $spec" --include="*.ts" --include="*.tsx" "$SEARCH_PATH" 2>/dev/null | wc -l)
        if [ "$first" = true ]; then
          first=false
        else
          echo ","
        fi
        echo -n "    { \"id\": \"$spec\", \"files\": $file_count }"
      fi
    done
  fi

  echo ""
  echo "  ]"
  echo "}"
}

# ==============================================================================
# Help
# ==============================================================================

show_help() {
  cat << EOF
Kabran Traceability Coverage Report v${TRACEABILITY_VERSION}

Usage: coverage-report.sh [path] [spec] [options]

Arguments:
  path              Directory to scan (default: current directory)
  spec              Filter by specific spec ID (e.g., S25)

Environment Variables:
  OUTPUT_FORMAT     Output format: text, detailed, json (default: text)

Examples:
  coverage-report.sh ./src
  coverage-report.sh ./src S25
  OUTPUT_FORMAT=json coverage-report.sh ./src
  OUTPUT_FORMAT=detailed coverage-report.sh ./src

Output Formats:
  text              Summary with spec counts
  detailed          Full breakdown with files and ACs per spec
  json              Machine-readable JSON output

EOF
}

# ==============================================================================
# Entry Point
# ==============================================================================

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  show_help
  exit 0
fi

# Handle specific spec filter
if [ -n "$SPEC_FILTER" ]; then
  report_spec "$SPEC_FILTER"
  exit 0
fi

# Generate report based on format
case "$OUTPUT_FORMAT" in
  json)
    report_json
    ;;
  detailed)
    report_detailed
    ;;
  *)
    report_summary
    ;;
esac
