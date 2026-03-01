# Phase 1: Auth Foundation

**Status**: ✅ Done

**Goal**: Build the authentication infrastructure — API client with token management, auth store, login page, and route protection scaffolding.

**Prerequisites**: Shared package phase must be complete (`docs/shared/phase_01.md`)

---

## Tasks

### 1.1 Create Token Store

**Create `frontend/src/lib/auth.ts`:**
- `getAccessToken(): string | null` — read from module-scoped variable
- `setAccessToken(token: string | null): void` — write to module-scoped variable
- `getRefreshToken(): string | null` — read from `localStorage.getItem('refreshToken')`
- `setRefreshToken(token: string | null): void` — write to localStorage (or remove if null)
- `clearTokens(): void` — clear both access token (memory) and refresh token (localStorage)

### 1.2 Create API Client

**Create `frontend/src/lib/api-client.ts`:**
- `ApiError` class with `status: number`, `code: string`, `message: string`
- `apiClient<T>(path: string, options?: RequestInit): Promise<T>` function:
  - Prepends base URL `http://localhost:3000`
  - Attaches `Authorization: Bearer <accessToken>` if token exists
  - Sets `Content-Type: application/json`
  - On 401 response: reads refreshToken from localStorage, calls `POST /api/auth/refresh` with body `{ refreshToken }`, updates both tokens, retries original request once
  - On failed refresh: calls `clearTokens()`, throws error
  - On non-OK response: parses error body, throws `ApiError`
- Convenience helpers: `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put<T>(path, body)`, `api.del<T>(path)`

### 1.3 Create Auth API Module

**Create `frontend/src/api/auth.ts`:**

Types (imported from `@laundry-app/shared`):
```typescript
import type {
  LoginInput,
  AuthenticatedUser,
  AuthResponse,
  LogoutResult,
} from '@laundry-app/shared'
```

Query keys:
```typescript
export const authKeys = {
  all: ['auth'] as const,
  user: ['auth', 'user'] as const,
}
```

Functions:
- `loginFn(input: LoginInput): Promise<AuthResponse>` — `POST /api/auth/login`
- `refreshFn(refreshToken: string): Promise<AuthResponse>` — `POST /api/auth/refresh` with body `{ refreshToken }`
- `logoutFn(refreshToken: string): Promise<LogoutResult>` — `POST /api/auth/logout` with body `{ refreshToken }`
- `getMeFn(): Promise<AuthenticatedUser>` — `GET /api/auth/me` (requires backend phase 14)

Hooks:
- `useCurrentUser()` — `useQuery({ queryKey: authKeys.user, queryFn: getMeFn, staleTime: Infinity, retry: false })`. Calls `GET /api/auth/me` to get user data. Falls back gracefully if endpoint returns 401 (not authenticated)
  - **Note**: `staleTime: Infinity` means the query won't auto-refetch. The Phase 2 dashboard layout's `beforeLoad` must manually trigger `fetchQuery` to ensure fresh user data on page loads and handle authentication flow correctly.
- `useLogin()` — `useMutation` that calls `loginFn`, on success: store tokens, invalidate `authKeys.user` query (triggers re-fetch from `/me`), navigate to `/`, toast "Welcome back, {name}"
- `useLogout()` — `useMutation` that calls `logoutFn`, on settle: clear tokens, remove user from query cache, navigate to `/login`

**Note**: `GET /api/auth/me` is being added in backend phase 14 (`docs/backend_roadmap/phase_14.md`). If the backend endpoint is not yet available, `useCurrentUser()` can temporarily set user data manually from login/refresh responses instead of calling `/me`.

### 1.4 Create Login Page

**Create `frontend/src/routes/login.tsx`:**
- Route: `createFileRoute('/login')`
- `beforeLoad`: attempt to refresh token from localStorage. If succeeds, `throw redirect({ to: '/' })`
- Component: centered layout with shadcn `Card` containing:
  - App title "Laundry Manager"
  - Email input (shadcn `Input`, type email, required)
  - Password input (shadcn `Input`, type password, required, min 8 chars)
  - Submit button (shadcn `Button`) with loading state during mutation
- On submit: call `useLogin()` mutation
- On error: Sonner toast with "Wrong email or password"
- On success: redirect handled by mutation's `onSuccess`

### 1.5 Update Root Layout

**Modify `frontend/src/routes/__root.tsx`:**
- Import and add `<Toaster />` from `#/components/ui/sonner` inside `<body>`, after `{children}`
- Remove `<Header />` import and usage (will be replaced by sidebar in Phase 2)
- Update page title from "TanStack Start Starter" to "Laundry Manager"

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/auth.ts` |
| Create | `src/lib/api-client.ts` |
| Create | `src/api/auth.ts` |
| Create | `src/routes/login.tsx` |
| Modify | `src/routes/__root.tsx` |

## Acceptance Criteria

- [x] Login page renders at `/login` with email and password fields
- [x] Submitting valid credentials stores accessToken in memory and refreshToken in localStorage
- [x] Submitting valid credentials redirects to `/`
- [x] Submitting invalid credentials shows Sonner toast "Wrong email or password"
- [x] `apiClient` attaches Bearer token to all requests
- [x] 401 responses trigger auto-refresh (POST /api/auth/refresh with body) and retry
- [x] Failed refresh clears all tokens and redirects to `/login`
- [x] Page refresh recovers session: reads refreshToken from localStorage → calls refresh → restores user
- [x] `useCurrentUser()` calls `GET /api/auth/me` and returns user data when authenticated, undefined when not
- [x] Toaster component renders in the root layout
- [x] `<Header />` removed from root layout

## Dependencies

- **Shared package**: `@laundry-app/shared` must be set up (`docs/shared/phase_01.md`)
