import { Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpMiddleware, HttpServer } from '@effect/platform'
import { BunRuntime } from '@effect/platform-bun'
import { SqlClientLive } from 'src/SqlClient.js'
import { HttpServerLive } from './http/HttpServer.js'
import { createAppRouter } from './http/Router.js'

/**
 * Application Composition
 *
 * Creates the HTTP application by composing:
 * 1. API layer with handlers (from Router)
 * 2. HTTP server configuration (HttpServerLive)
 * 3. Database client (SqlClientLive)
 *
 * Uses HttpApiBuilder for type-safe API handling with automatic:
 * - Request validation
 * - Error handling with proper status codes
 * - Middleware composition (logging, CORS)
 * - Dependency injection via Effect Layers
 */

// Get the API layer (provides Context<Api>)
const ApiLayer = createAppRouter()

// Compose HTTP server with middleware and API
// Pattern from example: HttpApiBuilder.serve -> middlewareCors -> ApiLayer -> HttpServer
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(ApiLayer),
  HttpServer.withLogAddress,
  Layer.provide(HttpServerLive),
  Layer.provide(SqlClientLive)
)

// Main program - just launch the layers
const program = Layer.launch(HttpLive).pipe(
  Effect.tapErrorCause((cause) => Effect.logError('Failed to start server:', cause))
)

// Run with Bun runtime
BunRuntime.runMain(program)
