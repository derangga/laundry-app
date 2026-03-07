# HTTP API Patterns

## API Definition

**Use `HttpApi.make`** to define your API, composed of groups and endpoints:

```typescript
import { HttpApi, HttpApiGroup, HttpApiEndpoint } from "@effect/platform"
import { OpenApi } from "@effect/platform"

const MyApi = HttpApi.make("MyApi").pipe(
    HttpApi.addGroup(UsersApi),
    HttpApi.addGroup(OrdersApi),
    OpenApi.annotate({
        title: "My Application API",
        version: "1.0.0",
        description: "A sample Effect API",
    }),
)
```

### HttpApiGroup

Group related endpoints under a shared prefix:

```typescript
const UsersApi = HttpApiGroup.make("users").pipe(
    HttpApiGroup.add(getUser),
    HttpApiGroup.add(createUser),
    HttpApiGroup.add(deleteUser),
)
```

## Endpoint Configuration

### Defining Endpoints

```typescript
import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

// GET with path parameters
const getUser = HttpApiEndpoint.get("getUser", "/users/:id").pipe(
    HttpApiEndpoint.setPath(Schema.Struct({
        id: UserId,
    })),
    HttpApiEndpoint.setSuccess(User),
    HttpApiEndpoint.addError(UserNotFoundError),
)

// POST with request body
const createUser = HttpApiEndpoint.post("createUser", "/users").pipe(
    HttpApiEndpoint.setPayload(CreateUserInput),
    HttpApiEndpoint.setSuccess(User, { status: 201 }),
    HttpApiEndpoint.addError(UserCreateError),
)

// DELETE
const deleteUser = HttpApiEndpoint.del("deleteUser", "/users/:id").pipe(
    HttpApiEndpoint.setPath(Schema.Struct({
        id: UserId,
    })),
    HttpApiEndpoint.setSuccess(Schema.Void),
    HttpApiEndpoint.addError(UserNotFoundError),
)
```

### Available HTTP Methods

| Method | Constructor |
|--------|------------|
| GET | `HttpApiEndpoint.get(name, path)` |
| POST | `HttpApiEndpoint.post(name, path)` |
| PUT | `HttpApiEndpoint.put(name, path)` |
| PATCH | `HttpApiEndpoint.patch(name, path)` |
| DELETE | `HttpApiEndpoint.del(name, path)` |

### Endpoint Options

```typescript
HttpApiEndpoint.post("createUser", "/users").pipe(
    HttpApiEndpoint.setPath(PathSchema),         // Path parameters (/:id, /:slug)
    HttpApiEndpoint.setPayload(BodySchema),      // Request body
    HttpApiEndpoint.setSuccess(ResponseSchema),  // Success response schema
    HttpApiEndpoint.addError(ErrorSchema),        // Error response (auto-mapped via HttpApiSchema.annotations)
    HttpApiEndpoint.setHeaders(HeadersSchema),   // Required headers
    HttpApiEndpoint.setUrlParams(QuerySchema),   // Query parameters
)
```

### Error Status Mapping

**Define HTTP status codes on error types**, not in handlers:

```typescript
// Status code defined ONCE on the error class
export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()(
    "UserNotFoundError",
    { userId: UserId, message: Schema.String },
    HttpApiSchema.annotations({ status: 404 }),
) {}

export class UserCreateError extends Schema.TaggedError<UserCreateError>()(
    "UserCreateError",
    { message: Schema.String },
    HttpApiSchema.annotations({ status: 400 }),
) {}

// Add to endpoint — status mapping is automatic
const getUser = HttpApiEndpoint.get("getUser", "/users/:id").pipe(
    HttpApiEndpoint.setSuccess(User),
    HttpApiEndpoint.addError(UserNotFoundError),  // Automatically 404
)
```

> See also: `anti-patterns.md` — [Duplicating Error Handling in Every Route Handler]
> See also: `error-patterns.md` — [HTTP Status Codes (Without Generic Errors)]

## HttpApiBuilder Handlers

### Implementing Handlers

```typescript
import { HttpApiBuilder } from "@effect/platform"

const UsersApiLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
    handlers.pipe(
        HttpApiBuilder.handle("getUser", ({ path }) =>
            Effect.gen(function* () {
                const userService = yield* UserService
                return yield* userService.findById(path.id)
            }),
        ),
        HttpApiBuilder.handle("createUser", ({ payload }) =>
            Effect.gen(function* () {
                const userService = yield* UserService
                return yield* userService.create(payload)
            }),
        ),
        HttpApiBuilder.handle("deleteUser", ({ path }) =>
            Effect.gen(function* () {
                const userService = yield* UserService
                yield* userService.delete(path.id)
            }),
        ),
    ),
)
```

