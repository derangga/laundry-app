# CLAUDE.md

Laundry management web app — customers, orders, services, payments, analytics. Web only.
Bun workspace monorepo with `@laundry-app/shared` as the shared package (imported via `workspace:*`).

## Tech Stack

- **Runtime**: Bun
- **Backend**: Effect TypeScript (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Frontend**: TanStack Start (React), Tailwind CSS v4
- **Shared**: `@laundry-app/shared` — domain models shared between backend & frontend
- **Database**: PostgreSQL (direct SQL, no ORM)
- **Auth**: JWT access tokens + refresh tokens in httpOnly cookies

## Project Structure

```
packages/shared/src/  # Shared domain models (DTOs, branded IDs, enums) — used by both backend & frontend
  common/             # Shared transforms (DecimalNumber, DateTimeUtcString)
  user.ts             # User schemas (UserId, CreateUserInput, UserWithoutPassword, etc.)
  auth.ts             # Auth schemas (LoginInput, AuthResponse, etc.)
  customer.ts         # Customer schemas (CustomerId, CreateCustomerInput, etc.)
  service.ts          # Service schemas (ServiceId, UnitType, etc.)
  order.ts            # Order schemas (OrderId, OrderStatus, CreateOrderInput, etc.)
  analytics.ts        # Analytics schemas (WeeklyAnalyticsResponse, DashboardStatsResponse)
  receipt.ts          # Receipt schemas (ReceiptResponse, ReceiptItem)

backend/src/
  domain/        # Backend-only error types + re-exports from @laundry-app/shared
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
- Use available **skills** for framework-specific patterns (Effect, TanStack Router, TanStack Query, shadcn/ui, Tailwind, etc.)

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
2. **Shared models in `packages/shared/`** — All request/response DTOs, branded IDs, and enums go in `packages/shared/src/`. Backend `domain/` contains error classes and re-exports shared types. Never define data models inside `usecase/`.
3. **Snake_case DB columns** — Domain model property names must match database column names exactly (`snake_case`).
4. **Typed errors** — Use domain-specific error classes (e.g., `CustomerNotFound`). The error handler middleware maps them to HTTP responses.

## Git Workflow

- **Never push directly to master** — always create a branch
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Plans for non-trivial work go in `docs/plans/<NAME>_<DATE>.md`
