import { HttpApp, HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Duration, Effect, Option } from 'effect'
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
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
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
 * Append Set-Cookie headers for access and refresh tokens using PreResponseHandler.
 * Uses HttpApp.appendPreResponseHandler so handlers don't need to manage response objects.
 *
 * - accessToken cookie: Path=/, Max-Age=900 (15 minutes)
 * - refreshToken cookie: Path=/api/auth, Max-Age=604800 (7 days)
 */
export const appendAuthCookies = (accessToken: string, refreshToken: string) =>
  Effect.gen(function* () {
    const baseOptions = yield* getEnvBasedCookieOptions

    yield* HttpApp.appendPreResponseHandler((_req, response) =>
      HttpServerResponse.setCookie(response, 'accessToken', accessToken, {
        ...baseOptions,
        path: '/',
        maxAge: Duration.seconds(900),
      }).pipe(
        Effect.flatMap((resp) =>
          HttpServerResponse.setCookie(resp, 'refreshToken', refreshToken, {
            ...baseOptions,
            path: '/',
            maxAge: Duration.seconds(604800),
          })
        ),
        Effect.orDie
      )
    )
  }).pipe(Effect.orDie)

/**
 * Append Set-Cookie headers that clear auth cookies (Max-Age=0, Expires=epoch).
 * Used during logout.
 */
export const appendClearAuthCookies = () =>
  Effect.gen(function* () {
    const baseOptions = yield* getEnvBasedCookieOptions

    yield* HttpApp.appendPreResponseHandler((_req, response) =>
      HttpServerResponse.setCookie(response, 'accessToken', '', {
        ...baseOptions,
        path: '/',
        maxAge: Duration.seconds(0),
        expires: new Date(0),
      }).pipe(
        Effect.flatMap((resp) =>
          HttpServerResponse.setCookie(resp, 'refreshToken', '', {
            ...baseOptions,
            path: '/api/auth',
            maxAge: Duration.seconds(0),
            expires: new Date(0),
          })
        ),
        Effect.orDie
      )
    )
  }).pipe(Effect.orDie)

/**
 * Extract a named cookie value from request headers.
 * Returns Option.some(value) if found, Option.none() otherwise.
 */
const extractCookieValue = (
  request: HttpServerRequest.HttpServerRequest,
  name: string
): Option.Option<string> => {
  const cookieHeader = request.headers['cookie']

  if (!cookieHeader) {
    return Option.none()
  }

  // Parse cookie header (format: "name1=value1; name2=value2")
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [cookieName, ...valueParts] = cookie.trim().split('=')
      if (cookieName && valueParts.length > 0) {
        acc[cookieName] = valueParts.join('=')
      }
      return acc
    },
    {} as Record<string, string>
  )

  const value = cookies[name]
  return value ? Option.some(value) : Option.none()
}

/**
 * Extract access token from request cookies.
 * Returns Option.some(token) if found, Option.none() otherwise.
 */
export const extractAccessTokenFromCookie = (
  request: HttpServerRequest.HttpServerRequest
): Option.Option<string> => extractCookieValue(request, 'accessToken')

/**
 * Extract refresh token from request cookies.
 * Returns Option.some(token) if found, Option.none() otherwise.
 */
export const extractRefreshTokenFromCookie = (
  request: HttpServerRequest.HttpServerRequest
): Option.Option<string> => extractCookieValue(request, 'refreshToken')

/**
 * @deprecated Use `appendAuthCookies` instead. This function requires managing response objects directly.
 *
 * Set authentication cookies in the HTTP response
 * - accessToken: 15 minutes expiry, available on all paths
 * - refreshToken: 7 days expiry, only sent to /api/auth paths
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
      path: '/api/auth',
      maxAge: 604800, // 7 days (matches refresh token expiry)
    })

    return yield* HttpServerResponse.setHeaders(response, {
      'Set-Cookie': [accessTokenCookie, refreshTokenCookie],
    })
  })

/**
 * @deprecated Use `appendClearAuthCookies` instead. This function requires managing response objects directly.
 *
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
      path: '/api/auth',
      maxAge: 0,
      expires: new Date(0),
    })

    return yield* HttpServerResponse.setHeaders(response, {
      'Set-Cookie': [clearAccessToken, clearRefreshToken],
    })
  })
