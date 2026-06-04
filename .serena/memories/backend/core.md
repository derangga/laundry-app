# Backend — Core

Entry: `backend/src/main.ts`

## Source layout

```
backend/src/
  api/           # HttpApi route definitions (Effect HttpApi)
  configs/       # Env var parsing (Effect Config)
  domain/        # Error classes + re-exports from @laundry-app/shared
  handlers/      # Route handler implementations
  http/          # HTTP server setup, router, layer composition
  middleware/    # AuthMiddleware (JWT verification via jose)
  repositories/  # DB access — raw SQL via @effect/sql-pg; no ORM
  usecase/       # Business logic (Effect.Service pattern)
  SqlClient.ts   # SqlClient layer setup
  main.ts        # Entry point
```

## Key patterns

- `Effect.Service` for all services (usecase + repositories).
- `Schema.TaggedError` for domain errors; middleware maps them to HTTP status codes.
- Layer wiring in `http/`; `SqlClient.ts` provides the DB layer.
- No `SELECT *`; always explicit columns + `RETURNING`.
- DB column names = snake_case matching domain model property names exactly.

## Dependencies (notable)

- `effect@^3.21`, `@effect/platform-bun`, `@effect/sql-pg`, `@effect/experimental`
- `jose` for JWT
- `@laundry-app/shared` (workspace:_), `@laundry-app/api-contract` (workspace:_)

## Tests

```bash
cd backend && bun run test:run   # Vitest non-interactive
```

See `mem:conventions` for coding rules and `mem:task_completion` for done checklist.
