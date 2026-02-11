import { Effect, Layer } from 'effect'
import { HttpServer } from '@effect/platform'
import { BunRuntime } from '@effect/platform-bun'
import { SqlClientLive } from '@infrastructure/database/SqlClient'
import { HttpServerLive } from './http/HttpServer.js'
import { createAppRouter } from './http/Router.js'
import { corsMiddleware } from './http/middleware/cors.js'
import { loggingMiddleware } from './http/middleware/logger.js'
import { errorHandlerMiddleware } from './http/middleware/errorHandler.js'

// Create the router
const router = createAppRouter()

// Apply middleware via function composition
// Middleware is applied in order: outermost first (cors handles request first, then logging, then error handler, then routes)
const appWithMiddleware = corsMiddleware(loggingMiddleware(errorHandlerMiddleware(router)))

// Create the HTTP server layer that serves the app with middleware
const HttpLive = HttpServer.serve(appWithMiddleware).pipe(Layer.provide(HttpServerLive))

// Compose all infrastructure layers
const AppLive = Layer.mergeAll(SqlClientLive, HttpLive)

// Main program - just launch the layers
const program = Layer.launch(AppLive).pipe(
  Effect.tapErrorCause((cause) => Effect.logError('Failed to start server:', cause))
)

// Run with Bun runtime
BunRuntime.runMain(program)
