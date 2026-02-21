import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { RateLimitService, RateLimitStrategies } from '../usecase/security/RateLimitService'
import { RateLimitStrategy } from '../domain/RateLimit'
import { CurrentUser } from '@domain/CurrentUser'

/**
 * Rate Limiting Middleware
 *
 * Applies rate limiting to all requests based on:
 * - IP address (for unauthenticated requests)
 * - User ID (for authenticated requests)
 * - Endpoint-specific strategies
 *
 * Adds rate limit headers to all responses:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests remaining in window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - Retry-After: Seconds to wait (on 429 errors)
 */

/**
 * Determine rate limit strategy based on request URL and authentication
 */
const getStrategyForRequest = (url: string, isAuthenticated: boolean): RateLimitStrategy => {
  // Login endpoint - strict limit
  if (url.includes('/api/auth/login')) {
    return RateLimitStrategies.login
  }

  // Refresh token endpoint
  if (url.includes('/api/auth/refresh')) {
    return RateLimitStrategies.refresh
  }

  // Order creation - moderate limit
  if (url.includes('/api/orders') && !url.includes('/api/orders/')) {
    return RateLimitStrategies.orderCreation
  }

  // Customer search - higher limit
  if (url.includes('/api/customers/search')) {
    return RateLimitStrategies.customerSearch
  }

  // Authenticated API endpoints
  if (isAuthenticated && url.startsWith('/api/')) {
    return RateLimitStrategies.authenticatedApi
  }

  // Public API endpoints
  if (url.startsWith('/api/')) {
    return RateLimitStrategies.publicApi
  }

  // Default to public API strategy
  return RateLimitStrategies.publicApi
}

/**
 * Extract IP address from request
 * Checks X-Forwarded-For header first (for proxy/load balancer scenarios)
 */
const getClientIp = (request: HttpServerRequest.HttpServerRequest): string => {
  const forwardedFor = request.headers['x-forwarded-for']
  if (forwardedFor && typeof forwardedFor === 'string') {
    // Take the first IP if multiple are present
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIp = request.headers['x-real-ip']
  if (realIp && typeof realIp === 'string') {
    return realIp
  }

  // Fallback to connection remote address (Effect platform specific)
  return (request as any).remoteAddress || 'unknown'
}

export const RateLimitMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const rateLimitService = yield* RateLimitService
    const request = yield* HttpServerRequest.HttpServerRequest

    // Skip rate limiting for health check endpoints
    if (request.url === '/health' || request.url === '/health/db') {
      return yield* app
    }

    // Get current user if authenticated (optional)
    const currentUserOption = yield* CurrentUser.getOption

    // Determine rate limit key (user ID if authenticated, IP otherwise)
    const clientIp = getClientIp(request)
    const rateLimitKey = currentUserOption.pipe(
      Effect.map((user) => `user:${user.id}`),
      Effect.catchAll(() => Effect.succeed(`ip:${clientIp}`))
    )
    const key = yield* rateLimitKey

    // Determine strategy based on endpoint and authentication
    const isAuthenticated = currentUserOption._tag === 'Some'
    const strategy = getStrategyForRequest(request.url, isAuthenticated)

    // Check rate limit
    yield* rateLimitService.checkLimit(key, strategy)

    // Get limit info for headers
    const limitInfo = yield* rateLimitService.getLimitInfo(key, strategy)

    // Execute request
    const response = yield* app

    // Add rate limit headers
    const resetTimestamp = Math.floor(limitInfo.reset / 1000)
    return HttpServerResponse.setHeaders(response, {
      'X-RateLimit-Limit': String(limitInfo.limit),
      'X-RateLimit-Remaining': String(limitInfo.remaining),
      'X-RateLimit-Reset': String(resetTimestamp),
    })
  })
)
