import { HttpRouter, HttpServerResponse } from '@effect/platform'

// Placeholder router for Phase 5 - actual routes added in Phase 6
export const createAppRouter = () => {
  return HttpRouter.empty.pipe(HttpRouter.get('/health', HttpServerResponse.text('OK')))
}

// Phase 6 will expand to:
// export const ApiRouter = HttpRouter.empty.pipe(
//   HttpRouter.mount('/api/auth', authRoutes),
//   HttpRouter.mount('/api/customers', customerRoutes),
//   HttpRouter.mount('/api/orders', orderRoutes),
//   HttpRouter.mount('/api/services', serviceRoutes)
// )