### Handler Parameters

The handler function receives a destructurable object:

| Property | Source | Description |
|----------|--------|-------------|
| `path` | URL path params | Parsed via `setPath` schema |
| `payload` | Request body | Parsed via `setPayload` schema |
| `headers` | HTTP headers | Parsed via `setHeaders` schema |
| `urlParams` | Query string | Parsed via `setUrlParams` schema |

### Providing Dependencies

```typescript
const MyApiLive = HttpApiBuilder.api(MyApi).pipe(
    Layer.provide(UsersApiLive),
    Layer.provide(OrdersApiLive),
    Layer.provide(UserService.Default),
    Layer.provide(OrderService.Default),
)
```

## Middleware

### Logging Middleware

```typescript
import { HttpMiddleware, HttpServerRequest } from "@effect/platform"
import { Effect } from "effect"

const withLogging = HttpMiddleware.make((handler) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const startTime = Date.now()

        yield* Effect.log(`→ ${request.method} ${request.url}`)

        const response = yield* handler

        const duration = Date.now() - startTime
        yield* Effect.log(`← ${response.status} (${duration}ms)`)

        return response
    }),
)
```

### Timing Middleware

```typescript
const withTiming = HttpMiddleware.make((handler) =>
    Effect.gen(function* () {
        const startTime = Date.now()
        const response = yield* handler
        const duration = Date.now() - startTime

        return HttpServerResponse.setHeader(
            response,
            "X-Response-Time",
            `${duration}ms`,
        )
    }),
)
```

### Request ID Middleware

```typescript
import { HttpServerResponse } from "@effect/platform"

const withRequestId = HttpMiddleware.make((handler) =>
    Effect.gen(function* () {
        const requestId = yield* Effect.sync(() => crypto.randomUUID())

        const response = yield* handler.pipe(
            Effect.annotateCurrentSpan("requestId", requestId),
        )

        return HttpServerResponse.setHeader(response, "X-Request-Id", requestId)
    }),
)
```

### Timeout Middleware

```typescript
import { Duration, Effect } from "effect"

const withTimeout = (duration: Duration.DurationInput) =>
    HttpMiddleware.make((handler) =>
        handler.pipe(
            Effect.timeout(duration),
            Effect.catchTag("TimeoutException", () =>
                HttpServerResponse.json(
                    { error: "Request timeout" },
                    { status: 504 },
                ),
            ),
        ),
    )
```

### Middleware Composition Order

Middleware composes inside-out — the last applied middleware runs first:

```typescript
const ServerLive = HttpApiBuilder.serve().pipe(
    // Applied last → runs first (outermost)
    HttpApiBuilder.middlewareCors({ allowedOrigins: ["http://localhost:3000"] }),
    // Applied middle → runs second
    Layer.provide(withLogging),
    // Applied first → runs last (innermost)
    Layer.provide(MyApiLive),
    Layer.provide(NodeHttpServer.layer({ port: 3000 })),
)
```

## Authentication

### HttpApiSecurity.bearer

**Use `HttpApiSecurity.bearer`** for JWT/bearer token authentication:

```typescript
import { HttpApiSecurity } from "@effect/platform"

// Define security scheme on the API or group
const AuthenticatedApi = HttpApiGroup.make("protected").pipe(
    HttpApiGroup.add(getProfile),
    HttpApiGroup.add(updateProfile),
    HttpApiGroup.addSecurity(HttpApiSecurity.bearer),
)
```

### CurrentUser Context Pattern

Define a context tag for the authenticated user:

```typescript
import { Context, Effect, Layer } from "effect"

interface User {
    readonly id: string
    readonly email: string
    readonly roles: ReadonlyArray<string>
}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}
```

### Authentication Middleware

```typescript
const withAuth = HttpMiddleware.make((handler) =>
    Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest

        const authHeader = request.headers["authorization"]
        if (!authHeader?.startsWith("Bearer ")) {
            return yield* Effect.fail(
                new UnauthorizedError({ message: "Missing Bearer token" }),
            )
        }

        const token = authHeader.slice(7)
        const jwt = yield* JwtService
        const user = yield* jwt.verify(token)

        return yield* handler.pipe(
            Effect.provideService(CurrentUser, user),
        )
    }),
)
```

### Role-Based Authorization

