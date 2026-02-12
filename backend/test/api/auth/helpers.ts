import { jwtVerify, JWTPayload } from 'jose'

export interface ParsedCookies {
  accessToken?: string
  refreshToken?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'staff'
  }
}

export const parseSetCookieHeaders = (headers: string[]): ParsedCookies => {
  const result: ParsedCookies = {}

  for (const header of headers) {
    const parts = header.split(';')
    const nameValue = parts[0] ?? ''
    const [name, ...valueParts] = nameValue.split('=')
    const value = valueParts.join('=')

    if (name === 'accessToken') result.accessToken = value
    if (name === 'refreshToken') result.refreshToken = value
  }

  return result
}

export const extractCookies = (cookieHeader: string | undefined): ParsedCookies => {
  if (!cookieHeader) return {}

  const result: ParsedCookies = {}
  const cookies = cookieHeader.split(';').map((c) => c.trim())

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=')
    const value = valueParts.join('=')
    if (name === 'accessToken') result.accessToken = value
    if (name === 'refreshToken') result.refreshToken = value
  }

  return result
}

export const verifyAccessToken = async (token: string, secret: string): Promise<JWTPayload> => {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload
}

export const verifyCookieAttributes = (
  setCookieHeader: string,
  expected: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: string
    path?: string
    maxAge?: number
  }
): boolean => {
  const headerLower = setCookieHeader.toLowerCase()
  const parts = headerLower.split(';').map((p) => p.trim())

  if (expected.httpOnly && !parts.includes('httponly')) return false
  if (expected.secure && !parts.includes('secure')) return false
  if (expected.sameSite) {
    const sameSitePart = parts.find((p) => p.startsWith('samesite'))
    if (!sameSitePart || !sameSitePart.includes(expected.sameSite)) return false
  }
  if (expected.path) {
    const pathPart = parts.find((p) => p.startsWith('path'))
    if (!pathPart || !pathPart.includes(expected.path)) return false
  }
  if (expected.maxAge !== undefined) {
    const maxAgePart = parts.find((p) => p.startsWith('max-age'))
    if (!maxAgePart) return false
    const maxAgeValueStr = maxAgePart.split('=')[1]
    if (!maxAgeValueStr) return false
    const maxAgeValue = parseInt(maxAgeValueStr)
    if (maxAgeValue !== expected.maxAge) return false
  }

  return true
}

export const buildAuthHeaders = (accessToken?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
})

export const getRefreshTokenCookie = (cookies: ParsedCookies): string => cookies.refreshToken ?? ''

export const getAccessTokenCookie = (cookies: ParsedCookies): string => cookies.accessToken ?? ''
