# Tech Stack

- **Runtime**: Bun (monorepo + backend)
- **Backend**: Effect-TS — `effect@^3.21`, `@effect/platform-bun`, `@effect/sql-pg`, `@effect/experimental`; jose for JWT
- **Frontend**: TanStack Start (`@tanstack/react-start@^1.132`), TanStack Router v1, TanStack Query v5, React 19, Tailwind CSS v4, shadcn/ui (radix-ui + class-variance-authority), Recharts, Vite 7
- **Shared**: `@laundry-app/shared` (workspace:_), `@laundry-app/api-contract` (workspace:_)
- **Database**: PostgreSQL — direct SQL, no ORM; `@effect/sql-pg`
- **Auth**: JWT access tokens + httpOnly cookie refresh tokens
- **Test**: Vitest (both backend `test:run` and frontend `test`)
- **Lint/Format**: ESLint (frontend), Prettier (both)
- **Git hooks**: Lefthook (`lefthook install` via `prepare`)
