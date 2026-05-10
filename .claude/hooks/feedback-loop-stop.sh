#!/usr/bin/env bash
# Hook: Block session Stop until every dirty domain has reviewer_status = PASS.
# On a clean exit (no dirty domains, or all PASS), reset .data/feedback-loop.json to defaults.
#
# Fail-open on parse errors: log to stderr, exit 0. A corrupted state file must never lock the session.

set -uo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
STATE_FILE="$REPO_ROOT/.data/feedback-loop.json"
DEFAULT='{"version":1,"dirty_domains":{"backend":false,"frontend":false},"domain_status":{"backend":{"reviewer_status":"PENDING","reviewer_notes":""},"frontend":{"reviewer_status":"PENDING","reviewer_notes":""}}}'

# No state file → no constraint
[[ -f "$STATE_FILE" ]] || exit 0

# Validate JSON; fail open if corrupted
if ! jq -e . "$STATE_FILE" >/dev/null 2>&1; then
  echo "feedback-loop-stop: state file is corrupted — failing open" >&2
  exit 0
fi

# Find dirty domains whose reviewer_status is not PASS
BLOCKED=$(jq -r '
  .dirty_domains
  | to_entries[]
  | select(.value == true)
  | .key as $d
  | (.[$d]) // null
  | $d
' "$STATE_FILE" 2>/dev/null) || exit 0

# More straightforward jq: enumerate dirty domains and join with status
REPORT=$(jq -r '
  [
    .dirty_domains | to_entries[]
    | select(.value == true)
    | .key
  ] as $dirty
  | $dirty[] as $d
  | "\($d):\(.domain_status[$d].reviewer_status)"
' "$STATE_FILE" 2>/dev/null) || REPORT=""

if [[ -z "$REPORT" ]]; then
  # No dirty domains — clean exit. Reset state.
  echo "$DEFAULT" >"$STATE_FILE"
  exit 0
fi

# Check for any non-PASS
NON_PASS=""
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  domain="${line%%:*}"
  status="${line##*:}"
  if [[ "$status" != "PASS" ]]; then
    case "$domain" in
      backend) reviewer="effect-reviewer" ;;
      frontend) reviewer="frontend-reviewer" ;;
      *) reviewer="${domain}-reviewer" ;;
    esac
    NON_PASS+="  - $domain: $status (spawn $reviewer)"$'\n'
  fi
done <<<"$REPORT"

if [[ -n "$NON_PASS" ]]; then
  cat >&2 <<EOF
BLOCKED: cannot end session — dirty domains lack reviewer PASS:

$NON_PASS
Spawn the reviewer agent for each dirty domain. The reviewer must write its
verdict to .data/feedback-loop.json (domain_status.<domain>.reviewer_status = "PASS")
before this hook will allow Stop.

This rule comes from .claude/hooks/feedback-loop-stop.sh (per ADR_AI_ORCHESTRATION).
EOF
  exit 2
fi

# All dirty domains have PASS — allow exit and reset state.
echo "$DEFAULT" >"$STATE_FILE"
exit 0
