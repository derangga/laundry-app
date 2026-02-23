# Phase 15: httpOnly Cookie for Refresh Token

**Goal**: Store the refresh token in an httpOnly cookie (set by the backend) instead of relying on the frontend to store it in localStorage. This eliminates XSS risk for the long-lived refresh token. The access token remains in-memory on the frontend, sent via `Authorization: Bearer` header — unchanged.

**Prerequisites**: Auth system complete (phases 3, 6)

**Complexity**: Medium

**Motivation**: The current backend returns `refreshToken` in the JSON response body. If the frontend stores it in localStorage, any XSS attack can exfiltrate the long-lived token. By having the backend set the refresh token as an httpOnly cookie (`SameSite=Strict`), JavaScript cannot access it — and the strict same-site policy provides CSRF protection (acceptable for a staff/admin-only app).

**Security model after this change**:
- Refresh token in httpOnly cookie → immune to XSS (JS cannot read `document.cookie`)
- `SameSite=Strict` → CSRF protection (cookie never sent on cross-site requests)
- Access token in memory → short-lived (15min), not persisted
- No additional CSRF token mechanism needed

---

## Tasks

### Task 15.1: Add `CORS_ORIGIN` to `ServerConfig`

**Modify `backend/src/configs/env.ts`:**

Add `corsOrigin` to `ServerConfig`:

```typescript
corsOrigin: Config.string('CORS_ORIGIN').pipe(Config.withDefault('http://localhost:5173')),
```

Cookies with `credentials: true` require a specific CORS origin (not wildcard `*`).

### Task 15.2: Rewrite `CookieHelper.ts`

**Modify `backend/src/http/CookieHelper.ts`:**

Replace the manual `formatCookie` / `Set-Cookie` header approach with Effect Platform's native APIs:
- `HttpApp.appendPreResponseHandler` — registers a callback that modifies the HTTP response after the handler returns data (same FiberRef-based pattern used by `securitySetCookie` internally)
- `HttpServerResponse.setCookie` — type-safe cookie setting with `Cookie["options"]`

New exports:
- **`setRefreshTokenCookie(refreshToken: string)`** — calls `appendPreResponseHandler` to set the cookie with: `httpOnly: true`, `secure: isProduction`, `sameSite: 'strict'`, `path: '/api/auth'`, `maxAge: '7 days'`
- **`clearRefreshTokenCookie`** — calls `appendPreResponseHandler` to clear the cookie (same options, `maxAge: '0 seconds'`)
- **`extractRefreshTokenFromCookie`** — keep existing implementation unchanged (already used by handlers)

Remove dead code: `setAuthCookies`, `clearAuthCookies`, `formatCookie`, `getEnvBasedCookieOptions`, `CookieOptions` interface.

Cookie path is `/api/auth` (not `/api/auth/refresh`) so it covers both `/api/auth/refresh` and `/api/auth/logout`.

Example implementation:

```typescript
import { HttpApp, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, Option } from 'effect'
import { ServerConfig } from '@configs/env'

export const setRefreshTokenCookie = (refreshToken: string) =>
  Effect.gen(function* () {
    const { nodeEnv } = yield* ServerConfig
    const isProduction = nodeEnv === 'production'

    yield* HttpApp.appendPreResponseHandler((_request, response) =>
      HttpServerResponse.setCookie(response, 'refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: '7 days',
      })
    )
  })

export const clearRefreshTokenCookie = Effect.gen(function* () {
  const { nodeEnv } = yield* ServerConfig
  const isProduction = nodeEnv === 'production'

  yield* HttpApp.appendPreResponseHandler((_request, response) =>
    HttpServerResponse.setCookie(response, 'refreshToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: '0 seconds',
    })
  )
})

// extractRefreshTokenFromCookie stays unchanged
```

### Task 15.3: Update Auth Handlers

**Modify `backend/src/handlers/AuthHandlers.ts`:**

Import `setRefreshTokenCookie` and `clearRefreshTokenCookie` from `CookieHelper`.

**Login handler**: After `loginUseCase.execute(payload)`, add `yield* setRefreshTokenCookie(result.refreshToken)` before returning `result`.

**Refresh handler**: After `refreshUseCase.execute(...)`, add `yield* setRefreshTokenCookie(result.refreshToken)` to set the rotated token cookie.

**Logout handler**: After `logoutUseCase.execute(...)`, add `yield* clearRefreshTokenCookie` before returning `result`.

The `refreshToken` field stays in the `AuthResponse` JSON body for backward compatibility. The cookie is the authoritative storage — the frontend ignores the body value.

### Task 15.4: Make `RefreshTokenInput.refreshToken` Optional

**Modify `backend/src/domain/Auth.ts`:**

```typescript
// Before:
export class RefreshTokenInput extends Schema.Class<RefreshTokenInput>('RefreshTokenInput')({
  refreshToken: Schema.String,
}) {}

// After:
export class RefreshTokenInput extends Schema.Class<RefreshTokenInput>('RefreshTokenInput')({
  refreshToken: Schema.optional(Schema.String),
}) {}
```

