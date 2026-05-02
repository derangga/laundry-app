# Frontend Page Testing Guide

How to write page-level unit tests for the React/TanStack Start frontend.
Each interactive page (form, mutation, or branching UI state) gets one test
file that exercises the page exactly as a user would.

Read-only list/detail pages are skipped — TypeScript already covers them.

## Stack

- **Vitest** + jsdom — runner & DOM
- **@testing-library/react** + **@testing-library/user-event** — render & user simulation
- **MSW (Mock Service Worker)** — network-layer mocks
- **Real `routeTree.gen.ts`** + `createMemoryHistory` — pages run inside the actual router
- **Real `@laundry-app/shared` schemas** — MSW responses are decoded by the real `api-client`

Config lives in `frontend/vitest.config.ts`. Setup in `frontend/src/test/setup.ts`.

## Running

```bash
cd frontend
bun run test           # one-shot
bun run test --watch   # watch mode
```

## File layout

```
frontend/src/
  routes/
    login.tsx
    login.test.tsx           # ← co-located, sibling to the page
    _dashboard/
      services.tsx
      services.test.tsx
  test/
    setup.ts                 # MSW lifecycle, jsdom shims
    render.tsx               # renderWithRouter()
    server.ts                # MSW server (default handlers)
    request-recorder.ts      # captureRequests()
    devtools-stub.tsx        # devtools no-op for tests
    handlers/
      auth.ts                # default-authenticated user
      orders.ts
      services.ts
      …
    fixtures/
      user.ts                # fakeAuthResponse(), fakeAuthenticatedUser()
      …
```

The TanStack Router plugin is configured in `vite.config.ts` to ignore
`*.test.tsx` files (`routeFileIgnorePattern: '\\.test\\.'`), so tests
co-located in `routes/` don't get registered as routes.

## Anatomy of a page test

Use the `renderWithRouter` helper. Every test follows the same shape:

```tsx
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'

import { renderWithRouter } from '@/test/render'
import { server } from '@/test/server'
import { captureRequests } from '@/test/request-recorder'

describe('SomePage', () => {
  it('does the happy-path thing', async () => {
    const requests = captureRequests(server, 'POST', '/api/things')
    const { user, router } = await renderWithRouter({ initialPath: '/things/new' })

    await user.type(screen.getByLabelText(/name/i), 'My Thing')
    await user.click(screen.getByRole('button', { name: /create/i }))

    const matches = await screen.findAllByText(/created/i)
    expect(matches.length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/things')
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]?.body).toMatchObject({ name: 'My Thing' })
  })
})
```

See `frontend/src/routes/login.test.tsx` for the canonical reference.

## Rules

### Always

- **Co-locate** test files: `foo.tsx` ↔ `foo.test.tsx`.
- **`await renderWithRouter(...)`** — the helper is async because it awaits
  `router.load()` so matched routes are mounted before assertions.
- **Use `user-event`** (returned by the helper as `user`), never `fireEvent`.
- **Default-authenticated**: tests start logged in via the `/api/auth/me`
  default handler. Override with `server.use(...)` only when testing
  unauthenticated flows.
- **Assert on rendered DOM and on captured request bodies** (via
  `captureRequests`). These are user-visible behavior + the actual contract
  with the backend.
- **Override per-test handlers with `server.use(...)`** for failure cases.
  `setup.ts` resets handlers between tests automatically.
- **Use `findAllByText` for sonner toasts** — sonner duplicates content into
  a screen-reader live region, so `findByText` throws on multiple matches.

### Never

- Don't reach into `queryClient` to assert cache state. Render the next page
  and assert what the user sees instead.
- Don't write snapshot tests. Tailwind class strings churn constantly.
- Don't mock individual hooks (`useLogin`, etc.) or modules in `src/api/*`.
  MSW at the network layer is the only mocking boundary.
- Don't add `setTimeout` / arbitrary waits. Use `findBy*` and `waitFor`.
- Don't import the production `vite.config.ts` from `vitest.config.ts`.
  The Start plugin spins up a dev server.

## Adding a new page test

1. **Pick the page**: any route with a form, mutation, or branching UI.
2. **Create `<route>.test.tsx`** next to the page, mirroring `login.test.tsx`.
3. **Add MSW handlers** the page needs in `src/test/handlers/<domain>.ts`:
   - For new domains, also add a `fixtures/<domain>.ts` with factory
     functions like `fakeOrder()` that return shapes matching
     `@laundry-app/shared` schemas.
   - Wire the new handler array into `src/test/handlers/index.ts`.
4. **Default to success responses** in `src/test/handlers/`. Tests that need
   failures override per-test:
   ```ts
   server.use(http.post('*/api/things', () => HttpResponse.json({}, { status: 500 })))
   ```
5. **Run** `bun run test` and `bun run typecheck`.

## Common pitfalls

- **"Unable to find label …"** — usually means the route hasn't finished
  loading. You forgot `await renderWithRouter(...)` or you're querying
  before navigation completes (`router.state.location.pathname` not yet
  on the destination — wrap with `waitFor`).
- **"intercepted a request without a matching request handler"** — page is
  fetching something with no handler. Add a default handler returning empty
  data (or a fixture) in `src/test/handlers/<domain>.ts`.
- **"Found multiple elements with the text …"** — sonner toasts. Switch to
  `findAllByText` and assert `length > 0`.
- **"Devtools is not mounted"** — devtools modules are aliased to a stub in
  `vitest.config.ts`. If a new devtools package shows up, add it to the
  alias list and export the missing symbol from `src/test/devtools-stub.tsx`.
- **`matchMedia is not a function` / `ResizeObserver is not defined`** —
  shimmed in `setup.ts`. If a third-party component reaches for another
  browser API jsdom doesn't implement, shim it there.
- **Errors wrapped as `FiberFailure`** — `api-client` runs Effect via
  `Effect.runPromise`, which wraps failures in `FiberFailure`. Code like
  `error instanceof HttpError` in a mutation `onError` will never match.
  Test what the user actually sees, not what the code intends.

## Auth scenarios

| Scenario                      | How to set up                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Logged-in (default)           | Just call `renderWithRouter(...)` — `/api/auth/me` returns a fake admin.                                       |
| Logged-out                    | `server.use(http.get('*/api/auth/me', () => HttpResponse.json({}, { status: 401 })))`                          |
| Custom user (e.g. staff role) | `server.use(http.get('*/api/auth/me', () => HttpResponse.json(fakeAuthenticatedUser({ role: 'staff' }))))`     |
| Login flow itself             | Render `/login`. The default `POST /api/auth/login` handler succeeds; override with 401/400 for failure cases. |

## Determinism notes

- Each test gets a **fresh `QueryClient`** with `retry: false`,
  `staleTime: 0`, `gcTime: Infinity` — no cross-test cache leaks, no retry
  timer races.
- MSW `onUnhandledRequest: 'error'` — missing handlers fail fast instead of
  hitting the network.
- jsdom URL is set to `http://localhost:3100/` so relative-URL `fetch`
  resolves correctly.
