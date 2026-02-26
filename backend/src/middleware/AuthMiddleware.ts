import { HttpApiMiddleware, HttpApiSecurity } from '@effect/platform'
import { Effect, Layer, Redacted, Schema } from 'effect'
import { Forbidden, Unauthorized } from '@domain/http/HttpErrors'
import { JwtService } from 'src/usecase/auth/JwtService'
import { CurrentUser, CurrentUserData } from '@domain/CurrentUser'

/**
 * Cookie-based security scheme for browser clients.
 * Reads the accessToken from an httpOnly cookie.
 */
const cookieSecurity = HttpApiSecurity.apiKey({ key: 'accessToken', in: 'cookie' })

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
 * Authentication Middleware using HttpApiMiddleware.Tag pattern
 *
 * Provides CurrentUser context to protected handlers by:
 * 1. Extracting bearer token from Authorization header (tried first)
 * 2. Falling back to accessToken cookie for browser clients
 * 3. Verifying JWT with JwtService
 * 4. Providing CurrentUserData to downstream handlers
 */
export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()('AuthMiddleware', {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer,
    cookie: cookieSecurity,
  },
}) {}

export class AuthAdminMiddleware extends HttpApiMiddleware.Tag<AuthAdminMiddleware>()(
  'AuthAdminMiddleware',
  {
    failure: Schema.Union(Unauthorized, Forbidden),
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer,
      cookie: cookieSecurity,
    },
  }
) {}

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
