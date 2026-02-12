import { HttpApiBuilder } from '@effect/platform'
import { Layer } from 'effect'
import { CustomerApi } from '@api/CustomerApi'
import { AuthApi } from '@api/AuthApi'
import { CustomerHandlersLive } from '@handlers/CustomerHandlers'
import { AuthHandlersLive } from '@handlers/AuthHandlers'
import { AuthMiddlewareLive } from '@middleware/AuthMiddleware'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { LoginUseCase } from 'src/usecase/auth/LoginUseCase'
import { RefreshTokenUseCase } from 'src/usecase/auth/RefreshTokenUseCase'
import { LogoutUseCase } from 'src/usecase/auth/LogoutUseCase'
import { RegisterUserUseCase } from 'src/usecase/auth/RegisterUserUseCase'
import { BootstrapUseCase } from 'src/usecase/auth/BootstrapUseCase'
import { PasswordService } from 'src/usecase/auth/PasswordService'
import { JwtService } from 'src/usecase/auth/JwtService'
import { TokenGenerator } from 'src/usecase/auth/TokenGenerator'

/**
 * HTTP Router Configuration with HttpApiBuilder
 *
 * Composes multiple APIs with their handlers and middleware:
 * - /health - Health check endpoint (legacy HttpRouter)
 * - /api/auth - Authentication endpoints (HttpApi-based)
 * - /api/customers - Customer management endpoints (HttpApi-based)
 *
 * Uses HttpApiBuilder for type-safe, automatic validation and error handling.
 * Middleware is provided at the API layer for consistent behavior.
 */

/**
 * Compose Customer API with handlers and dependencies
 */
const CustomerApiLive = HttpApiBuilder.api(CustomerApi).pipe(
  Layer.provide(CustomerHandlersLive),
  Layer.provide(CustomerRepository.Default),
  Layer.provide(CustomerService.Default)
)

/**
 * Compose Auth API with handlers, middleware, and dependencies
 *
 * Protected endpoints (logout, register) require authentication via AuthMiddleware.
 * The middleware verifies JWT tokens and provides CurrentUser context to handlers.
 */
const AuthApiLive = HttpApiBuilder.api(AuthApi).pipe(
  Layer.provide(AuthHandlersLive),
  Layer.provide(AuthMiddlewareLive),
  Layer.provide(LoginUseCase.Default),
  Layer.provide(RefreshTokenUseCase.Default),
  Layer.provide(LogoutUseCase.Default),
  Layer.provide(RegisterUserUseCase.Default),
  Layer.provide(BootstrapUseCase.Default),
  Layer.provide(JwtService.Default),
  Layer.provide(TokenGenerator.Default),
  Layer.provide(PasswordService.Default),
  Layer.provide(UserRepository.Default),
  Layer.provide(RefreshTokenRepository.Default)
)

/**
 * Combine all APIs into a single HTTP app
 */
const ApiLive = Layer.mergeAll(CustomerApiLive, AuthApiLive)

/**
 * Create app with all APIs
 *
 * Returns a Layer providing the composed HTTP application
 */
export const createAppRouter = () => {
  // Return the API layer with all handlers, middleware, and dependencies
  return ApiLive
}
