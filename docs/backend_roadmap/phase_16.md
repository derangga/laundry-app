# Phase 16: Documentation Updates for httpOnly Cookie Strategy

**Goal**: Update all frontend-facing documentation to reflect the httpOnly cookie refresh token strategy introduced in phase 15. These docs were written assuming the backend's cookie code was dead and that the frontend would use localStorage.

**Prerequisites**: Phase 15 (httpOnly Cookie for Refresh Token)

**Complexity**: Low

---

## Tasks

### Task 16.1: Update `docs/ADR_FRONTEND.md` — Decision 1

**Modify `docs/ADR_FRONTEND.md`, Decision 1: Authentication Strategy (lines 41–104):**

**Context section (lines 47–51):**
- Remove: `**setAuthCookies/clearAuthCookies are dead code** — the backend does NOT set httpOnly cookies`
- Add: `**Backend sets refresh token via httpOnly cookie** (Set-Cookie on login/refresh, SameSite=Strict, path /api/auth) — see docs/backend_roadmap/phase_15.md`
- Change: `Refresh endpoint accepts { refreshToken } in the request body` → `Refresh endpoint reads refresh token from httpOnly cookie (falls back to request body for backward compat)`

**Decision section (lines 53–60):**
- Remove: `Store the **refresh token in localStorage** — survives page refresh, 7-day lifetime`
- Add: `**Refresh token** managed by backend via httpOnly cookie — browser sends it automatically on requests to /api/auth/*`

**Rationale section (lines 62–67):**
- Remove: `**localStorage for refresh token**: The backend does not set httpOnly cookies, so the frontend must persist the refresh token somewhere to survive page refreshes. localStorage is the pragmatic choice for this app's threat model`
- Add: `**httpOnly cookie for refresh token**: Immune to XSS (JS cannot read document.cookie), SameSite=Strict provides CSRF protection, no manual token management code on the frontend`

**Implementation section (lines 69–75):**
- Remove `getRefreshToken()`, `setRefreshToken()` from `auth.ts` listing
- Update `clearTokens()` description: only clears access token from memory
- Add note: `apiClient uses credentials: 'include' on all fetch calls`

**Auth Flow section (lines 77–97):**
Replace with:
```
Page Load → GET /api/auth/me (if accessToken exists in memory)
  → Success: cache user in TanStack Query, proceed to dashboard
  → 401: POST /api/auth/refresh with empty body (cookie sent automatically)
    → Success: store accessToken in memory, cache user, proceed to dashboard
    → Failure: clear access token, redirect to /login

Login → POST /api/auth/login { email, password }
  → Success: store accessToken in memory (cookie set by backend), cache user, redirect to /
  → Failure: show Sonner toast "Wrong email or password"

API Request → attach Authorization: Bearer <accessToken>, credentials: 'include'
  → 401 Response: attempt refresh → retry original request
    → Refresh fails: clear access token, redirect to /login

Logout → POST /api/auth/logout with Bearer header (cookie sent automatically)
  → Clear access token, remove user from query cache, redirect to /login
```

**Alternatives Considered section (lines 99–103):**
- Remove: `**Cookie-only**: Backend doesn't set httpOnly cookies (dead code), so this isn't an option without backend changes`
- Add: `**localStorage for refresh token**: Considered initially when backend cookie code was inactive. Vulnerable to XSS — any injected script can exfiltrate the long-lived token`

### Task 16.2: Update `docs/frontend_roadmap/phase_01.md`

**Task 1.1 (Token Store, lines 13–18):**
- Remove: `getRefreshToken(): string | null — read from localStorage.getItem('refreshToken')`
- Remove: `setRefreshToken(token: string | null): void — write to localStorage (or remove if null)`
- Change: `clearTokens(): void — clear both access token (memory) and refresh token (localStorage)` → `clearTokens(): void — clear access token from memory`

