# Style and Conventions — laundry-app

## Language & Formatting

- TypeScript throughout (backend + frontend + shared)
- Prettier for formatting (`.prettierrc` at root)
- File encoding: utf-8

## Naming Conventions

- **DB columns**: `snake_case` — domain model property names must match DB column names exactly
- **TypeScript**: camelCase for variables/functions, PascalCase for types/classes

## Code Rules

1. **No `SELECT *`** — Always use explicit column lists in SQL queries; explicit `RETURNING` clauses too.
2. **Shared models in `packages/shared/`** — All request/response DTOs, branded IDs, and enums go there. Backend `domain/` contains error classes and re-exports. Never define data models inside `usecase/`.
3. **Snake_case DB columns** — Domain model property names must match database column names exactly.
4. **Typed errors** — Use domain-specific error classes (e.g., `CustomerNotFound`). Error handler middleware maps them to HTTP responses.

## Effect-TS Patterns

- Services use `Effect.Service` pattern
- Errors use `Schema.TaggedError`
- Layer composition for dependency injection
- `HttpApi` for route definitions

## Frontend Patterns

- TanStack Router for file-based routing
- TanStack Query for server state
- shadcn/ui components
- Tailwind CSS v4 for styling

## Comments

- Default to no comments; only add when WHY is non-obvious
- No multi-paragraph docstrings or multi-line comment blocks
