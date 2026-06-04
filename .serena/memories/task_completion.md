# Task Completion Checklist

Run these after any code change before considering a task done:

1. **Type-check**: `bun run typecheck` (from repo root, checks both packages)
2. **Tests** (dirty domain only):
   - Backend change: `cd backend && bun run test:run`
   - Frontend change: `cd frontend && bun run test`
3. **Format**: `bun run format` (Prettier, both sides)
4. **Lint**: `bun run lint` (ESLint, frontend only)
5. **Reviewer**: spawn `effect-reviewer` (backend) or `frontend-reviewer` (frontend) — writes verdict to `.data/feedback-loop.json`; session won't close until PASS.

The `developer-tests-pass.sh` SubagentStop hook blocks sub-agent exit if typecheck or tests fail for a dirty domain — fix before exiting.
