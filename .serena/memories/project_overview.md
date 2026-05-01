# Laundry App — Project Overview

## Purpose
Laundry management web application for managing customers, orders, services, payments, and analytics. Web only.

## Tech Stack
- **Runtime**: Bun
- **Monorepo**: Bun workspaces with 4 packages: `packages/shared`, `packages/observability`, `backend`, `frontend`
- **Backend**: Effect TypeScript (`@effect/platform-bun`, `@effect/sql-pg`, `effect/Schema`)
- **Frontend**: TanStack Start (React 19), TanStack Router, TanStack Query, TanStack Table, Tailwind CSS v4, shadcn/ui (Radix UI), Recharts
- **Shared**: `@laundry-app/shared` — domain models (DTOs, branded IDs, enums) shared between backend & frontend
- **Database**: PostgreSQL (direct SQL via `@effect/sql-pg`, no ORM)
- **Auth**: JWT access tokens + refresh tokens in httpOnly cookies
- **Testing**: Vitest (both backend and frontend), Testing Library (frontend)
- **OS**: Darwin (macOS)

## Project Structure
```
packages/shared/src/   # Shared domain models
backend/src/
  domain/              # Error types + re-exports from shared
  usecase/             # Business logic (Effect.Service pattern)
  repositories/        # Database access (SQL queries)
  handlers/            # Route handler implementations
  api/                 # HttpApi route definitions
  middleware/           # AuthMiddleware (JWT)
  configs/             # Env var parsing
  http/                # HTTP server setup, router
  main.ts              # Entry point
frontend/src/
  routes/              # TanStack Router file-based routes
  components/          # React components
  data/                # Data fetching, API clients
  lib/                 # Utilities
```
