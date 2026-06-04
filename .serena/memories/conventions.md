# Conventions

## Naming / Structure

- DB columns: `snake_case`; domain model property names must match DB column names exactly.
- All request/response DTOs, branded IDs, enums → `packages/shared/src/`. Never in `usecase/`.
- Backend `domain/` = error classes + re-exports from `@laundry-app/shared`.

## SQL

- **No `SELECT *`** — always explicit column lists.
- Always use explicit `RETURNING` clauses.

## Errors

- Domain-specific error classes (e.g. `CustomerNotFound`). Error-handler middleware maps them to HTTP responses.

## Effect-TS (backend)

- Services: `Effect.Service` pattern.
- Errors: `Schema.TaggedError`.
- Layer composition in `http/` router setup.
- See `docs/CONTEXT.md` for detailed Effect patterns and middleware wiring.

## Frontend

- File-based routing via TanStack Router (`frontend/src/routes/`).
- Data fetching via TanStack Query; API clients in `frontend/src/data/`.
- UI: shadcn/ui components (radix-ui primitives + Tailwind v4).
- Path alias: `#/*` → `./src/*`.

## AI Orchestration

- `orchestrate` skill auto-invoked for any non-trivial coding task.
- Main thread = coordinator only; implementation delegated to developer sub-agents.
- Reviewer sub-agents write PASS/FAIL to `.data/feedback-loop.json`.
