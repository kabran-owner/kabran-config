#!/usr/bin/env bash
# ==============================================================================
# Kabran Traceability Core - Shared Functions
# Part of @kabran-owner/kabran-config
# Implements PROP-006: JSDoc Traceability Tags
# ==============================================================================

# Version - Dynamically resolve from package.json
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_PKG_JSON="$_SCRIPT_DIR/../../../package.json"
if [ -f "$_PKG_JSON" ]; then
  TRACEABILITY_VERSION=$(grep '"version":' "$_PKG_JSON" | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')
else
  TRACEABILITY_VERSION="unknown"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

# ==============================================================================
# Logging Functions
# ==============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_section() {
  echo -e "\n${BLUE}====${NC} $1 ${BLUE}====${NC}"
}

# ==============================================================================
# Tag Patterns (PROP-006 Standard)
# ==============================================================================

# Valid @spec format: @spec SXX (ID only, not full name)
PATTERN_SPEC_VALID='@spec S[0-9]+'
PATTERN_SPEC_INVALID='@spec S[0-9]+-'

# Valid @implements format: @implements AC-XX or @implements SXX:AC-XX
PATTERN_IMPLEMENTS='@implements'

# Valid @task format: @task XXX-NNN
PATTERN_TASK='@task [A-Z]+-[0-9]+'

# Valid @prd format: @prd RF-XXX or @prd RNF-XXX
PATTERN_PRD='@prd R(N)?F-[0-9]+'

# ==============================================================================
# Validation Functions
# ==============================================================================

# Check if a file has @implements without @spec (integrity error)
# Usage: check_orphan_implements "path/to/file.ts"
# Returns: 0 if valid, 1 if orphan found
check_orphan_implements() {
  local file="$1"

  if grep -qE "$PATTERN_IMPLEMENTS" "$file" 2>/dev/null; then
    if ! grep -qE "$PATTERN_SPEC_VALID" "$file" 2>/dev/null; then
      return 1  # Orphan found
    fi
  fi
  return 0  # Valid
}

# Check if a file uses invalid @spec format (full name instead of ID)
# Usage: check_spec_format "path/to/file.ts"
# Returns: 0 if valid, 1 if invalid format found
check_spec_format() {
  local file="$1"

  if grep -qE "$PATTERN_SPEC_INVALID" "$file" 2>/dev/null; then
    return 1  # Invalid format
  fi
  return 0  # Valid
}

# Extract all @spec tags from a file
# Usage: extract_specs "path/to/file.ts"
extract_specs() {
  local file="$1"
  grep -oE '@spec S[0-9]+' "$file" 2>/dev/null | sed 's/@spec //' | sort -u
}

# Extract all @implements tags from a file
# Usage: extract_implements "path/to/file.ts"
extract_implements() {
  local file="$1"
  grep -oE '@implements [^*]+' "$file" 2>/dev/null | sed 's/@implements //' | tr ',' '\n' | sed 's/^ *//' | sort -u
}

# Count files with traceability tags
# Usage: count_tagged_files "path/to/search"
count_tagged_files() {
  local search_path="${1:-.}"
  grep -rl "@spec" --include="*.ts" --include="*.tsx" "$search_path" 2>/dev/null | wc -l
}

# Count total TypeScript files
# Usage: count_total_files "path/to/search"
count_total_files() {
  local search_path="${1:-.}"
  find "$search_path" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l
}
