import { HttpRouter, HttpServerResponse } from '@effect/platform'
import { authRoutes } from '@api/auth/authRoutes'
import { customerRoutes } from '@api/customers/customerRoutes'

export const createAppRouter = () => {
  return HttpRouter.empty.pipe(
    HttpRouter.get('/health', HttpServerResponse.text('OK')),
    HttpRouter.mount('/api/auth', authRoutes),
    HttpRouter.mount('/api/customers', customerRoutes)
  )
}
