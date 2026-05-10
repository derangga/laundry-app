# Task Completion Checklist — laundry-app

After completing any coding task, verify the following:

## Always

- [ ] Run `bun run typecheck` — both backend and frontend must pass
- [ ] Run tests for dirty domains:
  - Backend changes: `cd backend && bun run test:run`
  - Frontend changes: `cd frontend && bun run test`
- [ ] Run `bun run format` if code was modified

## Backend Changes (`backend/src/**` or `packages/shared/**`)

- [ ] Spawn `effect-reviewer` agent to audit Effect-TS patterns
- [ ] Reviewer writes PASS/FAIL verdict to `.data/feedback-loop.json`
- [ ] All dirty domains have `reviewer_status: PASS` and `tests_status: PASS`

## Frontend Changes (`frontend/src/**` or `packages/shared/**`)

- [ ] Spawn `frontend-reviewer` agent to audit TanStack/React patterns
- [ ] Reviewer writes PASS/FAIL verdict to `.data/feedback-loop.json`
- [ ] All dirty domains have `reviewer_status: PASS` and `tests_status: PASS`

## Shared Package Changes

- [ ] Both backend and frontend are checked (shared package dirties both)

## Orchestration State

- [ ] `.data/manifest.yaml` is updated via `manifest-writer` agent at each phase transition
- [ ] `.data/feedback-loop.json` shows all domains passing before session ends

## Git

- [ ] Changes are on a feature/fix/refactor branch (never directly on master)
- [ ] Run `gitnexus_detect_changes()` before committing to verify scope
