import { HttpMiddleware, HttpServerRequest } from '@effect/platform'
import { Effect } from 'effect'
import { PayloadTooLarge, InvalidContentType, ValidationError } from '../domain/http/HttpErrors'

/**
 * Request Security Middleware
 *
 * Validates requests for security issues:
 * - Body size limits (prevents DoS via large payloads)
 * - Content-Type validation (ensures proper JSON)
 * - Header injection prevention (checks for CRLF)
 */

const MAX_BODY_SIZE = 4 * 1024 * 1024 // 4MB

export const RequestSecurityMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    // 1. Body Size Limit
    const contentLength = request.headers['content-length']
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > MAX_BODY_SIZE) {
        return yield* new PayloadTooLarge({
          message: 'Request payload too large',
          size,
          limit: MAX_BODY_SIZE,
        })
      }
    }

    // 2. Content-Type Validation (for POST/PUT/PATCH)
    const method = request.method.toUpperCase()
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers['content-type']
      if (!contentType || !contentType.includes('application/json')) {
        return yield* new InvalidContentType({
          message: 'Content-Type must be application/json',
          contentType,
        })
      }
    }

    // 3. Header Injection Prevention
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string' && (value.includes('\n') || value.includes('\r'))) {
        return yield* new ValidationError({
          message: 'Invalid header value detected',
          field: key,
        })
      }
    }

    return yield* app
  })
)
