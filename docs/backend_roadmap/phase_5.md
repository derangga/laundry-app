## Phase 5: HTTP Server & Middleware

**Goal**: Set up HTTP server with @effect/platform-bun

**Prerequisites**: Phase 0 complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 5.1: Create HTTP Server Setup

- [ ] Create `src/infrastructure/http/HttpServer.ts`:

  ```typescript
  import { HttpServer, HttpRouter, HttpServerResponse } from '@effect/platform'
  import { BunHttpServer, BunRuntime } from '@effect/platform-bun'
  import { Effect, Layer, Config } from 'effect'

  export const HttpServerLive = Layer.unwrapEffect(
    Effect.gen(function* () {
      const port = yield* Config.number('PORT').pipe(Config.withDefault(3000))

      return BunHttpServer.layer({ port })
    })
  )
  ```

#### Task 5.2: Create CORS Middleware

- [ ] Create `src/middleware/cors.ts`:

  ```typescript
  import { HttpServerResponse, HttpServerRequest } from '@effect/platform'
  import { Effect, Config } from 'effect'

  export const corsMiddleware = <R, E, A>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, E, R> =>
    Effect.gen(function* () {
      const corsOrigin = yield* Config.string('CORS_ORIGIN').pipe(
        Config.withDefault('http://localhost:5173')
      )

      const request = yield* HttpServerRequest.HttpServerRequest
      const method = request.method

      // Handle preflight
      if (method === 'OPTIONS') {
        return yield* HttpServerResponse.empty({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          },
        })
      }

      // Handle actual request
      const response = yield* handler

      return response.pipe(
        Effect.map((res) =>
          HttpServerResponse.setHeaders(res, {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Credentials': 'true',
          })
        )
      )
    })
  ```

#### Task 5.3: Create Request Logging Middleware

- [ ] Create `src/middleware/logger.ts`:

  ```typescript
  import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
  import { Effect } from 'effect'

  export const loggingMiddleware = <R, E, A>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, E, R> =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const startTime = Date.now()

      yield* Effect.logInfo(`→ ${request.method} ${request.url}`)

      const response = yield* handler

      const duration = Date.now() - startTime
      yield* Effect.logInfo(`← ${request.method} ${request.url} ${response.status} (${duration}ms)`)

      return response
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const duration = Date.now() - startTime
          yield* Effect.logError(`← ${request.method} ${request.url} ERROR (${duration}ms)`, error)
          return yield* Effect.fail(error)
        })
      )
    )
  ```

#### Task 5.4: Create Error Handler Middleware

- [ ] Create `src/middleware/errorHandler.ts`:

  ```typescript
  import { HttpServerResponse } from '@effect/platform'
  import { Effect } from 'effect'
  import { CustomerNotFound, CustomerAlreadyExists } from '@domain/customer/CustomerErrors'
  import { ServiceNotFound } from '@domain/service/ServiceErrors'
  import { OrderNotFound, InvalidOrderTransition } from '@domain/order/OrderErrors'
  import { UnauthorizedError, ForbiddenError, InvalidCredentials } from '@domain/user/UserErrors'

  interface ErrorResponse {
    error: {
      code: string
      message: string
      details?: unknown
    }
  }

  export const errorHandlerMiddleware = <R, E, A>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
    handler.pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // Customer errors
          if (error instanceof CustomerNotFound) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'CUSTOMER_NOT_FOUND',
                  message: `Customer with phone ${error.phone} not found`,
                },
              } satisfies ErrorResponse,
              { status: 404 }
            )
          }

          if (error instanceof CustomerAlreadyExists) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'CUSTOMER_ALREADY_EXISTS',
                  message: `Customer with phone ${error.phone} already exists`,
                },
              } satisfies ErrorResponse,
              { status: 409 }
            )
          }

          // Service errors
          if (error instanceof ServiceNotFound) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'SERVICE_NOT_FOUND',
                  message: `Service not found`,
                },
              } satisfies ErrorResponse,
              { status: 404 }
            )
          }

          // Order errors
          if (error instanceof OrderNotFound) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'ORDER_NOT_FOUND',
                  message: `Order not found`,
                },
              } satisfies ErrorResponse,
              { status: 404 }
            )
          }

          if (error instanceof InvalidOrderTransition) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'INVALID_ORDER_TRANSITION',
                  message: `Cannot transition order from ${error.from} to ${error.to}`,
                },
              } satisfies ErrorResponse,
              { status: 400 }
            )
          }

          // Auth errors
          if (error instanceof UnauthorizedError) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'UNAUTHORIZED',
                  message: error.reason,
                },
              } satisfies ErrorResponse,
              { status: 401 }
            )
          }

          if (error instanceof ForbiddenError) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
              } satisfies ErrorResponse,
              { status: 403 }
            )
          }

          if (error instanceof InvalidCredentials) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'INVALID_CREDENTIALS',
                  message: 'Invalid email or password',
                },
              } satisfies ErrorResponse,
              { status: 401 }
            )
          }

          // Unexpected errors
          yield* Effect.logError('Unexpected error:', error)
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
              },
            } satisfies ErrorResponse,
            { status: 500 }
          )
        })
      )
    )
  ```

