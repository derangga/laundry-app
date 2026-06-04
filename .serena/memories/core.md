# Laundry App — Core

Bun workspace monorepo. Laundry management web app: customers, orders, services, payments, analytics.

## Workspace layout

```
packages/shared/src/   # Shared DTOs, branded IDs, enums — imported as @laundry-app/shared
packages/api-contract/ # Shared API contract — @laundry-app/api-contract
packages/observability/ # OTel instrumentation — @laundry-app/observability
backend/src/           # Effect-TS HTTP server (Bun)
frontend/src/          # TanStack Start / React app
```

Shared package changes dirty **both** backend and frontend (hook enforced).

## Module memories

- Backend structure, patterns, invariants: `mem:backend/core`
- Frontend structure, patterns, invariants: `mem:frontend/core`
- Tech stack versions: `mem:tech_stack`
- Dev/test/build commands: `mem:suggested_commands`
- Coding conventions: `mem:conventions`
- Task completion checklist: `mem:task_completion`

## Project-wide invariants

- Main thread (orchestrator) **cannot** Edit/Write `backend/src/**` or `frontend/src/**` — hook blocks it; delegate to `backend-developer` / `frontend-developer` agents.
- Never push directly to master. Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`.
- Plans for non-trivial work → `docs/plans/<NAME>_<DATE>.md`.
- `.data/manifest.yaml` mutations → delegate to `manifest-writer` agent only.
- `feedback-loop-stop.sh` hook refuses session end until every dirty domain has `reviewer_status` + `tests_status` = `PASS`.
