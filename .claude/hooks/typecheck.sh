#!/usr/bin/env bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Skip if no working-tree changes since last commit
git diff --quiet && exit 0

if ! OUTPUT=$(bun run typecheck 2>&1); then
  cat >&2 <<EOF
BLOCKED: typecheck failed before turn end.

$OUTPUT

Fix the type errors above before ending the turn.
EOF
  exit 2
fi

exit 0
