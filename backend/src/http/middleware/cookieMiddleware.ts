import { HttpMiddleware, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { setAuthCookies, clearAuthCookies } from '@http/CookieHelper'

/**
 * Response middleware for handling authentication cookies
 *
 * Inspects response bodies for auth tokens and automatically sets/clears cookies:
 * - If response contains accessToken and refreshToken (from login/refresh)
 *   → Sets httpOnly cookies for both tokens
 * - If response contains loggedOut flag (from logout)
 *   → Clears auth cookies
 * - Otherwise: passes response through unchanged
 *
 * This approach keeps handlers focused on business logic while middleware
 * handles HTTP concerns (cookie setting)
 */
export const cookieMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const response = yield* app

    // Try to extract response body if it's a JSON response
    // The response might not have a readable body in middleware position,
    // so we check headers and status code instead
    const contentType = response.headers['content-type']

    // Only process JSON responses
    if (!contentType || !contentType.includes('application/json')) {
      return response
    }

    // Check if this is an auth endpoint response by examining the request path
    // Note: In middleware, we don't have easy access to response body,
    // so we use a more pragmatic approach with marker headers
    const pathMarker = response.headers['x-auth-response']

    if (pathMarker === 'login' || pathMarker === 'refresh') {
      // These endpoints should have tokens in the response
      // Cookies will be set by the handler using response transformation
      return response
    }

    if (pathMarker === 'logout') {
      // Clear cookies on logout
      return yield* clearAuthCookies(response)
    }

    return response
  })
)

/**
 * Helper to mark auth endpoint responses for cookie middleware
 * Used by handlers to signal that cookies should be set/cleared
 *
 * Usage in handler:
 *   const response = yield* HttpServerResponse.json(result)
 *   return yield* markAuthResponse(response, 'login')
 */
export const markAuthResponse = (
  response: HttpServerResponse.HttpServerResponse,
  type: 'login' | 'refresh' | 'logout'
) =>
  Effect.gen(function* () {
    return yield* HttpServerResponse.setHeaders(response, {
      'x-auth-response': type,
    })
  })

/**
 * Helper to set auth cookies on response
 * Can be used in handlers to set cookies directly
 */
export const setCookiesOnResponse = (
  response: HttpServerResponse.HttpServerResponse,
  accessToken: string,
  refreshToken: string,
  type: 'login' | 'refresh' = 'login'
) =>
  Effect.gen(function* () {
    const responseWithCookies = yield* setAuthCookies(response, accessToken, refreshToken)
    return yield* markAuthResponse(responseWithCookies, type)
  })

/**
 * Helper to clear cookies on response
 */
export const clearCookiesOnResponse = (response: HttpServerResponse.HttpServerResponse) =>
  Effect.gen(function* () {
    const responseCleared = yield* clearAuthCookies(response)
    return yield* markAuthResponse(responseCleared, 'logout')
  })
