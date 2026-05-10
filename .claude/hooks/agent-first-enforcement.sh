#!/usr/bin/env bash
# Hook: Block main-thread Edit/Write to source domains; force delegation to a developer agent.
# Sub-agents are detected by transcript_path containing "/subagents/".
#
# Fail-open on parse errors: log to stderr and exit 0. A corrupted hook must never lock the session.

set -uo pipefail

INPUT=$(cat)

# Parse with jq, fail open on any error
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null) || {
  echo "agent-first-enforcement: jq failed to parse input — failing open" >&2
  exit 0
}
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0

# Not an Edit/Write tool — allow
case "$TOOL_NAME" in
  Edit | Write | NotebookEdit) ;;
  *) exit 0 ;;
esac

# Empty file path — can't decide, fail open
[[ -z "$FILE_PATH" ]] && exit 0

# Sub-agent caller — allow (transcript path lives under */subagents/agent-*.jsonl)
if [[ "$TRANSCRIPT" == */subagents/* ]]; then
  exit 0
fi

# Main thread caller — check path
# Resolve to repo-relative if absolute
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
case "$FILE_PATH" in
  "$REPO_ROOT"/*) REL="${FILE_PATH#"$REPO_ROOT"/}" ;;
  /*) exit 0 ;;  # absolute path outside repo — not our concern
  *) REL="$FILE_PATH" ;;
esac

# Backend source tree — block main thread
if [[ "$REL" == backend/src/* ]]; then
  cat >&2 <<EOF
BLOCKED: main thread cannot Edit/Write to backend/src/**.

  File: $REL
  Fix: spawn the 'backend-developer' sub-agent via the Task tool. The sub-agent
       follows the gateway-backend skill and will be reviewed by effect-reviewer.

This rule comes from .claude/hooks/agent-first-enforcement.sh (per ADR_AI_ORCHESTRATION).
EOF
  exit 2
fi

# Frontend source tree — frontend-developer not yet implemented in v1; allow with a warning.
# (When the frontend lane lands, change this branch to mirror the backend/src/ block.)
if [[ "$REL" == frontend/src/* ]]; then
  exit 0
fi

# Anything else — allow
exit 0
