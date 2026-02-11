import { HttpRouter, HttpServerResponse } from '@effect/platform'
import { authRoutes } from '@api/auth/authRoutes'

export const createAppRouter = () => {
  return HttpRouter.empty.pipe(
    HttpRouter.get('/health', HttpServerResponse.text('OK')),
    HttpRouter.mount('/api/auth', authRoutes)
  )
}

// Future phases will add:
// HttpRouter.mount('/api/customers', customerRoutes),
// HttpRouter.mount('/api/orders', orderRoutes),
// HttpRouter.mount('/api/services', serviceRoutes)
