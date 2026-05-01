# Code Style & Conventions

## General
- **Language**: TypeScript (strict mode)
- **Formatter**: Prettier
- **Linter**: ESLint (frontend only)
- **Module system**: ES modules (`"type": "module"`)

## Backend Conventions
- **Effect patterns**: Effect.Service for business logic, Effect.gen for generators, Schema for validation
- **No `SELECT *`** — Always explicit column lists in SQL queries, explicit `RETURNING` clauses
- **Snake_case DB columns** — Domain model properties must match DB column names exactly
- **Typed errors** — Domain-specific error classes (e.g., `CustomerNotFound`), mapped to HTTP by error handler middleware
- **No data models in usecase/** — All DTOs, branded IDs, enums in `packages/shared/src/`
- **Path aliases**: `@domain`, `@usecase`, `@repositories`, `@api`, `@http`, `@configs`, `@shared`, `@middleware`, `@handlers`, `@infrastructure`

## Frontend Conventions
- **File-based routing**: TanStack Router
- **Data fetching**: TanStack Query
- **UI components**: shadcn/ui (Radix UI primitives) + Tailwind CSS v4
- **Import alias**: `#/*` maps to `./src/*`

## Git Workflow
- Never push directly to master — always create a branch
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Plans for non-trivial work go in `docs/plans/<NAME>_<DATE>.md`
