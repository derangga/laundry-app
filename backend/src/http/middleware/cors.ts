import { HttpMiddleware, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, Config } from 'effect'

export const corsMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const corsOrigin = yield* Config.string('CORS_ORIGIN').pipe(
      Config.withDefault('http://localhost:5173')
    )

    const request = yield* HttpServerRequest.HttpServerRequest
    const method = request.method

    // Handle preflight
    if (method === 'OPTIONS') {
      return yield* HttpServerResponse.empty({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Handle actual request
    const response = yield* app

    // FIX: response is a value, not an Effect - use setHeaders directly
    return HttpServerResponse.setHeaders(response, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
    })
  })
)