```typescript
const requireRole = (role: string) =>
    HttpMiddleware.make((handler) =>
        Effect.gen(function* () {
            const user = yield* CurrentUser

            if (!user.roles.includes(role)) {
                return yield* Effect.fail(
                    new ForbiddenError({
                        message: `Required role: ${role}`,
                        requiredPermission: role,
                    }),
                )
            }

            return yield* handler
        }),
    )

// Usage — only admins can delete users
const AdminApi = HttpApiGroup.make("admin").pipe(
    HttpApiGroup.add(deleteUser),
    HttpApiGroup.middleware(requireRole("admin")),
)
```

### Handler Accessing Current User

```typescript
HttpApiBuilder.handle("getProfile", () =>
    Effect.gen(function* () {
        const user = yield* CurrentUser
        const profileService = yield* ProfileService
        return yield* profileService.getByUserId(user.id)
    }),
)
```

## CORS

### Basic CORS Setup

```typescript
const ServerLive = HttpApiBuilder.serve().pipe(
    HttpApiBuilder.middlewareCors({
        allowedOrigins: ["http://localhost:3000"],
    }),
    Layer.provide(MyApiLive),
    Layer.provide(NodeHttpServer.layer({ port: 3000 })),
)
```

### CORS Configuration Options

```typescript
HttpApiBuilder.middlewareCors({
    // Allowed origins — use specific domains in production
    allowedOrigins: ["https://app.example.com", "https://admin.example.com"],

    // Allowed HTTP methods
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],

    // Allowed request headers
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],

    // Headers exposed to the browser
    exposedHeaders: ["X-Request-Id", "X-Response-Time"],

    // Allow credentials (cookies, auth headers)
    credentials: true,

    // Preflight cache duration in seconds
    maxAge: 86400,
})
```

### Development vs Production

```typescript
// Development — allow all origins
const devCors = HttpApiBuilder.middlewareCors({
    allowedOrigins: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
})

// Production — strict origin list
const prodCors = HttpApiBuilder.middlewareCors({
    allowedOrigins: ["https://app.example.com"],
    allowedMethods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
})
```

### CORS Security Rules

1. **Never use `"*"` with `credentials: true`** — browsers reject this combination
2. **List specific origins** in production — not wildcard
3. **Limit `allowedMethods`** to only what your API uses
4. **Set `maxAge`** to reduce preflight requests

## Rate Limiting

### In-Memory Rate Limiter with Ref

```typescript
import { Duration, Effect, HashMap, Ref } from "effect"

interface RateLimitState {
    readonly count: number
    readonly resetAt: number
}

const makeRateLimiter = (maxRequests: number, window: Duration.DurationInput) =>
    Effect.gen(function* () {
        const state = yield* Ref.make(HashMap.empty<string, RateLimitState>())
        const windowMs = Duration.toMillis(Duration.decode(window))

        return (key: string) =>
            Effect.gen(function* () {
                const now = Date.now()

                const allowed = yield* Ref.modify(state, (map) => {
                    const current = HashMap.get(map, key)
                    const entry = current.pipe(
                        Option.filter((e) => e.resetAt > now),
                        Option.getOrElse(() => ({ count: 0, resetAt: now + windowMs })),
                    )

                    if (entry.count >= maxRequests) {
                        return [false, map] as const
                    }

                    return [
                        true,
                        HashMap.set(map, key, {
                            count: entry.count + 1,
                            resetAt: entry.resetAt,
                        }),
                    ] as const
                })

                if (!allowed) {
                    return yield* Effect.fail(
                        new RateLimitExceededError({
                            message: "Too many requests",
                            retryAfter: windowMs / 1000,
                        }),
                    )
                }
            })
    })
```

### Rate Limiting Middleware

```typescript
const withRateLimit = (maxRequests: number, window: Duration.DurationInput) =>
    HttpMiddleware.make((handler) =>
        Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest
            const rateLimiter = yield* RateLimiter

            // Use IP or user ID as rate limit key
            const key = request.headers["x-forwarded-for"] ?? "unknown"
            yield* rateLimiter(key)

            return yield* handler
        }),
    )
```

> See also: `concurrency-patterns.md` — [Semaphore] for limiting concurrent access to resources

### Rate Limit Error

```typescript
export class RateLimitExceededError extends Schema.TaggedError<RateLimitExceededError>()(
    "RateLimitExceededError",
    {
        message: Schema.String,
        retryAfter: Schema.optional(Schema.Number),
    },
    HttpApiSchema.annotations({ status: 429 }),
) {}
```

## Request Validation

Schema-based validation is automatic with `setPayload`, `setPath`, and `setUrlParams`. Invalid requests return 400 with validation errors.

