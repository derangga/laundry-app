/**
 * API client with automatic token refresh and typed errors.
 */

import { Schema, Effect } from 'effect'

const API_BASE_URL = 'http://localhost:3000'

/**
 * Custom API error class with status code and error code
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Helper to validate response data against a schema
 * Throws ApiError with validation details if validation fails
 */
async function validateResponse<T, TInput>(
  schema: Schema.Schema<T, TInput, never>,
  data: unknown,
  path: string,
): Promise<T> {
  try {
    const decode = Schema.decodeUnknown(schema)
    return await Effect.runPromise(decode(data))
  } catch (error) {
    // Format validation error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown validation error'
    throw new ApiError(
      500,
      'VALIDATION_ERROR',
      `Invalid response from ${path}\nValidation error: ${errorMessage}`,
    )
  }
}

// Flag to prevent concurrent refresh attempts
let isRefreshing = false

/**
 * Refresh tokens using httpOnly cookie
 * @returns true if refresh succeeded, false otherwise
 */
async function refreshTokens(): Promise<boolean> {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    return false
  }

  isRefreshing = true

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body - refresh token sent via cookie
      credentials: 'include',
    })

    // No token storage needed - new cookies set by backend via Set-Cookie headers
    return response.ok
  } catch {
    return false
  } finally {
    isRefreshing = false
  }
}

/**
 * Core API client function with automatic token refresh
 */
export async function apiClient<T, TInput = T>(
  path: string,
  schema?: Schema.Schema<T, TInput, never>,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Merge options.headers if provided
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value
      }
    })
  }

  // No Authorization header needed - httpOnly cookies sent automatically

  // Make the request
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Handle 401 with automatic token refresh
  if (response.status === 401 && !isRefreshing) {
    const refreshed = await refreshTokens()

    if (refreshed) {
      // Retry the original request - new cookies already set by refresh endpoint
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })
    } else {
      // Refresh failed - throw error
      throw new ApiError(
        401,
        'UNAUTHORIZED',
        'Session expired. Please log in again.',
      )
    }
  }

  // Handle non-OK responses
  if (!response.ok) {
    let errorData: any
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: 'An error occurred' }
    }

    throw new ApiError(
      response.status,
      errorData.code || 'UNKNOWN_ERROR',
      errorData.message || `Request failed with status ${response.status}`,
    )
  }

  // Parse JSON response
  const data = await response.json()

  // Validate response if schema provided
  if (schema) {
    return validateResponse(schema, data, path)
  }

  return data
}

/**
 * Convenience helpers for common HTTP methods
 */
export const api = {
  get: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ) => apiClient<T, TInput>(path, schema, { ...options, method: 'GET' }),

  post: <T, TInput = T>(
    path: string,
    data?: any,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ) =>
    apiClient<T, TInput>(path, schema, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T, TInput = T>(
    path: string,
    data?: any,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ) =>
    apiClient<T, TInput>(path, schema, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  del: <T, TInput = T>(
    path: string,
    schema?: Schema.Schema<T, TInput, never>,
    options?: RequestInit,
  ) => apiClient<T, TInput>(path, schema, { ...options, method: 'DELETE' }),
}
