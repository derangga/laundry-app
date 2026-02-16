# CLAUDE.md

Laundry management web app — customers, orders, services, payments, analytics. Web only.

## Tech Stack

- **Runtime**: Bun
- **Backend**: Effect TypeScript (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Frontend**: TanStack Start (React), Tailwind CSS v4
- **Database**: PostgreSQL (direct SQL, no ORM)
- **Auth**: JWT access tokens + refresh tokens in httpOnly cookies

## Project Structure

```
backend/src/
  domain/        # Entities, DTOs, error types (Model.Class, Schema.Struct)
  usecase/       # Business logic (Effect.Service pattern)
  repositories/  # Database access (SQL queries)
  handlers/      # Route handler implementations
  api/           # HttpApi route definitions
  middleware/    # AuthMiddleware (JWT verification)
  configs/       # Environment variable parsing
  http/          # HTTP server setup, router
  main.ts        # Entry point

frontend/src/
  routes/        # TanStack Router file-based routes
  components/    # React components
  data/          # Data fetching, API clients
  lib/           # Utilities
```

## Documentation

Read these for detailed context:
- `docs/PRD.md` — Product requirements, API specs, frontend routes
- `docs/ADR_BACKEND.md` — Architecture decisions, database schema
- `docs/CONTEXT.md` — Effect patterns, service composition, middleware, layer setup
- `.claude/agents/effect-coder.md` — Effect TypeScript best practices

## Dev Commands (from repo root)

- `bun run dev` — Start backend + frontend in parallel
- `bun run build` — Build both
- `bun run typecheck` — Type-check both
- `bun run format` — Format both
- `bun run lint` — Lint frontend
- Backend tests: `cd backend && bun run test`
- Frontend tests: `cd frontend && bun run test`
- Migrations: `cd backend && bun run migrate:up` / `migrate:down`

## Coding Rules

1. **No `SELECT *`** — Always use explicit column lists in SQL queries. Use explicit `RETURNING` clauses too.
2. **Domain models in `domain/`** — All request/response types, DTOs, and error classes go in `backend/src/domain/`. Never define data models inside `usecase/`.
3. **Snake_case DB columns** — Domain model property names must match database column names exactly (`snake_case`).
4. **Typed errors** — Use domain-specific error classes (e.g., `CustomerNotFound`). The error handler middleware maps them to HTTP responses.

## Git Workflow

- **Never push directly to master** — always create a branch
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Plans for non-trivial work go in `docs/plans/<NAME>_<DATE>.md`
