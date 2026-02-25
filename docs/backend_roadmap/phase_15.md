# Phase 15: httpOnly Cookie Authentication

**Goal**: Migrate token transport from response-body-only to httpOnly cookies. The backend sets `Set-Cookie` headers on login/refresh/logout while still returning tokens in the response body for backward compatibility with non-browser clients (curl, Postman).

**Prerequisites**: Auth system complete (phases 1-3), `GET /api/auth/me` endpoint (phase 14)

**Complexity**: Medium

**Motivation**: The frontend currently stores the refresh token in `localStorage`, which is vulnerable to XSS. Moving both tokens into httpOnly cookies eliminates client-side token management entirely. The browser stores and sends cookies automatically, and JavaScript cannot read them — providing maximum XSS protection. The backend already has unused cookie helpers in `CookieHelper.ts`; this phase activates and extends them.

---

## Tasks

### Task 15.1: Add `appendAuthCookies` / `appendClearAuthCookies` to CookieHelper

**Modify `backend/src/http/CookieHelper.ts`:**

Add two new functions using `HttpApp.appendPreResponseHandler` pattern. This lets handlers set cookies without directly constructing `HttpServerResponse`:

```typescript
export const appendAuthCookies = (accessToken: string, refreshToken: string) =>
  HttpApp.appendPreResponseHandler((response) =>
    Effect.succeed(
      response.pipe(
        HttpServerResponse.setHeader(
          'Set-Cookie',
          buildCookieHeaders(accessToken, refreshToken)
        )
      )
    )
  )

export const appendClearAuthCookies = () =>
  HttpApp.appendPreResponseHandler((response) =>
    Effect.succeed(
      response.pipe(
        HttpServerResponse.setHeader(
          'Set-Cookie',
          buildClearCookieHeaders()
        )
      )
    )
  )
```

Cookie attributes:
- `accessToken`: `HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=900` (15 min)
- `refreshToken`: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800` (7 days)

**Important changes:**
- Change refresh token cookie path from `/api/auth/refresh` to `/api/auth` so it's also sent to `/api/auth/logout`
- Mark existing `setAuthCookies()` and `clearAuthCookies()` as `@deprecated` — keep for backward compatibility during transition
- Add `extractAccessTokenFromCookie()` mirroring the existing `extractRefreshTokenFromCookie()` pattern

### Task 15.2: Update AuthMiddleware to Support Both Bearer and Cookie

**Modify `backend/src/middleware/AuthMiddleware.ts`:**

Add `HttpApiSecurity.apiKey({ key: 'accessToken', in: 'cookie' })` alongside existing `HttpApiSecurity.bearer`:

```typescript
export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()('AuthMiddleware', {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer,
    cookie: HttpApiSecurity.apiKey({ key: 'accessToken', in: 'cookie' }),
  },
}) {}

export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const jwtService = yield* JwtService

    const verifyToken = (tokenValue: string) =>
      Effect.gen(function* () {
        const payload = yield* jwtService
          .verifyAccessToken(tokenValue)
          .pipe(Effect.mapError((error) => new Unauthorized({ message: error.message })))

        return {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        } satisfies CurrentUserData
      })

    return {
      bearer: (token) => verifyToken(Redacted.value(token)),
      cookie: (token) => verifyToken(Redacted.value(token)),
    }
  })
)
```

- Both `AuthMiddleware` and `AuthAdminMiddleware` get dual security
- Bearer takes priority (backward compat with curl/Postman)
- Shared `verifyToken` helper eliminates duplication

### Task 15.3: Update AuthHandlers to Set/Clear Cookies

**Modify `backend/src/handlers/AuthHandlers.ts`:**

- **Login handler**: Call `appendAuthCookies(result.accessToken, result.refreshToken)` before returning
- **Refresh handler**: Call `appendAuthCookies` with the new tokens
- **Logout handler**: Call `appendClearAuthCookies()`
- Still return the full `AuthResponse` body for backward compatibility

```typescript
.handle('login', ({ payload }) =>
  Effect.gen(function* () {
    const authService = yield* AuthService
    const result = yield* authService.login(payload)
    yield* appendAuthCookies(result.accessToken, result.refreshToken)
    return result
  })
)

.handle('refresh', ({ payload }) =>
  Effect.gen(function* () {
    const authService = yield* AuthService
    const result = yield* authService.refresh(payload.refreshToken)
    yield* appendAuthCookies(result.accessToken, result.refreshToken)
    return result
  })
)

