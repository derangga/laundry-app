#!/usr/bin/env bash
# Hook: Block session Stop until every dirty domain has BOTH reviewer_status = PASS
# AND tests_status = PASS. On a clean exit, reset .data/feedback-loop.json to defaults.
#
# Fail-open on parse errors: log to stderr, exit 0. A corrupted state file must never lock the session.

set -uo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
STATE_FILE="$REPO_ROOT/.data/feedback-loop.json"
DEFAULT='{"version":1,"dirty_domains":{"backend":false,"frontend":false},"domain_status":{"backend":{"reviewer_status":"PENDING","reviewer_notes":"","tests_status":"PENDING","tests_notes":""},"frontend":{"reviewer_status":"PENDING","reviewer_notes":"","tests_status":"PENDING","tests_notes":""}}}'

# No state file → no constraint
[[ -f "$STATE_FILE" ]] || exit 0

# Validate JSON; fail open if corrupted
if ! jq -e . "$STATE_FILE" >/dev/null 2>&1; then
  echo "feedback-loop-stop: state file is corrupted — failing open" >&2
  exit 0
fi

# Enumerate dirty domains and capture both reviewer_status and tests_status
REPORT=$(jq -r '
  . as $root
  | .dirty_domains | to_entries[]
  | select(.value == true)
  | .key as $d
  | "\($d)|\($root.domain_status[$d].reviewer_status)|\($root.domain_status[$d].tests_status)"
' "$STATE_FILE" 2>/dev/null) || REPORT=""

if [[ -z "$REPORT" ]]; then
  # No dirty domains — clean exit. Reset state.
  echo "$DEFAULT" >"$STATE_FILE"
  exit 0
fi

# Build a list of remediation lines for any domain missing PASS on either gate
NON_PASS=""
while IFS='|' read -r domain rev_status tests_status; do
  [[ -z "$domain" ]] && continue
  case "$domain" in
    backend) reviewer="effect-reviewer" ;;
    frontend) reviewer="frontend-reviewer" ;;
    *) reviewer="${domain}-reviewer" ;;
  esac
  if [[ "$tests_status" != "PASS" ]]; then
    NON_PASS+="  - $domain tests: $tests_status (spawn ${domain}-developer; typecheck + tests must pass)"$'\n'
  fi
  if [[ "$rev_status" != "PASS" ]]; then
    NON_PASS+="  - $domain review: $rev_status (spawn $reviewer; verdict must be PASS)"$'\n'
  fi
done <<<"$REPORT"

if [[ -n "$NON_PASS" ]]; then
  cat >&2 <<EOF
BLOCKED: cannot end session — dirty domains have unresolved gates:

$NON_PASS
Both gates must report PASS for every dirty domain before this hook allows Stop.
- tests_status is set deterministically by the SubagentStop hook (developer-tests-pass.sh).
- reviewer_status is set by the reviewer agent's exit protocol.

This rule comes from .claude/hooks/feedback-loop-stop.sh (per ADR_AI_ORCHESTRATION).
EOF
  exit 2
fi

# All dirty domains pass both gates — allow exit and reset state.
echo "$DEFAULT" >"$STATE_FILE"
exit 0
