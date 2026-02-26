# Phase 1.1: Migrate to httpOnly Cookie Authentication

**Status**: ✅ COMPLETE (2026-02-26)

**Goal**: Simplify the frontend auth layer by removing all manual token management. Tokens are now stored in httpOnly cookies set by the backend — the browser sends them automatically, and JavaScript never touches them.

**Prerequisites**: Backend phase 15 complete (httpOnly cookie auth)

**Complexity**: Low-Medium

**Motivation**: Phase 1 stored the access token in memory and the refresh token in `localStorage`. While the in-memory access token was XSS-immune, the refresh token in `localStorage` was vulnerable. With backend phase 15 setting httpOnly cookies, the frontend no longer needs to store, read, or attach tokens. This dramatically simplifies the auth layer and eliminates XSS risk for both tokens.

---

## Tasks

### Task 1.1.1: Simplify `lib/auth.ts`

**Modify or delete `frontend/src/lib/auth.ts`:**

Remove all token management functions:
- `getAccessToken()` — no longer needed (cookie sent automatically)
- `setAccessToken()` — no longer needed (backend sets cookie)
- `getRefreshToken()` — no longer needed (cookie sent automatically)
- `setRefreshToken()` — no longer needed (backend sets cookie)
- `clearTokens()` — no longer needed (backend clears cookies on logout)

Either delete the file entirely or replace with a minimal comment:

```typescript
// Auth tokens are stored in httpOnly cookies managed by the backend.
// No client-side token management is needed.
// See docs/backend_roadmap/phase_15.md for cookie auth implementation.
```

### Task 1.1.2: Simplify `lib/api-client.ts`

**Modify `frontend/src/lib/api-client.ts`:**

- Remove all imports from `./auth` (`getAccessToken`, `setAccessToken`, `getRefreshToken`, `setRefreshToken`, `clearTokens`)
- Remove `Authorization: Bearer` header attachment — cookies are sent automatically
- Update `refreshTokens()`: POST with empty body `{}`, no token management on response
- Remove token storage from the refresh success path
- Ensure `credentials: 'include'` is set on all requests (should already be there)

Before:
```typescript
const headers: HeadersInit = { 'Content-Type': 'application/json' }
const token = getAccessToken()
if (token) headers['Authorization'] = `Bearer ${token}`
```

After:
```typescript
const headers: HeadersInit = { 'Content-Type': 'application/json' }
// No Authorization header needed — httpOnly cookies sent automatically
```

Before (refresh):
```typescript
const refreshToken = getRefreshToken()
const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ refreshToken }),
})
const data = await res.json()
setAccessToken(data.accessToken)
setRefreshToken(data.refreshToken)
```

After (refresh):
```typescript
const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({}),
})
// No token storage needed — new cookies set by backend via Set-Cookie headers
```

### Task 1.1.3: Simplify `api/auth.ts`

**Modify `frontend/src/api/auth.ts`:**

- Remove all imports from `@/lib/auth` (`getAccessToken`, `setAccessToken`, `getRefreshToken`, `setRefreshToken`, `clearTokens`)
- `refreshFn()`: no params, empty body `{}`
- `logoutFn()`: no params, empty body `{}`
- `useCurrentUser()`: remove `enabled: !!getAccessToken()` guard — always call `/api/auth/me`, let 401 trigger redirect
- `useLogin()`: remove `setAccessToken()`/`setRefreshToken()` calls from `onSuccess` — cookies set by backend
- `useLogout()`: remove `getRefreshToken()`/`clearTokens()` calls — just call the endpoint

Before:
```typescript
useLogin() onSuccess: (data) => {
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  queryClient.invalidateQueries({ queryKey: authKeys.user })
  navigate({ to: '/' })
}
```

After:
```typescript
useLogin() onSuccess: () => {
  // Cookies set by backend via Set-Cookie headers
  queryClient.invalidateQueries({ queryKey: authKeys.user })
  navigate({ to: '/' })
}
```

Before:
```typescript
useLogout() onSettled: () => {
  clearTokens()
  queryClient.removeQueries({ queryKey: authKeys.user })
  navigate({ to: '/login' })
}
```

