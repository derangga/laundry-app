import { Effect, Layer, Redacted } from 'effect'
import {
  AuthMiddleware,
  AuthAdminMiddleware,
  Forbidden,
  Unauthorized,
  type CurrentUserData,
} from '@laundry-app/api-contract'
import { JwtService } from 'src/usecase/auth/JwtService'

/**
 * The `AuthMiddleware` / `AuthAdminMiddleware` Tags + `cookieSecurity` now live in
 * `@laundry-app/api-contract` (pure, no runtime deps). They are re-exported here so
 * `@middleware/AuthMiddleware` consumers (Router, handlers) keep resolving the Tags.
 * The Live implementations stay here because they need `JwtService`.
 */
export { AuthMiddleware, AuthAdminMiddleware, cookieSecurity } from '@laundry-app/api-contract'

/**
 * Shared token verification logic.
 * Unwraps Redacted<string>, verifies JWT, and returns CurrentUserData.
 */
const verifyToken = (jwtService: JwtService, token: Redacted.Redacted) =>
  Effect.gen(function* () {
    const tokenValue = Redacted.value(token)

    const payload = yield* jwtService
      .verifyAccessToken(tokenValue)
      .pipe(Effect.mapError((error) => new Unauthorized({ message: error.message })))

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    } satisfies CurrentUserData
  })

/**
 * AuthMiddleware implementation
 *
 * Verifies JWT tokens and provides CurrentUserData to protected handlers.
 * Bearer token is tried first; cookie is the fallback for browser clients.
 */
export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const jwtService = yield* JwtService

    return {
      bearer: (token) => verifyToken(jwtService, token),
      cookie: (token) => verifyToken(jwtService, token),
    }
  })
)

export const AuthAdminMiddlewareLive = Layer.effect(
  AuthAdminMiddleware,
  Effect.gen(function* () {
    const jwtService = yield* JwtService

    const verifyAdminToken = (token: Redacted.Redacted) =>
      Effect.gen(function* () {
        const user = yield* verifyToken(jwtService, token)

        if (user.role !== 'admin') {
          yield* new Forbidden({ message: "You don't have any access to this endpoint" })
        }

        return user
      })

    return {
      bearer: verifyAdminToken,
      cookie: verifyAdminToken,
    }
  })
)
