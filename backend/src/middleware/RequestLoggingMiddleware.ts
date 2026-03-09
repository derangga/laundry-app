import { HttpMiddleware, HttpServerRequest } from '@effect/platform'
import { Effect, Metric, MetricBoundaries } from 'effect'
import { AppLogger } from 'src/http/Logger'

const HttpRequestDuration = Metric.histogram(
  'http_server_request_duration_seconds',
  MetricBoundaries.fromIterable([0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10])
)

const normalizeRoute = (url: string): string =>
  url
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')

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

    const durationSeconds = (Date.now() - startTime) / 1000
    const normalizedRoute = normalizeRoute(request.url)

    yield* Metric.update(
      HttpRequestDuration.pipe(
        Metric.tagged('http_route', normalizedRoute),
        Metric.tagged('http_method', request.method),
        Metric.tagged('http_status_code', String(response.status))
      ),
      durationSeconds
    )

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
