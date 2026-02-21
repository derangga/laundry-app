import { HttpMiddleware, HttpServerRequest } from '@effect/platform'
import { Effect } from 'effect'
import { AppLogger } from 'src/http/Logger'

export const RequestLoggingMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const logger = yield* AppLogger
    const request = yield* HttpServerRequest.HttpServerRequest

    // Skip logging for health check endpoints
    if (request.url === '/health' || request.url === '/health/db') {
      return yield* app
    }

    const correlationId = request.headers['x-request-id'] ?? crypto.randomUUID()
    const startTime = Date.now()

    yield* logger.info('Incoming request', {
      correlationId,
      method: request.method,
      path: request.url,
      userAgent: request.headers['user-agent'],
    })

    const response = yield* app

    yield* logger.info('Request completed', {
      correlationId,
      method: request.method,
      path: request.url,
      status: response.status,
      durationMs: Date.now() - startTime,
    })

    return response
  })
)
