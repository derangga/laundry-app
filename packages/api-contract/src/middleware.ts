import { HttpApiMiddleware, HttpApiSecurity } from '@effect/platform'
import { Schema } from 'effect'
import { Forbidden, Unauthorized } from './errors.js'
import { CurrentUser } from './current-user.js'

/**
 * Cookie-based security scheme for browser clients.
 * Reads the accessToken from an httpOnly cookie.
 */
export const cookieSecurity = HttpApiSecurity.apiKey({ key: 'accessToken', in: 'cookie' })

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
