# Suggested Commands — laundry-app

All commands run from repo root unless noted. Use `rtk` prefix (token-optimized proxy).

## Development

```bash
bun run dev          # Start backend + frontend in parallel
bun run build        # Build both
bun run typecheck    # Type-check both
bun run format       # Format both
bun run lint         # Lint frontend
```

## Testing

```bash
# Backend tests (run from backend/)
cd backend && bun run test:run   # Run tests (NOT bun run test)

# Frontend tests
cd frontend && bun run test
```

## Database Migrations

```bash
cd backend && bun run migrate:up
cd backend && bun run migrate:down
```

## Git Workflow

- Never push directly to master — always create a branch
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Plans for non-trivial work in `docs/plans/<NAME>_<DATE>.md`

## CLI Tools

- `rtk` — Token-optimized CLI proxy (use instead of raw shell commands)
- `rtk gain` — Show token savings analytics
- `rtk discover` — Analyze Claude Code history for missed opportunities
