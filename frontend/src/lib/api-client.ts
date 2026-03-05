/**
 * Effect-based API client with automatic token refresh and typed errors.
 * Uses @effect/platform HttpClient for typed HTTP requests.
 */

import {
  Config,
  ConfigProvider,
  Duration,
  Effect,
  Layer,
  Option,
  Schema,
} from 'effect'
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpBody,
  FetchHttpClient,
} from '@effect/platform'
import {
  NetworkError,
  HttpError,
  ValidationError,
  UnauthorizedError,
} from '@/domain/api-error'
import type { ApiClientError } from '@/domain/api-error'

export {
  NetworkError,
  HttpError,
  ValidationError,
  UnauthorizedError,
  type ApiClientError,
}

const ApiBaseUrl = Config.string('VITE_API_BASE_URL')

const EnvConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromJson(import.meta.env as Record<string, string>),
)

// Configure FetchHttpClient with credentials: 'include' for cookie-based auth
const FetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, { credentials: 'include' }),
  ),
)

const ErrorBodyStruct = Schema.Struct({
  code: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
})

type ErrorBody = typeof ErrorBodyStruct.Type

function parseErrorBody(data: unknown): ErrorBody {
  return Option.getOrElse(
    Schema.decodeUnknownOption(ErrorBodyStruct)(data),
    () => ({}),
  )
}

class ApiClient extends Effect.Service<ApiClient>()('ApiClient', {
  effect: Effect.gen(function* () {
    const baseUrl = yield* ApiBaseUrl
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    )
    const semaphore = yield* Effect.makeSemaphore(1)

    /**
     * Refresh tokens using httpOnly cookie
     */
    function refreshTokens(): Effect.Effect<
      void,
      UnauthorizedError | NetworkError
    > {
      return semaphore.withPermits(1)(
        Effect.gen(function* () {
          const response = yield* httpClient
            .post('/api/auth/refresh', { body: HttpBody.unsafeJson({}) })
            .pipe(
              Effect.scoped,
              Effect.mapError((cause) => new NetworkError({ cause })),
            )

          if (response.status !== 200) {
            return yield* new UnauthorizedError({
              message: 'Session expired. Please log in again.',
            })
          }
        }).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(10),
            onTimeout: () =>
              new NetworkError({ cause: 'Token refresh timed out' }),
          }),
        ),
      )
    }

    /**
     * Execute a request using the appropriate client method
     */
    function executeRequest(
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      body?: unknown,
    ) {
      const options =
        body !== undefined ? { body: HttpBody.unsafeJson(body) } : {}
      switch (method) {
        case 'POST':
          return httpClient.post(path, options)
        case 'PUT':
          return httpClient.put(path, options)
        case 'DELETE':
          return httpClient.del(path, options)
        default:
          return httpClient.get(path)
      }
    }

    /**
     * Core API client function with automatic token refresh
     */
    function request<T, TInput = T>(
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      schema?: Schema.Schema<T, TInput, never>,
      body?: unknown,
    ): Effect.Effect<T, ApiClientError> {
      return Effect.scoped(
        Effect.gen(function* () {
          let response = yield* executeRequest(method, path, body).pipe(
            Effect.mapError((cause) => new NetworkError({ cause })),
          )

          // Handle 401 with automatic token refresh
          if (response.status === 401) {
            yield* refreshTokens()

            // Retry the original request
            response = yield* executeRequest(method, path, body).pipe(
              Effect.mapError((cause) => new NetworkError({ cause })),
            )
          }

          // Handle non-OK responses
          if (response.status < 200 || response.status >= 300) {
            const errorBody = yield* response.json.pipe(
              Effect.orElseSucceed(() => null),
            )
            const { code, message } = parseErrorBody(errorBody)

            return yield* new HttpError({
              status: response.status,
              code: code ?? 'UNKNOWN_ERROR',
              message:
                message ?? `Request failed with status ${response.status}`,
            })
          }

          // Schema validation (parses JSON + validates in one step)
          if (schema) {
            return yield* HttpClientResponse.schemaBodyJson(schema)(
              response,
            ).pipe(
              Effect.mapError((cause) => new ValidationError({ path, cause })),
            )
          }

          // No schema provided — fail with ValidationError instead of unsafe cast
          return yield* new ValidationError({
            path,
            cause: 'No schema provided for response parsing',
          })
        }),
      )
    }

    return {
      get: <T, TInput = T>(
        path: string,
        schema?: Schema.Schema<T, TInput, never>,
      ): Effect.Effect<T, ApiClientError> => request('GET', path, schema),

      post: <T, TInput = T>(
        path: string,
        data?: unknown,
        schema?: Schema.Schema<T, TInput, never>,
      ): Effect.Effect<T, ApiClientError> =>
        request('POST', path, schema, data),

      put: <T, TInput = T>(
        path: string,
        data?: unknown,
        schema?: Schema.Schema<T, TInput, never>,
      ): Effect.Effect<T, ApiClientError> => request('PUT', path, schema, data),

      del: <T, TInput = T>(
        path: string,
        schema?: Schema.Schema<T, TInput, never>,
      ): Effect.Effect<T, ApiClientError> => request('DELETE', path, schema),
    }
  }),
  dependencies: [FetchLive],
}) {}

const ApiClientLive = ApiClient.Default.pipe(
  Layer.provide(EnvConfigProvider),
  Layer.orDie,
)

/**
 * Convenience helpers for common HTTP methods.
 * Each method returns an Effect — consumers call Effect.runPromise() to bridge to Promise.
 */
export const api = {
  get: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    Effect.gen(function* () {
      const client = yield* ApiClient
      return yield* client.get(path, schema)
    }).pipe(Effect.provide(ApiClientLive)),

  post: <T, TInput = T>(
    path: string,
    data?: unknown,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    Effect.gen(function* () {
      const client = yield* ApiClient
      return yield* client.post(path, data, schema)
    }).pipe(Effect.provide(ApiClientLive)),

  put: <T, TInput = T>(
    path: string,
    data?: unknown,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    Effect.gen(function* () {
      const client = yield* ApiClient
      return yield* client.put(path, data, schema)
    }).pipe(Effect.provide(ApiClientLive)),

  del: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    Effect.gen(function* () {
      const client = yield* ApiClient
      return yield* client.del(path, schema)
    }).pipe(Effect.provide(ApiClientLive)),
}
