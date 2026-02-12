import { HttpRouter, HttpServerResponse } from '@effect/platform'
import { authRoutes } from '@api/auth/authRoutes'
import { customerRoutes } from '@api/customers/customerRoutes'

/**
 * HTTP Router Configuration
 *
 * Routes are organized hierarchically:
 * - /health - Health check endpoint
 * - /api/auth - Authentication endpoints
 * - /api/customers - Customer management endpoints
 */
export const createAppRouter = () => {
  return HttpRouter.empty.pipe(
    HttpRouter.get('/health', HttpServerResponse.text('OK')),
    HttpRouter.mount('/api/auth', authRoutes),
    HttpRouter.mount('/api/customers', customerRoutes)
  )
}
