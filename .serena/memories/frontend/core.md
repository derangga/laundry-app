# Frontend — Core

Entry: `frontend/src/start.ts` → `frontend/src/router.tsx`

## Source layout

```
frontend/src/
  routes/           # TanStack Router file-based routes
  components/       # React components (shadcn/ui based)
  data/             # Data fetchers, API clients (TanStack Query)
  domain/           # Frontend-local domain types/utils
  hooks/            # Custom React hooks
  integrations/     # Third-party integrations
  lib/              # Utilities (cn, date helpers, etc.)
  test/             # Test helpers / MSW handlers
  routeTree.gen.ts  # Auto-generated route tree (do not edit)
  router.tsx        # Router instance setup
  styles.css        # Global Tailwind v4 styles
```

## Key patterns

- File-based routing: create files under `routes/` — `routeTree.gen.ts` is auto-generated.
- Data fetching: TanStack Query; query/mutation hooks in `data/` or `hooks/`.
- UI: shadcn/ui (radix-ui + Tailwind v4 + class-variance-authority); import from `#/components/ui/*`.
- Path alias: `#/*` → `./src/*`.
- React 19 + Vite 7; dev server port 3100.

## Testing

```bash
cd frontend && bun run test   # Vitest + Testing Library + jsdom + MSW
```

## Notable deps

- `@tanstack/react-start@^1.132`, `@tanstack/react-router@^1.132`, `@tanstack/react-query@^5`
- `tailwindcss@^4`, `radix-ui@^1.4`, `recharts@2.15`, `date-fns@^4`, `lucide-react`
- `msw@^2` for test mocking

See `mem:conventions` for coding rules and `mem:task_completion` for done checklist.
