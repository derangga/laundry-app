# Project Overview — laundry-app

A laundry management web app for managing customers, orders, services, payments, and analytics. Web only.

## Monorepo Structure (Bun workspace)

- `packages/shared/src/` — Shared domain models (DTOs, branded IDs, enums) used by both backend and frontend
  - `common/`, `user.ts`, `auth.ts`, `customer.ts`, `service.ts`, `order.ts`, `analytics.ts`, `receipt.ts`
- `backend/src/` — Effect-TS backend
  - `domain/` — Backend-only error types + re-exports from @laundry-app/shared
  - `usecase/` — Business logic (Effect.Service pattern)
  - `repositories/` — Database access (SQL queries, no ORM)
  - `handlers/` — Route handler implementations
  - `api/` — HttpApi route definitions
  - `middleware/` — AuthMiddleware (JWT verification)
  - `configs/` — Environment variable parsing
  - `http/` — HTTP server setup, router
  - `main.ts` — Entry point
- `frontend/src/` — TanStack Start / React frontend
  - `routes/` — TanStack Router file-based routes
  - `components/` — React components
  - `data/` — Data fetching, API clients
  - `lib/` — Utilities
  - `hooks/`, `api/`, `domain/`, `integrations/`

## Tech Stack

- **Runtime**: Bun
- **Backend**: Effect TypeScript (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Frontend**: TanStack Start (React), Tailwind CSS v4
- **Shared**: `@laundry-app/shared` (imported via `workspace:*`)
- **Database**: PostgreSQL (direct SQL, no ORM)
- **Auth**: JWT access tokens + refresh tokens in httpOnly cookies
- **Observability**: OpenTelemetry, Prometheus, Loki, Grafana

## AI Orchestration

Uses deterministic AI orchestration via the `orchestrate` skill (16-phase workflow). Main thread coordinates only — source edits are delegated to `backend-developer` and `frontend-developer` sub-agents. Reviewer agents (`effect-reviewer`, `frontend-reviewer`) audit changes.