This allows `POST /api/auth/refresh` to be called with an empty body `{}` when the cookie is present. The handler already has fallback logic: cookie first, then body.

### Task 15.5: Configure CORS with Credentials

**Modify `backend/src/main.ts`:**

Replace default CORS:
```typescript
Layer.provide(HttpApiBuilder.middlewareCors()),
```

With configured CORS:
```typescript
Layer.provide(
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const { corsOrigin } = yield* ServerConfig
      return HttpApiBuilder.middlewareCors({
        allowedOrigins: [corsOrigin],
        credentials: true,
      })
    })
  )
),
```

`HttpApiBuilder.middlewareCors` accepts `{ allowedOrigins, credentials }` options. This sets `Access-Control-Allow-Credentials: true` and uses a specific origin (not `*`).

### Task 15.6: Update Environment Files

**Modify `backend/.env.example`, `backend/.env`, `backend/.env.production`:**

Add:
```
CORS_ORIGIN=http://localhost:5173
```

### Task 15.7: Update Test Fixtures

**Modify `backend/test/api/fixtures.ts`:**

Add `CORS_ORIGIN` to `TestConfigProvider` map so tests that resolve `ServerConfig` (used inside `setRefreshTokenCookie`) don't fail:

```typescript
['CORS_ORIGIN', 'http://localhost:3000'],
```

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `backend/src/configs/env.ts` — add `corsOrigin` to `ServerConfig` |
| Modify | `backend/src/http/CookieHelper.ts` — rewrite with Effect Platform APIs |
| Modify | `backend/src/handlers/AuthHandlers.ts` — set/clear cookies in login, refresh, logout |
| Modify | `backend/src/domain/Auth.ts` — make `RefreshTokenInput.refreshToken` optional |
| Modify | `backend/src/main.ts` — configure CORS with credentials |
| Modify | `backend/.env.example` — add `CORS_ORIGIN` |
| Modify | `backend/.env` — add `CORS_ORIGIN` |
| Modify | `backend/.env.production` — add `CORS_ORIGIN` |
| Modify | `backend/test/api/fixtures.ts` — add `CORS_ORIGIN` to test config |

## Acceptance Criteria

- [ ] Login response includes `Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=604800`
- [ ] Refresh endpoint accepts empty body `{}` when cookie is present
- [ ] Refresh response sets rotated refresh token cookie
- [ ] Logout response clears refresh token cookie (`Max-Age=0`)
- [ ] Refresh with body `{ "refreshToken": "..." }` still works (backward compat)
- [ ] CORS preflight returns `Access-Control-Allow-Credentials: true` with specific origin (not `*`)
- [ ] Dead code removed from `CookieHelper.ts` (`setAuthCookies`, `clearAuthCookies`, `formatCookie`)
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes

## Verification

1. **Typecheck**: `cd backend && bun run typecheck`
2. **Tests**: `cd backend && bun run test`
3. **Manual cookie test**:
   ```bash
   # Login — verify Set-Cookie header
   curl -v -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@laundry.com","password":"password123"}'
   # Expect: Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=604800

   # Refresh via cookie — empty body
   curl -v -X POST http://localhost:3000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -H "Cookie: refreshToken=<token>" \
     -d '{}'
   # Expect: 200 + new Set-Cookie

   # Logout via cookie
   curl -v -X POST http://localhost:3000/api/auth/logout \
     -H "Authorization: Bearer <access-token>" \
     -H "Cookie: refreshToken=<token>" \
     -H "Content-Type: application/json" \
     -d '{}'
   # Expect: 200 + Set-Cookie with Max-Age=0
   ```
4. **CORS**: `curl -v -X OPTIONS http://localhost:3000/api/auth/login -H "Origin: http://localhost:5173"` — verify `Access-Control-Allow-Credentials: true` and specific origin
5. **Backward compat**: Refresh with body `{ "refreshToken": "..." }` still works (fallback logic)

## Dependencies

- Existing: `ServerConfig`, `CookieHelper`, `AuthHandlers`, `AuthApi`, `HttpApiBuilder.middlewareCors`
- Effect Platform APIs: `HttpApp.appendPreResponseHandler`, `HttpServerResponse.setCookie` (confirmed in `@effect/platform@0.72.2`)
- No new packages needed

## Impact on Frontend

After this phase, the frontend auth strategy changes:
- **Refresh token**: No longer stored in localStorage. The browser automatically sends the httpOnly cookie on requests to `/api/auth/*`
- **API client**: Must add `credentials: 'include'` to all fetch calls
- **Refresh flow**: `POST /api/auth/refresh` with empty body `{}` — cookie sent automatically
- **Logout flow**: `POST /api/auth/logout` with `{ logoutAll }` only — no refreshToken in body
- **Token store**: Remove `getRefreshToken()`, `setRefreshToken()`. `clearTokens()` only clears access token from memory

See also: documentation updates needed in `docs/ADR_FRONTEND.md` (Decision 1), `docs/frontend_roadmap/phase_01.md`, `docs/shared/phase_01.md`, and `docs/CONTEXT.md`.