After:
```typescript
useLogout() onSettled: () => {
  // Cookies cleared by backend via Set-Cookie with Max-Age=0
  queryClient.removeQueries({ queryKey: authKeys.user })
  navigate({ to: '/login' })
}
```

### Task 1.1.4: Update `login.tsx` `beforeLoad`

**Modify `frontend/src/routes/login.tsx`:**

Remove token-related logic from `beforeLoad`. Check auth via `getMeFn()` (cookie sent automatically):

Before:
```typescript
beforeLoad: async ({ context }) => {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    try {
      const result = await refreshFn(refreshToken)
      setAccessToken(result.accessToken)
      setRefreshToken(result.refreshToken)
      throw redirect({ to: '/' })
    } catch (e) {
      if (e instanceof Response) throw e
      clearTokens()
    }
  }
}
```

After:
```typescript
beforeLoad: async ({ context }) => {
  try {
    // Cookie sent automatically — if valid session exists, redirect to dashboard
    await context.queryClient.fetchQuery({
      queryKey: authKeys.user,
      queryFn: getMeFn,
    })
    throw redirect({ to: '/' })
  } catch (e) {
    if (e instanceof redirect) throw e
    // No valid session — show login form
  }
}
```

### Task 1.1.5: Update `_dashboard.tsx` `beforeLoad`

**Modify `frontend/src/routes/_dashboard.tsx`:**

Adjust auth check to use `getMeFn()` directly without token guards:

Before:
```typescript
beforeLoad: async ({ context }) => {
  const token = getAccessToken()
  if (!token) {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw redirect({ to: '/login' })
    try {
      const result = await refreshFn(refreshToken)
      setAccessToken(result.accessToken)
      setRefreshToken(result.refreshToken)
    } catch {
      clearTokens()
      throw redirect({ to: '/login' })
    }
  }
  // Fetch/cache user
  await context.queryClient.fetchQuery(...)
}
```

After:
```typescript
beforeLoad: async ({ context }) => {
  try {
    // Cookie sent automatically — fetch user to verify auth
    await context.queryClient.fetchQuery({
      queryKey: authKeys.user,
      queryFn: getMeFn,
    })
  } catch {
    // Not authenticated or session expired
    // Try refresh (cookie sent automatically)
    try {
      await refreshFn()
      await context.queryClient.fetchQuery({
        queryKey: authKeys.user,
        queryFn: getMeFn,
      })
    } catch {
      throw redirect({ to: '/login' })
    }
  }
}
```

---

## Files Summary

| Action | File |
|--------|------|
| Modify/Delete | `frontend/src/lib/auth.ts` — remove all token management functions |
| Modify | `frontend/src/lib/api-client.ts` — remove Bearer header, simplify refresh |
| Modify | `frontend/src/api/auth.ts` — remove token storage calls, simplify hooks |
| Modify | `frontend/src/routes/login.tsx` — simplify `beforeLoad` auth check |
| Modify | `frontend/src/routes/_dashboard.tsx` — simplify `beforeLoad` auth guard |

## Acceptance Criteria

- [x] No references to `getAccessToken`, `setAccessToken`, `getRefreshToken`, `setRefreshToken`, or `clearTokens` in the frontend codebase
- [x] No `Authorization: Bearer` header construction in `api-client.ts`
- [x] All API requests use `credentials: 'include'` (cookies sent automatically)
- [x] Login via browser: cookies visible in DevTools > Application > Cookies
- [x] Page refresh: no redirect to login (cookie persists across refreshes)
- [x] Logout: cookies cleared in DevTools
- [x] `useCurrentUser()` works without token guards
- [x] `bun run typecheck` passes for frontend
- [x] All existing frontend behavior (login, logout, page refresh, auto-refresh) works the same way from the user's perspective

## Dependencies

- **Backend phase 15**: Must be complete — backend sets httpOnly cookies on login/refresh/logout
- **Shared package**: `refreshToken` made optional in `RefreshTokenInput` (phase 15, task 15.5)

## Migration Notes

- This is a **non-breaking migration from the user's perspective** — login, logout, page refresh, and auto-refresh all work identically
- The only visible change is that tokens are no longer in localStorage (can verify in DevTools)
- If backend phase 15 is deployed but frontend phase 1.1 is not yet deployed, the frontend continues to work because the backend still returns tokens in the response body (backward compatible)
