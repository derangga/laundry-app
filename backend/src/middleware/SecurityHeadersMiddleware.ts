import { HttpMiddleware, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { ServerConfig } from '../configs/env'

/**
 * Security Headers Middleware
 *
 * Sets security headers on all responses:
 * - Content-Security-Policy: Prevents XSS and data injection attacks
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - X-XSS-Protection: Enables browser XSS filter
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Restricts browser features
 * - Strict-Transport-Security: Forces HTTPS (production only)
 */
export const SecurityHeadersMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const config = yield* ServerConfig
    const isProduction = config.nodeEnv === 'production'

    const response = yield* app

    // Security headers applied to all responses
    const securityHeaders: Record<string, string> = {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    }

    // HSTS header only in production (requires HTTPS)
    if (isProduction) {
      securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    }

    return HttpServerResponse.setHeaders(response, securityHeaders)
  })
)
