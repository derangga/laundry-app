# Suggested Commands

## Development
- `bun run dev` — Start backend + frontend in parallel (from repo root)
- `bun run dev:backend` — Start backend only
- `bun run dev:frontend` — Start frontend only (Vite on port 3100)

## Build
- `bun run build` — Build both backend and frontend
- `bun run build:backend` — Build backend only
- `bun run build:frontend` — Build frontend only

## Type Checking
- `bun run typecheck` — Type-check both
- `bun run typecheck:backend` — Backend only
- `bun run typecheck:frontend` — Frontend only (prettier --check)

## Testing
- `cd backend && bun run test` — Run backend tests (Vitest)
- `cd frontend && bun run test` — Run frontend tests (Vitest)

## Linting & Formatting
- `bun run lint` — Lint frontend (ESLint)
- `bun run format` — Format both (Prettier)

## Database Migrations
- `cd backend && bun run migrate:up` — Run migrations
- `cd backend && bun run migrate:down` — Rollback migrations

## System Utilities (macOS/Darwin)
- `git` — Version control
- `ls` — List files
- `find` / `grep` — Search (prefer Serena symbolic tools for code)
- `bun` — Package manager and runtime
