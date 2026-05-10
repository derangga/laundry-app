#!/usr/bin/env bash
# Hook: SubagentStop. For every dirty domain whose tests_status is PENDING,
# run the domain's typecheck + test suite and write the result deterministically
# to .data/feedback-loop.json. Block the sub-agent's exit on FAIL.
#
# This converts the agent-prompt rule "Fix until green" into a kernel-level
# constraint the LLM cannot rationalize past.
#
# Skips if no domain is dirty, or if all dirty domains already have tests_status
# != PENDING (PASS or FAIL was already recorded by an earlier SubagentStop).
#
# Fail-open on infrastructure errors (missing tools, missing state file, parse
# failures): log to stderr and exit 0. A broken hook must never lock the session.

set -uo pipefail

REPO=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
STATE_FILE="$REPO/.data/feedback-loop.json"

# No state → nothing to enforce
[[ -f "$STATE_FILE" ]] || exit 0
jq -e . "$STATE_FILE" >/dev/null 2>&1 || {
  echo "developer-tests-pass: state file corrupted — failing open" >&2
  exit 0
}

# Find domains where dirty=true AND tests_status=PENDING
PENDING_DOMAINS=$(jq -r '
  .dirty_domains
  | to_entries[]
  | select(.value == true)
  | .key
' "$STATE_FILE" 2>/dev/null) || exit 0

[[ -z "$PENDING_DOMAINS" ]] && exit 0

write_status() {
  local domain="$1" status="$2" notes="$3"
  local tmp
  tmp=$(mktemp)
  jq --arg d "$domain" --arg s "$status" --arg n "$notes" \
    '.domain_status[$d].tests_status = $s | .domain_status[$d].tests_notes = $n' \
    "$STATE_FILE" >"$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE" || rm -f "$tmp"
}

run_backend() {
  local cur_status
  cur_status=$(jq -r '.domain_status.backend.tests_status // "PENDING"' "$STATE_FILE")
  [[ "$cur_status" != "PENDING" ]] && return 0  # already evaluated, skip

  local typecheck_log tests_log
  typecheck_log=$(mktemp)
  tests_log=$(mktemp)

  if ! (cd "$REPO/backend" && bun run typecheck) >"$typecheck_log" 2>&1; then
    write_status backend FAIL "typecheck failed"
    cat >&2 <<EOF
BLOCKED: backend typecheck failed — backend-developer must fix before exit.

$(tail -25 "$typecheck_log")

Re-run inside the backend agent: \`cd backend && bun run typecheck\`. Fix every error, then exit again.
EOF
    rm -f "$typecheck_log" "$tests_log"
    return 2
  fi

  if ! (cd "$REPO/backend" && bun run test:run) >"$tests_log" 2>&1; then
    write_status backend FAIL "tests failed"
    cat >&2 <<EOF
BLOCKED: backend tests failed — backend-developer must fix before exit.

$(tail -40 "$tests_log")

Re-run inside the backend agent: \`cd backend && bun run test:run\`. Fix every failing test, then exit again.
EOF
    rm -f "$typecheck_log" "$tests_log"
    return 2
  fi

  write_status backend PASS "typecheck + tests passing"
  rm -f "$typecheck_log" "$tests_log"
  return 0
}

run_frontend() {
  local cur_status
  cur_status=$(jq -r '.domain_status.frontend.tests_status // "PENDING"' "$STATE_FILE")
  [[ "$cur_status" != "PENDING" ]] && return 0  # already evaluated, skip

  # Note: `bun run lint` is intentionally NOT enforced here — eslint is declared
  # in frontend/package.json scripts but is not actually installed as a
  # dependency, so the command fails with "command not found". Re-enable lint
  # in this hook once eslint is added to frontend/package.json devDependencies.

  local typecheck_log tests_log
  typecheck_log=$(mktemp)
  tests_log=$(mktemp)

  if ! (cd "$REPO/frontend" && bun run typecheck) >"$typecheck_log" 2>&1; then
    write_status frontend FAIL "typecheck failed"
    cat >&2 <<EOF
BLOCKED: frontend typecheck failed — frontend-developer must fix before exit.

$(tail -25 "$typecheck_log")

Re-run inside the frontend agent: \`cd frontend && bun run typecheck\`. Fix every error, then exit again.
EOF
    rm -f "$typecheck_log" "$tests_log"
    return 2
  fi

  if ! (cd "$REPO/frontend" && bun run test) >"$tests_log" 2>&1; then
    write_status frontend FAIL "tests failed"
    cat >&2 <<EOF
BLOCKED: frontend tests failed — frontend-developer must fix before exit.

$(tail -40 "$tests_log")

Re-run inside the frontend agent: \`cd frontend && bun run test\`. Fix every failing test, then exit again.
EOF
    rm -f "$typecheck_log" "$tests_log"
    return 2
  fi

  write_status frontend PASS "typecheck + tests passing"
  rm -f "$typecheck_log" "$tests_log"
  return 0
}

OVERALL_RC=0
while IFS= read -r domain; do
  [[ -z "$domain" ]] && continue
  case "$domain" in
    backend)
      if ! run_backend; then OVERALL_RC=2; fi
      ;;
    frontend)
      if ! run_frontend; then OVERALL_RC=2; fi
      ;;
    *) ;;
  esac
done <<<"$PENDING_DOMAINS"

exit "$OVERALL_RC"
