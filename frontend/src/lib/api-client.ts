/**
 * API client with automatic token refresh and typed errors.
 */

import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from './auth'

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

// Flag to prevent concurrent refresh attempts
let isRefreshing = false

/**
 * Refresh tokens using the refresh token from localStorage
 * @returns true if refresh succeeded, false otherwise
 */
async function refreshTokens(): Promise<boolean> {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    return false
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return false
  }

  isRefreshing = true

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const data = await response.json()
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    return true
  } catch (error) {
    clearTokens()
    return false
  } finally {
    isRefreshing = false
  }
}

/**
 * Core API client function with automatic token refresh
 */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const token = getAccessToken()

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

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

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
      // Retry the original request with the new token
      const newToken = getAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
      }

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

  // Parse and return JSON response
  return response.json()
}

/**
 * Convenience helpers for common HTTP methods
 */
export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiClient<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, data?: any, options?: RequestInit) =>
    apiClient<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(path: string, data?: any, options?: RequestInit) =>
    apiClient<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  del: <T>(path: string, options?: RequestInit) =>
    apiClient<T>(path, { ...options, method: 'DELETE' }),
}
