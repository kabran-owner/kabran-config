#!/usr/bin/env bash
# ==============================================================================
# BATS Test Helpers
# ==============================================================================
# Common assertion functions for BATS tests

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
  else
    if [ "$output" != "$1" ]; then
      echo "Expected output: $1"
      echo "Actual output: $output"
      return 1
    fi
  fi
}

assert_line() {
  if [ "$1" = "--partial" ]; then
    if ! echo "$output" | grep -q "$2"; then
      echo "Expected line containing: $2"
      echo "Actual output: $output"
      return 1
    fi
  fi
}