**Task 1.2 (API Client, lines 24–30):**
- Add: `Includes credentials: 'include' on all fetch calls (sends httpOnly cookies)`
- Change: `On 401 response: reads refreshToken from localStorage, calls POST /api/auth/refresh with body { refreshToken }, updates both tokens, retries original request once` → `On 401 response: calls POST /api/auth/refresh with empty body {} (cookie sent automatically), updates access token in memory, retries original request once`
- Change: `On failed refresh: calls clearTokens(), throws error` → `On failed refresh: clears access token from memory, throws error`

**Task 1.3 (Auth API, lines 55–64):**
- Change: `refreshFn(refreshToken: string): Promise<AuthResponse> — POST /api/auth/refresh with body { refreshToken }` → `refreshFn(): Promise<AuthResponse> — POST /api/auth/refresh with empty body {} (cookie sent automatically)`
- Change: `logoutFn(refreshToken: string): Promise<LogoutResult> — POST /api/auth/logout with body { refreshToken }` → `logoutFn(logoutAll?: boolean): Promise<LogoutResult> — POST /api/auth/logout with body { logoutAll } (cookie sent automatically)`
- `useLogin()` onSuccess: change "store tokens" → "store accessToken in memory"
- `useLogout()`: change "calls logoutFn" → no refreshToken argument needed

**Task 1.4 (Login Page, line 72):**
- Change: `beforeLoad: attempt to refresh token from localStorage. If succeeds, throw redirect({ to: '/' })` → `beforeLoad: attempt POST /api/auth/refresh (cookie sent automatically). If succeeds, throw redirect({ to: '/' })`

**Acceptance Criteria (lines 103–113):**
- Change: `Submitting valid credentials stores accessToken in memory and refreshToken in localStorage` → `Submitting valid credentials stores accessToken in memory (refresh token set by backend via httpOnly cookie)`
- Change: `Page refresh recovers session: reads refreshToken from localStorage → calls refresh → restores user` → `Page refresh recovers session: calls POST /api/auth/refresh (cookie sent automatically) → restores user`
- Add: `apiClient includes credentials: 'include' on all requests`

### Task 16.3: Update `docs/shared/phase_01.md`

In the auth types listing (line 91 area) and type classification table (line 335 area), add a note next to `RefreshTokenInput`:

> `refreshToken` field is `Schema.optional(Schema.String)` — allows empty body when httpOnly cookie is present (see `docs/backend_roadmap/phase_15.md`)

### Task 16.4: Update `docs/CONTEXT.md`

Change line 511:
- Before: `- **Cookie**: httpOnly cookies for token storage`
- After: `- **Cookie**: Refresh token stored in httpOnly cookie (SameSite=Strict, path=/api/auth). Access token sent via Authorization Bearer header. CORS configured with credentials:true and specific allowedOrigins.`

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `docs/ADR_FRONTEND.md` — Decision 1 (auth strategy, flow, rationale, alternatives) |
| Modify | `docs/frontend_roadmap/phase_01.md` — token store, API client, auth API, login page, acceptance criteria |
| Modify | `docs/shared/phase_01.md` — RefreshTokenInput note |
| Modify | `docs/CONTEXT.md` — authentication cookie description |

## Acceptance Criteria

- [ ] `ADR_FRONTEND.md` no longer references localStorage for refresh token
- [ ] `ADR_FRONTEND.md` no longer mentions "dead code" for cookie helpers
- [ ] `ADR_FRONTEND.md` auth flow diagram reflects httpOnly cookie strategy
- [ ] `frontend_roadmap/phase_01.md` token store has no `getRefreshToken()`/`setRefreshToken()`
- [ ] `frontend_roadmap/phase_01.md` API client includes `credentials: 'include'`
- [ ] `frontend_roadmap/phase_01.md` refresh/logout functions don't pass refreshToken in body
- [ ] `shared/phase_01.md` notes `RefreshTokenInput.refreshToken` is optional
- [ ] `CONTEXT.md` accurately describes the cookie strategy

## Dependencies

- **Phase 15**: httpOnly Cookie for Refresh Token (backend code changes must be planned/documented first)
- No code changes — documentation only
