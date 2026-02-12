import { HttpApiMiddleware, HttpApiSecurity } from '@effect/platform'
import { Effect, Layer, Redacted } from 'effect'
import { Unauthorized } from '@domain/http/HttpErrors'
import { JwtService } from 'src/usecase/auth/JwtService'
import { CurrentUser, CurrentUserData } from '@domain/CurrentUser'

/**
 * Authentication Middleware using HttpApiMiddleware.Tag pattern
 *
 * Provides CurrentUser context to protected handlers by:
 * 1. Extracting bearer token from Authorization header
 * 2. Verifying JWT with JwtService
 * 3. Providing CurrentUserData to downstream handlers
 *
 * Usage in API definition:
 * ```typescript
 * HttpApiEndpoint.post('logout', '/api/auth/logout')
 *   .middleware(AuthMiddleware)  // Requires authentication
 * ```
 *
 * Usage in handler:
 * ```typescript
 * const currentUser = yield* CurrentUser  // Provided by middleware
 * ```
 */
export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()('AuthMiddleware', {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer,
  },
}) {}

/**
 * AuthMiddleware implementation
 *
 * Verifies JWT tokens and provides CurrentUserData to protected handlers.
 * Uses Redacted.value() to safely unwrap the token from HttpApiSecurity.bearer.
 */
export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const jwtService = yield* JwtService

    return {
      bearer: (token) =>
        Effect.gen(function* () {
          // CRITICAL: Unwrap Redacted<string> to get actual token string
          // HttpApiSecurity.bearer returns Redacted<string> for security
          const tokenValue = Redacted.value(token)

          // Verify JWT and get payload
          const payload = yield* jwtService
            .verifyAccessToken(tokenValue)
            .pipe(Effect.mapError((error) => new Unauthorized({ message: error.message })))

          // Return CurrentUserData matching domain interface
          return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
          } satisfies CurrentUserData
        }),
    }
  })
)