.handle('logout', () =>
  Effect.gen(function* () {
    const authService = yield* AuthService
    const result = yield* authService.logout()
    yield* appendClearAuthCookies()
    return result
  })
)
```

### Task 15.4: Update CORS Configuration

**Modify `backend/src/main.ts`:**

Update `HttpApiBuilder.middlewareCors()` to include `credentials: true` and explicit `allowedOrigins`:

```typescript
HttpApiBuilder.middlewareCors({
  allowedOrigins: [corsOrigin],
  allowCredentials: true,
})
```

**Modify `backend/src/configs/env.ts`:**

Add `CORS_ORIGIN` env var to `ServerConfig`:

```typescript
export const ServerConfig = Config.all({
  port: Config.integer('PORT').pipe(Config.withDefault(3000)),
  corsOrigin: Config.string('CORS_ORIGIN').pipe(Config.withDefault('http://localhost:3001')),
})
```

### Task 15.5: Make `refreshToken` Optional in `RefreshTokenInput`

**Modify `packages/shared/src/auth.ts`:**

Update `RefreshTokenInput` so the `refreshToken` field is optional:

```typescript
export class RefreshTokenInput extends Schema.Class<RefreshTokenInput>('RefreshTokenInput')({
  refreshToken: Schema.optional(Schema.String),
}) {}
```

- Cookie-based clients send empty body `{}`; the backend reads the refresh token from the cookie
- Non-browser clients can still send the refresh token in the body
- Backend refresh handler: check body first, fall back to `extractRefreshTokenFromCookie()`

### Task 15.6: Add `extractAccessTokenFromCookie` to CookieHelper

**Modify `backend/src/http/CookieHelper.ts`:**

Mirror the existing `extractRefreshTokenFromCookie` pattern:

```typescript
export const extractAccessTokenFromCookie = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const cookieHeader = request.headers['cookie'] ?? ''
    const match = cookieHeader.match(/accessToken=([^;]+)/)
    return match ? Option.some(match[1]) : Option.none()
  })
```

Used for debugging/logging. The `AuthMiddleware` handles cookie reading via `HttpApiSecurity.apiKey`.

### Task 15.7: Tests

**Create tests for cookie auth behavior:**

Test cases:
- Login response includes `Set-Cookie` headers for both `accessToken` and `refreshToken`
- `GET /api/auth/me` with cookie (no Bearer header) returns 200
- `GET /api/auth/me` with Bearer header (no cookie) returns 200
- Refresh with cookie (empty body `{}`) returns 200 and new `Set-Cookie` headers
- Logout clears cookies (Set-Cookie with `Max-Age=0`)
- Cookie attributes verified: `HttpOnly`, `SameSite=Strict`, correct `Path`, correct `Max-Age`
- CORS headers include `Access-Control-Allow-Credentials: true`

### Task 15.8: Update API_TEST.md

**Modify `docs/API_TEST.md`:**

Add curl examples using cookies:

```bash
### Login (cookies saved automatically)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@laundry.com", "password": "password123"}'

### GET /api/auth/me (using cookie)
curl -b cookies.txt http://localhost:3000/api/auth/me

### Refresh (using cookie, empty body)
curl -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{}'

### Logout (using cookie)
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json"
```

Add note that Bearer header authentication still works for API testing and non-browser clients.

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `backend/src/http/CookieHelper.ts` — add `appendAuthCookies`, `appendClearAuthCookies`, `extractAccessTokenFromCookie`; deprecate old helpers |
| Modify | `backend/src/middleware/AuthMiddleware.ts` — dual security (Bearer + cookie) |
| Modify | `backend/src/handlers/AuthHandlers.ts` — set/clear cookies on login/refresh/logout |
| Modify | `backend/src/main.ts` — CORS `credentials: true` and `allowedOrigins` |
| Modify | `backend/src/configs/env.ts` — add `CORS_ORIGIN` env var |
| Modify | `packages/shared/src/auth.ts` — make `refreshToken` optional in `RefreshTokenInput` |
| Create | Cookie auth tests |
| Modify | `docs/API_TEST.md` — add curl examples with cookies |

## Acceptance Criteria

- [ ] Login response includes `Set-Cookie` headers for `accessToken` (Path=/api) and `refreshToken` (Path=/api/auth)
- [ ] `GET /api/auth/me` with cookie (no Bearer) returns 200 with user data
- [ ] `GET /api/auth/me` with Bearer (no cookie) returns 200 with user data (backward compat)
- [ ] `POST /api/auth/refresh` with cookie (empty body) returns 200 with new tokens and new cookies
- [ ] `POST /api/auth/refresh` with body `{ refreshToken }` still works (backward compat)
- [ ] `POST /api/auth/logout` clears cookies via `Set-Cookie` with `Max-Age=0`
- [ ] Cookies have `HttpOnly; Secure; SameSite=Strict` attributes
- [ ] CORS includes `Access-Control-Allow-Credentials: true`
- [ ] Response body still includes `accessToken` and `refreshToken` (backward compat)
- [ ] All existing auth tests continue to pass
- [ ] New cookie auth tests pass
- [ ] `bun run typecheck` passes

## Dependencies

- Existing: `CookieHelper`, `AuthMiddleware`, `AuthHandlers`, `JwtService`, `ServerConfig`
- No new package dependencies needed

## Impact on Frontend

After this phase, the frontend can migrate to cookie-based auth (see `docs/frontend_roadmap/phase_1_1.md`):
- Remove manual token storage (`lib/auth.ts`)
- Remove Bearer header attachment (`lib/api-client.ts`)
- Simplify refresh/logout to send empty bodies
- Auth state determined by `GET /api/auth/me` (cookies sent automatically by browser)