#### Task 5.5: Create Request Body Parser

- [ ] Create `src/infrastructure/http/RequestParser.ts`:

  ```typescript
  import { HttpServerRequest } from '@effect/platform'
  import { Schema } from '@effect/schema'
  import { Effect } from 'effect'

  export class ValidationError extends Data.TaggedError('ValidationError')<{
    errors: Array<{ field: string; message: string }>
  }> {}

  export const parseBody = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const body = yield* request.json

      return yield* Schema.decode(schema)(body).pipe(
        Effect.mapError(
          (parseError) =>
            new ValidationError({
              errors: parseError.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            })
        )
      )
    })

  export const parseQuery = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const query = Object.fromEntries(new URL(request.url).searchParams)

      return yield* Schema.decode(schema)(query).pipe(
        Effect.mapError(
          (parseError) =>
            new ValidationError({
              errors: parseError.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            })
        )
      )
    })
  ```

#### Task 5.6: Create Router Utility

- [ ] Create `src/infrastructure/http/Router.ts`:

  ```typescript
  import { HttpRouter, HttpServerRequest, HttpServerResponse } from '@effect/platform'
  import { Effect } from 'effect'

  type RouteHandler<R, E> = Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>

  interface Route<R, E> {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    handler: RouteHandler<R, E>
  }

  export const createRouter = <R, E>(routes: Route<R, E>[]) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest

      for (const route of routes) {
        if (request.method === route.method && matchPath(request.url, route.path)) {
          return yield* route.handler
        }
      }

      return yield* HttpServerResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Route not found' } },
        { status: 404 }
      )
    })

  const matchPath = (url: string, pattern: string): boolean => {
    // Simple path matching (enhance with path-to-regexp if needed)
    const urlPath = new URL(url).pathname
    return urlPath === pattern || urlPath.startsWith(pattern + '/')
  }
  ```

### Key Files to Create

- HTTP server setup in `src/infrastructure/http/HttpServer.ts`
- Middleware in `src/middleware/`
- Request parser in `src/infrastructure/http/RequestParser.ts`
- Router utility in `src/infrastructure/http/Router.ts`

### Verification Steps

- [ ] HTTP server can start without errors
- [ ] CORS middleware adds correct headers
- [ ] Logging middleware logs requests and responses
- [ ] Error handler maps domain errors to HTTP responses
- [ ] Request body parser validates with @effect/schema
- [ ] Router matches paths correctly

### Deliverable

Working HTTP server infrastructure with:

- Bun HTTP server setup
- CORS middleware
- Request logging middleware
- Error handling middleware
- Request body and query parsing
- Basic router implementation
