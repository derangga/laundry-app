import { HttpMiddleware, HttpServerRequest } from '@effect/platform'
import { Effect } from 'effect'

export const loggingMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const startTime = Date.now()

    yield* Effect.logInfo(`→ ${request.method} ${request.url}`)

    // FIX: Use Effect.either to keep startTime in scope for both paths
    const result = yield* Effect.either(app)
    const duration = Date.now() - startTime

    if (result._tag === 'Right') {
      const response = result.right
      yield* Effect.logInfo(`← ${request.method} ${request.url} ${response.status} (${duration}ms)`)
      return response
    } else {
      yield* Effect.logError(`← ${request.method} ${request.url} ERROR (${duration}ms)`)
      return yield* Effect.fail(result.left)
    }
  })
)
