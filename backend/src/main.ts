import { Effect, Layer } from 'effect'
import { HttpServer } from '@effect/platform'
import { BunRuntime } from '@effect/platform-bun'
import { SqlClientLive } from '@infrastructure/database/SqlClient'
import { HttpServerLive } from './http/HttpServer.js'
import { createAppRouter } from './http/Router.js'
import { corsMiddleware } from './http/middleware/cors.js'
import { loggingMiddleware } from './http/middleware/logger.js'
import { errorHandlerMiddleware } from './http/middleware/errorHandler.js'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { LoginUseCase } from '@application/auth/LoginUseCase'
import { RefreshTokenUseCase } from '@application/auth/RefreshTokenUseCase'
import { LogoutUseCase } from '@application/auth/LogoutUseCase'
import { PasswordService } from '@application/auth/PasswordService'
import { JwtService } from '@application/auth/JwtService'
import { TokenGenerator } from '@application/auth/TokenGenerator'

// Create the router
const router = createAppRouter()

// Apply middleware via function composition
// Middleware is applied in order: outermost first (cors handles request first, then logging, then error handler, then routes)
const appWithMiddleware = corsMiddleware(loggingMiddleware(errorHandlerMiddleware(router)))

// Compose all service layers
const ServicesLive = Layer.mergeAll(
  UserRepository.Default,
  RefreshTokenRepository.Default,
  PasswordService.Default,
  JwtService.Default,
  TokenGenerator.Default,
  LoginUseCase.Default,
  RefreshTokenUseCase.Default,
  LogoutUseCase.Default
)

// Create the HTTP server layer that serves the app with middleware
// Provide services to the HTTP server
const HttpLive = HttpServer.serve(appWithMiddleware).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ServicesLive),
  Layer.provide(SqlClientLive)
)

// Compose all infrastructure and service layers
const AppLive = HttpLive

// Main program - just launch the layers
const program = Layer.launch(AppLive).pipe(
  Effect.tapErrorCause((cause) => Effect.logError('Failed to start server:', cause))
)

// Run with Bun runtime
BunRuntime.runMain(program)
