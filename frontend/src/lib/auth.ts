/**
 * Token management for authentication.
 * - Access token stored in memory (cleared on page refresh, immune to XSS)
 * - Refresh token stored in localStorage (survives page refresh)
 */

const REFRESH_TOKEN_KEY = 'refreshToken'

// Module-scoped variable for access token (in-memory storage)
let accessToken: string | null = null

/**
 * Get the current access token from memory
 */
export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Set the access token in memory
 */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

/**
 * Get the refresh token from localStorage (SSR-safe)
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Set the refresh token in localStorage (SSR-safe)
 */
export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return
  }
  if (token === null) {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } else {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  }
}

/**
 * Clear both access and refresh tokens
 */
export function clearTokens(): void {
  setAccessToken(null)
  setRefreshToken(null)
}
