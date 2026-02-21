import { HttpMiddleware, HttpServerRequest } from '@effect/platform'
import { Effect } from 'effect'
import {
  PayloadTooLarge,
  InvalidContentType,
  ValidationError,
} from '../domain/http/HttpErrors'

/**
 * Request Security Middleware
 *
 * Validates requests for security issues:
 * - Body size limits (prevents DoS via large payloads)
 * - Content-Type validation (ensures proper JSON)
 * - Header injection prevention (checks for CRLF)
 * - JSON depth limiting (prevents deeply nested objects)
 */

const MAX_BODY_SIZE = 4 * 1024 * 1024 // 4MB
const MAX_JSON_DEPTH = 10

/**
 * Check JSON depth to prevent deeply nested objects
 */
const checkJsonDepth = (obj: unknown, depth = 0): number => {
  if (depth > MAX_JSON_DEPTH) {
    return depth
  }

  if (obj === null || typeof obj !== 'object') {
    return depth
  }

  let maxChildDepth = depth

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const childDepth = checkJsonDepth(item, depth + 1)
      maxChildDepth = Math.max(maxChildDepth, childDepth)
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const childDepth = checkJsonDepth((obj as any)[key], depth + 1)
        maxChildDepth = Math.max(maxChildDepth, childDepth)
      }
    }
  }

  return maxChildDepth
}

export const RequestSecurityMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    // 1. Body Size Limit
    const contentLength = request.headers['content-length']
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > MAX_BODY_SIZE) {
        return yield* Effect.fail(
          new PayloadTooLarge({
            message: 'Request payload too large',
            size,
            limit: MAX_BODY_SIZE,
          })
        )
      }
    }

    // 2. Content-Type Validation (for POST/PUT/PATCH)
    const method = request.method.toUpperCase()
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers['content-type']
      if (!contentType || !contentType.includes('application/json')) {
        return yield* Effect.fail(
          new InvalidContentType({
            message: 'Content-Type must be application/json',
            contentType,
          })
        )
      }
    }

    // 3. Header Injection Prevention
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string' && (value.includes('\n') || value.includes('\r'))) {
        return yield* Effect.fail(
          new ValidationError({
            message: 'Invalid header value detected',
            field: key,
          })
        )
      }
    }

    // 4. JSON Depth Limit (check body if present)
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Note: The body is already parsed by HttpApiBuilder before middleware
      // This is a preventive check for direct request handling
      // The actual enforcement happens at the HttpApiBuilder level
      try {
        const body = (request as any).body
        if (body && typeof body === 'object') {
          const depth = checkJsonDepth(body)
          if (depth > MAX_JSON_DEPTH) {
            return yield* Effect.fail(
              new ValidationError({
                message: 'JSON nesting depth exceeds maximum allowed',
                details: { maxDepth: MAX_JSON_DEPTH, actualDepth: depth },
              })
            )
          }
        }
      } catch {
        // If body parsing fails, let it pass through
        // HttpApiBuilder will handle the parsing error
      }
    }

    return yield* app
  })
)
