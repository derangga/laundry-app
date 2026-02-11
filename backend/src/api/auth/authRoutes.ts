import { HttpRouter, HttpServerResponse, HttpServerRequest } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'
import { LoginUseCase } from '@application/auth/LoginUseCase'
import { RefreshTokenUseCase } from '@application/auth/RefreshTokenUseCase'
import { LogoutUseCase } from '@application/auth/LogoutUseCase'
import { LoginInput, RefreshTokenInput, LogoutInput } from '@domain/Auth'
import { requireAuthMiddleware } from '@http/middleware/auth'
import { setAuthCookies, clearAuthCookies, extractRefreshTokenFromCookie } from '@http/CookieHelper'

/**
 * POST /api/auth/login
 * Authenticates user with email and password, returns tokens + user data
 * Sets httpOnly cookies for both access and refresh tokens
 */
const loginHandler = Effect.gen(function* () {
  const loginUseCase = yield* LoginUseCase
  const request = yield* HttpServerRequest.HttpServerRequest
  const body = yield* request.json

  const input = yield* Schema.decodeUnknown(LoginInput)(body)

  const result = yield* loginUseCase.execute(input)

  // Create response with tokens and user data
  const response = yield* HttpServerResponse.json(result)

  // Set auth cookies
  return yield* setAuthCookies(response, result.accessToken, result.refreshToken)
})

/**
 * POST /api/auth/refresh
 * Rotates refresh token, returns new tokens + user data
 * Accepts refresh token from cookie (preferred) or request body
 * Sets httpOnly cookies for new tokens
 */
const refreshHandler = Effect.gen(function* () {
  const refreshUseCase = yield* RefreshTokenUseCase
  const request = yield* HttpServerRequest.HttpServerRequest

  // Extract refresh token from cookie (preferred) or body
  const cookieToken = extractRefreshTokenFromCookie(request)
  const refreshToken = yield* Option.match(cookieToken, {
    onNone: () =>
      Effect.gen(function* () {
        // Fall back to body
        const bodyJson = yield* request.json
        const body = yield* Schema.decodeUnknown(RefreshTokenInput)(bodyJson)
        return body.refreshToken
      }),
    onSome: (token) => Effect.succeed(token),
  })

  const result = yield* refreshUseCase.execute({ refreshToken })

  // Create response with new tokens and user data
  const response = yield* HttpServerResponse.json(result)

  // Set new auth cookies
  return yield* setAuthCookies(response, result.accessToken, result.refreshToken)
})

/**
 * POST /api/auth/logout
 * Revokes refresh token and clears cookies
 * Accepts refresh token from cookie or request body
 * Requires authentication (protected route)
 */
const logoutHandler = Effect.gen(function* () {
  const logoutUseCase = yield* LogoutUseCase
  const request = yield* HttpServerRequest.HttpServerRequest

  // Extract refresh token from cookie or body
  const cookieToken = extractRefreshTokenFromCookie(request)
  const bodyResult = yield* Effect.either(
    Effect.gen(function* () {
      const bodyJson = yield* request.json
      return yield* Schema.decodeUnknown(LogoutInput)(bodyJson)
    })
  )

  // Combine cookie and body inputs
  const refreshToken = Option.getOrUndefined(cookieToken)
  const logoutAll = bodyResult._tag === 'Right' ? bodyResult.right.logoutAll : undefined

  const result = yield* logoutUseCase.execute({
    refreshToken,
    logoutAll,
  })

  // Create response with logout result
  const response = yield* HttpServerResponse.json(result)

  // Clear auth cookies
  return yield* clearAuthCookies(response)
})

/**
 * Auth routes router
 * Mounts authentication endpoints:
 * - POST /login - Email/password authentication
 * - POST /refresh - Token rotation
 * - POST /logout - Session termination (protected)
 */
export const authRoutes = HttpRouter.empty.pipe(
  HttpRouter.post('/login', loginHandler),
  HttpRouter.post('/refresh', refreshHandler),
  HttpRouter.post('/logout', requireAuthMiddleware(logoutHandler))
)
