# Cookie Forwarding in TanStack Start Middleware

When a TanStack Start server middleware makes an internal `fetch()` call — for example, to refresh a JWT — the backend may respond with `Set-Cookie` headers. Those headers exist only on the internal `Response` object and are **never automatically forwarded to the browser**. Without explicit forwarding, cookies like a refreshed `accessToken` are silently lost, leaving the browser session unchanged.

---

## The Problem

The request flows through three hops: browser → TanStack Start middleware → backend. The backend sets cookies on its response to the middleware's `fetch()` call, but that response is internal. TanStack Start has no awareness of it, so the `Set-Cookie` headers never reach the browser.

**Broken flow — cookies trapped on the internal response:**

```
Browser                  TanStack Middleware                   Backend
  │                             │                                 │
  │── GET /dashboard ──────────▶│                                 │
  │                             │── POST /api/auth/refresh ────▶  │
  │                             │◀── 200 Set-Cookie: accessToken ─│
  │                             │   (cookie trapped here)         │
  │                             │── next() ────────────────────▶  │
  │◀── response ────────────────│                                 │
  │   (no Set-Cookie!)          │                                 │
```

**Fixed flow — cookies forwarded to the browser:**

```
Browser                  TanStack Middleware                   Backend
  │                             │                                 │
  │── GET /dashboard ──────────▶│                                 │
  │                             │── POST /api/auth/refresh ────▶  │
  │                             │◀── 200 Set-Cookie: accessToken ─│
  │                             │── next() ────────────────────▶  │
  │                             │◀── result ─────────────         │
  │                             │   append Set-Cookie to          │
  │                             │   result.response.headers       │
  │◀── response + Set-Cookie ───│                                 │
  │   (browser sets cookie)     │                                 │
```

---

## The Fix: Manual Header Forwarding

After calling `next()`, iterate the internal response headers and append any `Set-Cookie` headers to `result.response`. `next()` returns a `RequestServerResult` which exposes a `response: Response` property.

```typescript
const result = await next()
internalResponse.headers.forEach((value, key) => {
  if (key.toLowerCase() === 'set-cookie') {
    result.response.headers.append('set-cookie', value)
  }
})
return result
```

**Key points:**

- Use `key.toLowerCase() === 'set-cookie'` — header key casing is not guaranteed by the Fetch API.
- Use `headers.append` (not `headers.set`) to preserve multiple `Set-Cookie` headers (e.g. `accessToken` and `refreshToken` set in the same response).
- `next()` **must** be called before forwarding, since `result.response` is only available after the downstream handler runs.

---

## Live Example — Auth Refresh Middleware

The following block is from `frontend/src/lib/auth-middleware.ts`. It runs token refresh and forwards cookies only when refresh succeeds.

```typescript
// Attempt refresh; wrap in Option so failures don't throw
const refreshResult = await Effect.runPromise(
  Effect.option(processRefreshToken(cookieHeader)),
)

if (Option.isSome(refreshResult)) {
  // Call next() to continue the request pipeline
  const result = await next()

  // refreshResult.value is the raw Response from the refresh endpoint.
  // Iterate its headers and forward any Set-Cookie values to the browser.
  refreshResult.value.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      result.response.headers.append('set-cookie', value)
    }
  })

  // Return the modified result — browser will now receive the new cookies
  return result
}

// Refresh failed — no valid session, send to login
throw redirect({ to: '/login' })
```

`Effect.option` converts a failing Effect into `Option.none` rather than throwing, so a failed refresh falls through to the redirect without extra try/catch.

---

## Key Rules

- **Any** middleware that makes a `fetch()` call returning `Set-Cookie` headers **must** forward those headers manually.
- Always lowercase the header key before comparing — `key.toLowerCase() === 'set-cookie'`.
- Always use `headers.append`, never `headers.set`, to avoid clobbering sibling `Set-Cookie` headers.
- Forward headers onto `result.response` (the value returned by `next()`), not onto the original `request`.

---

## When This Applies

- **Token refresh flows** — refreshing a JWT and issuing a new `accessToken` cookie.
- **Any SSR or middleware-level `fetch()`** that triggers a `Set-Cookie` response from the backend.
- **Proxy-style middleware** that forwards auth headers and needs to relay session cookies back to the client.
