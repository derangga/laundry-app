import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect, Option } from 'effect'
import { ServerConfig } from '@configs/env'

interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  path?: string
  maxAge?: number
  expires?: Date
}

/**
 * Get cookie options based on environment (production vs development)
 */
export const getEnvBasedCookieOptions = Effect.gen(function* () {
  const config = yield* ServerConfig
  const isProduction = config.nodeEnv === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
  }
})

/**
 * Format cookie string from name, value, and options
 */
const formatCookie = (name: string, value: string, options: CookieOptions): string => {
  const parts = [`${name}=${value}`]

  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)

  return parts.join('; ')
}

/**
 * Set authentication cookies in the HTTP response
 * - accessToken: 15 minutes expiry, available on all paths
 * - refreshToken: 7 days expiry, only sent to /api/auth/refresh
 */
export const setAuthCookies = (
  response: HttpServerResponse.HttpServerResponse,
  accessToken: string,
  refreshToken: string
) =>
  Effect.gen(function* () {
    const baseOptions = yield* getEnvBasedCookieOptions

    const accessTokenCookie = formatCookie('accessToken', accessToken, {
      ...baseOptions,
      path: '/',
      maxAge: 900, // 15 minutes (matches JWT expiry)
    })

    const refreshTokenCookie = formatCookie('refreshToken', refreshToken, {
      ...baseOptions,
      path: '/api/auth/refresh',
      maxAge: 604800, // 7 days (matches refresh token expiry)
    })

    return yield* HttpServerResponse.setHeaders(response, {
      'Set-Cookie': [accessTokenCookie, refreshTokenCookie],
    })
  })

/**
 * Clear authentication cookies on logout
 * Sets maxAge=0 and expires to epoch to ensure immediate deletion
 */
export const clearAuthCookies = (response: HttpServerResponse.HttpServerResponse) =>
  Effect.gen(function* () {
    const baseOptions = yield* getEnvBasedCookieOptions

    const clearAccessToken = formatCookie('accessToken', '', {
      ...baseOptions,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })

    const clearRefreshToken = formatCookie('refreshToken', '', {
      ...baseOptions,
      path: '/api/auth/refresh',
      maxAge: 0,
      expires: new Date(0),
    })

    return yield* HttpServerResponse.setHeaders(response, {
      'Set-Cookie': [clearAccessToken, clearRefreshToken],
    })
  })

/**
 * Extract refresh token from request cookies
 * Returns Option.some(token) if found, Option.none() otherwise
 */
export const extractRefreshTokenFromCookie = (
  request: HttpServerRequest.HttpServerRequest
): Option.Option<string> => {
  const cookieHeader = request.headers['cookie']

  if (!cookieHeader) {
    return Option.none()
  }

  // Parse cookie header (format: "name1=value1; name2=value2")
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=')
      if (name && valueParts.length > 0) {
        acc[name] = valueParts.join('=')
      }
      return acc
    },
    {} as Record<string, string>
  )

  const refreshToken = cookies['refreshToken']
  return refreshToken ? Option.some(refreshToken) : Option.none()
}
