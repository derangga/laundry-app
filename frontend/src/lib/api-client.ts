/**
 * Effect-based API client with automatic token refresh and typed errors.
 */

import { Schema, Effect } from 'effect'
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

// Flag to prevent concurrent refresh attempts
let isRefreshing = false

/**
 * Refresh tokens using httpOnly cookie
 */
function refreshTokens(): Effect.Effect<
  void,
  UnauthorizedError | NetworkError
> {
  return Effect.gen(function* () {
    if (isRefreshing) {
      return yield* new UnauthorizedError({
        message: 'Token refresh already in progress.',
      })
    }

    isRefreshing = true

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        }),
      catch: (cause) => {
        isRefreshing = false
        return new NetworkError({ cause })
      },
    })

    isRefreshing = false

    if (!response.ok) {
      return yield* new UnauthorizedError({
        message: 'Session expired. Please log in again.',
      })
    }
  })
}

/**
 * Core API client function with automatic token refresh
 */
function apiClient<T, TInput = T>(
  path: string,
  schema?: Schema.Schema<T, TInput, never>,
  options: RequestInit = {},
): Effect.Effect<T, ApiClientError> {
  return Effect.gen(function* () {
    const url = `${API_BASE_URL}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value
        }
      })
    }

    const fetchOpts: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    }

    let response = yield* Effect.tryPromise({
      try: () => fetch(url, fetchOpts),
      catch: (cause) => new NetworkError({ cause }),
    })

    // Handle 401 with automatic token refresh
    if (response.status === 401 && !isRefreshing) {
      yield* refreshTokens()

      // Retry the original request
      response = yield* Effect.tryPromise({
        try: () => fetch(url, fetchOpts),
        catch: (cause) => new NetworkError({ cause }),
      })
    }

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{ code?: string; message?: string }>,
        catch: () => new NetworkError({}),
      })

      return yield* new HttpError({
        status: response.status,
        code: errorData.code || 'UNKNOWN_ERROR',
        message:
          errorData.message || `Request failed with status ${response.status}`,
      })
    }

    // Parse JSON response
    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) => new NetworkError({ cause }),
    })

    // Validate response if schema provided
    if (schema) {
      return yield* Schema.decodeUnknown(schema)(data).pipe(
        Effect.mapError((cause) => new ValidationError({ path, cause })),
      )
    }

    return data as T
  })
}

/**
 * Convenience helpers for common HTTP methods.
 * Each method returns an Effect — consumers call Effect.runPromise() to bridge to Promise.
 */
export const api = {
  get: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>(path, schema, { ...options, method: 'GET' }),

  post: <T, TInput = T>(
    path: string,
    data?: unknown,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>(path, schema, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T, TInput = T>(
    path: string,
    data?: unknown,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>(path, schema, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  del: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ): Effect.Effect<T, ApiClientError> =>
    apiClient<T, TInput>(path, schema, { ...options, method: 'DELETE' }),
}