```typescript
const CreateUserInput = Schema.Struct({
    email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
    age: Schema.Number.pipe(Schema.int(), Schema.between(0, 150)),
})

const createUser = HttpApiEndpoint.post("createUser", "/users").pipe(
    HttpApiEndpoint.setPayload(CreateUserInput),  // Auto-validated
    HttpApiEndpoint.setSuccess(User, { status: 201 }),
)
// Invalid payload → automatic 400 with structured error details
```

### Path Parameter Validation

```typescript
const PathParams = Schema.Struct({
    id: UserId,  // Branded UUID — validated automatically
})

const getUser = HttpApiEndpoint.get("getUser", "/users/:id").pipe(
    HttpApiEndpoint.setPath(PathParams),
    HttpApiEndpoint.setSuccess(User),
)
// Invalid UUID in path → automatic 400
```

### Query Parameter Validation

```typescript
const ListParams = Schema.Struct({
    page: Schema.NumberFromString.pipe(Schema.int(), Schema.positive()),
    limit: Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 100)),
    sort: Schema.optional(Schema.Literal("asc", "desc")),
})

const listUsers = HttpApiEndpoint.get("listUsers", "/users").pipe(
    HttpApiEndpoint.setUrlParams(ListParams),
    HttpApiEndpoint.setSuccess(Schema.Array(User)),
)
```

## OpenAPI / Swagger

### Annotating the API

```typescript
import { OpenApi } from "@effect/platform"

const MyApi = HttpApi.make("MyApi").pipe(
    HttpApi.addGroup(UsersApi),
    OpenApi.annotate({
        title: "My Application API",
        version: "1.0.0",
        description: "RESTful API built with Effect",
    }),
)
```

### Serving Swagger UI

```typescript
import { HttpApiSwagger } from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"

const ServerLive = HttpApiBuilder.serve().pipe(
    Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
    Layer.provide(MyApiLive),
    Layer.provide(NodeHttpServer.layer({ port: 3000 })),
)
// Swagger UI available at http://localhost:3000/docs
```

### Full Server Setup

```typescript
import { HttpApiBuilder } from "@effect/platform"
import { HttpApiSwagger } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"

// Wire everything together
const ServerLive = HttpApiBuilder.serve().pipe(
    HttpApiBuilder.middlewareCors({
        allowedOrigins: ["http://localhost:3000"],
    }),
    Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
    Layer.provide(MyApiLive),
    Layer.provide(NodeHttpServer.layer({ port: 3000 })),
)

// Run with graceful shutdown
NodeRuntime.runMain(
    Layer.launch(ServerLive),
)
```

## Quick Reference Table

| API | Import | Purpose |
|-----|--------|---------|
| `HttpApi.make(name)` | `@effect/platform` | Create API definition |
| `HttpApi.addGroup(group)` | `@effect/platform` | Add endpoint group to API |
| `HttpApiGroup.make(name)` | `@effect/platform` | Group related endpoints |
| `HttpApiGroup.add(endpoint)` | `@effect/platform` | Add endpoint to group |
| `HttpApiEndpoint.get(name, path)` | `@effect/platform` | Define GET endpoint |
| `HttpApiEndpoint.post(name, path)` | `@effect/platform` | Define POST endpoint |
| `HttpApiEndpoint.del(name, path)` | `@effect/platform` | Define DELETE endpoint |
| `HttpApiEndpoint.setPath(schema)` | `@effect/platform` | Path parameter schema |
| `HttpApiEndpoint.setPayload(schema)` | `@effect/platform` | Request body schema |
| `HttpApiEndpoint.setSuccess(schema)` | `@effect/platform` | Success response schema |
| `HttpApiEndpoint.addError(error)` | `@effect/platform` | Add error response |
| `HttpApiEndpoint.setUrlParams(schema)` | `@effect/platform` | Query parameter schema |
| `HttpApiBuilder.group(api, name, fn)` | `@effect/platform` | Implement group handlers |
| `HttpApiBuilder.handle(name, fn)` | `@effect/platform` | Implement endpoint handler |
| `HttpApiBuilder.serve()` | `@effect/platform` | Create HTTP server layer |
| `HttpApiBuilder.middlewareCors(config)` | `@effect/platform` | Add CORS middleware |
| `HttpApiSecurity.bearer` | `@effect/platform` | Bearer token security scheme |
| `HttpApiSwagger.layer({ path })` | `@effect/platform` | Serve Swagger UI |
| `OpenApi.annotate({ title, version })` | `@effect/platform` | OpenAPI metadata |
| `HttpApiSchema.annotations({ status })` | `@effect/platform` | HTTP status on error types |
