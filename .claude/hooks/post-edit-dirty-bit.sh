#!/usr/bin/env bash
# Hook: After Edit/Write to a routed source tree, set the corresponding dirty bit
# in .data/feedback-loop.json so the Stop hook can refuse exit until reviewed.
#
# Path → domain mapping (matches .data/SCHEMA.md):
#   backend/src/**, packages/shared/** → dirty_domains.backend = true
#   frontend/src/**                    → dirty_domains.frontend = true (deferred to frontend slice)
#
# Fail-open on any error: log to stderr, exit 0. PostToolUse hooks must not break the session.

set -uo pipefail

INPUT=$(cat)

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
STATE_DIR="$REPO_ROOT/.data"
STATE_FILE="$STATE_DIR/feedback-loop.json"

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || {
  echo "post-edit-dirty-bit: jq failed — failing open" >&2
  exit 0
}
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

case "$TOOL_NAME" in
  Edit | Write | NotebookEdit) ;;
  *) exit 0 ;;
esac

[[ -z "$FILE_PATH" ]] && exit 0

# Resolve to repo-relative
case "$FILE_PATH" in
  "$REPO_ROOT"/*) REL="${FILE_PATH#"$REPO_ROOT"/}" ;;
  /*) exit 0 ;;
  *) REL="$FILE_PATH" ;;
esac

# Decide which domains this edit dirties.
# packages/shared/** is consumed by both sides — mark both dirty so both
# reviewers see it and both test suites run. Conservative but correct.
DOMAINS=()
case "$REL" in
  backend/src/*) DOMAINS=("backend") ;;
  frontend/src/*) DOMAINS=("frontend") ;;
  packages/shared/*) DOMAINS=("backend" "frontend") ;;
  *) exit 0 ;;  # unrouted path — no dirty bit
esac

# Initialize state file if missing or corrupted
mkdir -p "$STATE_DIR"
DEFAULT='{"version":1,"dirty_domains":{"backend":false,"frontend":false},"domain_status":{"backend":{"reviewer_status":"PENDING","reviewer_notes":"","tests_status":"PENDING","tests_notes":""},"frontend":{"reviewer_status":"PENDING","reviewer_notes":"","tests_status":"PENDING","tests_notes":""}}}'

if [[ ! -f "$STATE_FILE" ]] || ! jq -e . "$STATE_FILE" >/dev/null 2>&1; then
  echo "$DEFAULT" >"$STATE_FILE"
fi

# Set dirty bits for each routed domain. Reset both reviewer_status and
# tests_status to PENDING since the domain has new uncommitted changes.
for DOMAIN in "${DOMAINS[@]}"; do
  TMP=$(mktemp)
  if jq --arg d "$DOMAIN" \
    '.dirty_domains[$d] = true | .domain_status[$d].reviewer_status = "PENDING" | .domain_status[$d].tests_status = "PENDING"' \
    "$STATE_FILE" >"$TMP" 2>/dev/null; then
    mv "$TMP" "$STATE_FILE"
  else
    rm -f "$TMP"
    echo "post-edit-dirty-bit: jq update for domain=$DOMAIN failed — continuing" >&2
  fi
done

exit 0
