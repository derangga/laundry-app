/**
 * Effect-based API client with automatic token refresh and typed errors.
 * Uses @effect/platform HttpClient for typed HTTP requests.
 */

import type { Schema, Scope } from 'effect'
import { Effect, Layer, pipe } from 'effect'
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
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

const API_BASE_URL = 'http://localhost:3000'

// Configure FetchHttpClient with credentials: 'include' for cookie-based auth
const FetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, { credentials: 'include' }),
  ),
)

// Flag to prevent concurrent refresh attempts
let isRefreshing = false

/**
 * Refresh tokens using httpOnly cookie
 */
function refreshTokens(): Effect.Effect<
  void,
  UnauthorizedError | NetworkError,
  HttpClient.HttpClient | Scope.Scope
> {
  return Effect.gen(function* () {
    if (isRefreshing) {
      return yield* new UnauthorizedError({
        message: 'Token refresh already in progress.',
      })
    }

    isRefreshing = true
    const client = yield* HttpClient.HttpClient
    const response = yield* pipe(
      HttpClientRequest.post(`${API_BASE_URL}/api/auth/refresh`),
      HttpClientRequest.bodyJson({}),
      Effect.flatMap((req) => client.execute(req)),
      Effect.mapError((cause) => {
        isRefreshing = false
        return new NetworkError({ cause })
      }),
    )

    isRefreshing = false

    if (response.status !== 200) {
      return yield* new UnauthorizedError({
        message: 'Session expired. Please log in again.',
      })
    }
  })
}

const makeRequest = (method: string, url: string) => {
  switch (method) {
    case 'POST':
      return HttpClientRequest.post(url)
    case 'PUT':
      return HttpClientRequest.put(url)
    case 'DELETE':
      return HttpClientRequest.del(url)
    default:
      return HttpClientRequest.get(url)
  }
}

function parseErrorBody(data: unknown): {
  code: string | undefined
  message: string | undefined
} {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>
    return {
      code: typeof obj.code === 'string' ? obj.code : undefined,
      message: typeof obj.message === 'string' ? obj.message : undefined,
    }
  }
  return { code: undefined, message: undefined }
}

/**
 * Core API client function with automatic token refresh
 */
function apiClient<T, TInput = T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  schema?: Schema.Schema<T, TInput, never>,
  body?: unknown,
): Effect.Effect<T, ApiClientError> {
  const program = Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const url = `${API_BASE_URL}${path}`

    const baseRequest = makeRequest(method, url)

    const execute = (req: HttpClientRequest.HttpClientRequest) =>
      body !== undefined
        ? pipe(
            HttpClientRequest.bodyJson(body)(req),
            Effect.flatMap((r) => client.execute(r)),
          )
        : client.execute(req)

    let response = yield* execute(baseRequest).pipe(
      Effect.mapError((cause) => new NetworkError({ cause })),
    )

    // Handle 401 with automatic token refresh
    if (response.status === 401 && !isRefreshing) {
      yield* refreshTokens()

      // Retry the original request
      response = yield* execute(baseRequest).pipe(
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
        message: message ?? `Request failed with status ${response.status}`,
      })
    }

    // Schema validation (parses JSON + validates in one step)
    if (schema) {
      return yield* HttpClientResponse.schemaBodyJson(schema)(response).pipe(
        Effect.mapError((cause) => new ValidationError({ path, cause })),
      )
    }

    // No schema — raw JSON (cast unavoidable: json returns unknown, caller expects T)
    const data = yield* response.json.pipe(
      Effect.mapError((cause) => new NetworkError({ cause })),
    )

    return data as T
  })

  // Provide FetchHttpClient layer internally — consumers get Effect<T, ApiClientError>
  return program.pipe(Effect.scoped, Effect.provide(FetchLive))
}

/**
 * Convenience helpers for common HTTP methods.
 * Each method returns an Effect — consumers call Effect.runPromise() to bridge to Promise.
 */
export const api = {
  get: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>('GET', path, schema),

  post: <T, TInput = T>(
    path: string,
    data?: unknown,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>('POST', path, schema, data),

  put: <T, TInput = T>(
    path: string,
    data?: unknown,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>('PUT', path, schema, data),

  del: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>('DELETE', path, schema),
}
