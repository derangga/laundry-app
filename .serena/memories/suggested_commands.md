# Suggested Commands

All commands use RTK proxy automatically (hook rewrites them). Run from repo root unless noted.

## Dev

```bash
bun run dev                     # backend + frontend in parallel
bun run dev:backend             # backend only (watch mode)
bun run dev:frontend            # frontend only (port 3100)
```

## Build / Type-check

```bash
bun run build                   # both
bun run typecheck               # both (tsc --noEmit)
```

## Test

```bash
cd backend && bun run test:run  # backend Vitest (non-interactive)
cd frontend && bun run test     # frontend Vitest run
```

## Lint / Format

```bash
bun run lint                    # frontend ESLint
bun run format                  # both (Prettier)
```

## Migrations

```bash
cd backend && bun run migrate:up
cd backend && bun run migrate:down
```

## Misc

```bash
bun run doctor                  # react-doctor diagnostics
lefthook install                # re-install git hooks (after fresh clone)
npx gitnexus analyze            # refresh GitNexus index when stale
```
