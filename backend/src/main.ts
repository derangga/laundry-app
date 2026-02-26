import { Effect, Layer } from 'effect'
import { HttpApiBuilder, HttpApiScalar, HttpServer } from '@effect/platform'
import { BunRuntime } from '@effect/platform-bun'
import { SqlClientLive } from 'src/SqlClient.js'
import { HttpServerLive } from './http/HttpServer.js'
import { createAppRouter } from './http/Router.js'
import { ServerConfig } from './configs/env.js'
import { AppLogger, makeLoggerLayer } from './http/Logger.js'
import { gracefulShutdown } from './http/GracefulShutdown.js'
import { RequestLoggingMiddleware } from './middleware/RequestLoggingMiddleware.js'
// import { SecurityHeadersMiddleware } from './middleware/SecurityHeadersMiddleware.js'
// import { RequestSecurityMiddleware } from './middleware/RequestSecurityMiddleware.js'
// import { RateLimitMiddleware } from './middleware/RateLimitMiddleware.js'

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

// Only mount Scalar UI in non-production environments
const ScalarLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { nodeEnv } = yield* ServerConfig
    return nodeEnv !== 'production' ? HttpApiScalar.layer({ path: '/docs' }) : Layer.empty
  })
)

// CORS layer with credentials support for cookie-based auth
const CorsLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { corsOrigin } = yield* ServerConfig
    return HttpApiBuilder.middlewareCors({
      allowedOrigins: [corsOrigin],
      credentials: true,
    })
  }).pipe(Effect.orDie)
)

// Compose HTTP server with request logging middleware
// Note: Additional middleware (SecurityHeaders, RequestSecurity, RateLimit) are defined
// but not yet integrated into the middleware chain. They can be added by composing
// with HttpMiddleware or by modifying the HttpApiBuilder.serve call.
const HttpLive = HttpApiBuilder.serve(RequestLoggingMiddleware).pipe(
  Layer.provide(ScalarLayer),
  Layer.provide(CorsLayer),
  Layer.provide(ApiLayer),
  Layer.provide(AppLogger.Default),
  HttpServer.withLogAddress,
  Layer.provide(HttpServerLive),
  Layer.provide(SqlClientLive)
)

// Signal handler setup for graceful shutdown on SIGTERM
// (BunRuntime.runMain handles SIGINT by interrupting the fiber automatically)
const setupShutdownHandlers = () => {
  const shutdown = (signal: string) =>
    void Effect.runPromise(
      Effect.gen(function* () {
        yield* Effect.logInfo(`Received ${signal}, initiating graceful shutdown...`)
        yield* gracefulShutdown
      }).pipe(Effect.andThen(Effect.sync(() => process.exit(0))))
    )

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

// Main program - log startup, set up shutdown handlers, then launch layers
const program = Effect.gen(function* () {
  yield* Effect.logInfo('Starting laundry-app backend...')
  setupShutdownHandlers()
  yield* Layer.launch(HttpLive)
}).pipe(Effect.tapErrorCause((cause) => Effect.logError('Failed to start server', cause)))

// Run with Bun runtime, applying logger configuration layer
BunRuntime.runMain(program.pipe(Effect.provide(makeLoggerLayer)))
