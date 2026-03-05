## Table of Contents

| Date | Title |
|------|-------|
| 2026-03-05 | Effect HttpClient Scoping Pitfall — `ResponseError: Decode error` |

---

## Problem

After refactoring `api-client.ts` to use `@effect/platform` HttpClient, all requests that use `schemaBodyJson` or `response.json` fail with:

```
ResponseError: Decode error (200 POST http://localhost:3000/api/auth/login)
```

The API returns 200 successfully, but the response body can't be read. The status code is fine — it's the body that's dead.

## Why This Happens

In `@effect/platform`, `HttpClient.execute()` returns an effect that requires a `Scope`. The `Scope` manages the lifecycle of the underlying HTTP connection — when the scope closes, the connection closes and the response body stream is finalized.

### The broken pattern: scoping individual requests

When `Effect.scoped` wraps each `client.execute()` call, the scope opens, the request fires, the response **header** is received, and then the scope **immediately closes** — killing the connection. Any later attempt to read the response body (`.json`, `schemaBodyJson`, etc.) finds a dead stream and throws `ResponseError: Decode error`.

```
Timeline (broken):

  Effect.scoped(client.execute(req))
    │
    ├─ scope opens
    ├─ request sent
    ├─ response headers received  ← response object returned
    └─ scope closes               ← connection killed here
         │
         ▼
  response.json                   ← body stream is dead → Decode error
```

### The fix: scoping the entire program

When `Effect.scoped` wraps the **entire** program (request + body read), the connection stays alive until all processing is done:

```
Timeline (fixed):

  Effect.scoped(program)
    │
    ├─ scope opens
    ├─ request sent
    ├─ response headers received
    ├─ response.json / schemaBodyJson  ← body read succeeds
    └─ scope closes                    ← connection cleaned up after use
```

## Broken vs Fixed Code

### Broken — `Effect.scoped` on individual `execute` calls

```ts
function apiClient<T>(method, path, schema?, body?) {
  const program = Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    // BROKEN — scope closes before body is read
    const execute = (req: HttpClientRequest.HttpClientRequest) =>
      body !== undefined
        ? pipe(
            HttpClientRequest.bodyJson(body)(req),
            Effect.flatMap((r) => client.execute(r)),
            Effect.scoped,   // ← scope closes here, connection dies
          )
        : Effect.scoped(client.execute(req))   // ← same problem

    const response = yield* execute(baseRequest).pipe(...)

    // These all fail — body stream is already closed:
    yield* response.json                           // ← Decode error
    yield* HttpClientResponse.schemaBodyJson(schema)(response)  // ← Decode error
  })

  return program.pipe(Effect.provide(FetchLive))
}
```

### Fixed — `Effect.scoped` on the entire program

```ts
function apiClient<T>(method, path, schema?, body?) {
  const program = Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    // FIXED — no scoping here, connection stays open
    const execute = (req: HttpClientRequest.HttpClientRequest) =>
      body !== undefined
        ? pipe(
            HttpClientRequest.bodyJson(body)(req),
            Effect.flatMap((r) => client.execute(r)),
          )
        : client.execute(req)

    const response = yield* execute(baseRequest).pipe(...)

    // These work — scope is still open:
    yield* response.json                           // ✓
    yield* HttpClientResponse.schemaBodyJson(schema)(response)  // ✓
  })

  // Scope the entire program — connection lives until body is read
  return program.pipe(Effect.scoped, Effect.provide(FetchLive))
}
```

## The Rule

> **Scope the entire program, not individual requests.**
>
> `Effect.scoped` should wrap the outermost effect that includes both the HTTP request *and* all response body reads. Never scope a bare `client.execute()` if you need to read the body later.

## Key Takeaways

1. **`HttpClient.execute()` requires `Scope`** — the scope owns the HTTP connection lifecycle (open → close).
2. **`Effect.scoped` closes the scope immediately** — any resource (connection, stream) managed by that scope is finalized when the scoped effect completes.
3. **Response bodies are streams** — they need the connection alive to be read. A closed scope = closed connection = dead body stream.
4. **The error is misleading** — `ResponseError: Decode error` on a 200 response looks like a schema issue, but it's actually a closed-connection issue. The body bytes never arrived.
5. **Same pattern applies to any scoped resource** — file handles, database connections, WebSocket connections. If you scope too early, downstream reads fail.

## Files Changed

- `frontend/src/lib/api-client.ts` — Removed `Effect.scoped` from the `execute` helper; added `Effect.scoped` to the final `program.pipe(Effect.scoped, Effect.provide(FetchLive))` pipeline.
