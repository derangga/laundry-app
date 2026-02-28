import { createMiddleware } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { Effect } from 'effect'
import {
  AccessTokenInvalidError,
  NetworkError,
  RefreshTokenFailedError,
} from '@/domain/auth-error'

const API_BASE_URL =
  process.env.TANSTACK_API_BASE_URL || 'http://localhost:3000'

function validateAccessToken(
  cookieHeader: string,
): Effect.Effect<boolean, never> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${API_BASE_URL}/api/auth/me`, {
          method: 'GET',
          headers: { Cookie: cookieHeader },
        }),
      catch: (cause) => new NetworkError({ cause }),
    })

    if (!response.ok) {
      yield* new AccessTokenInvalidError({ status: response.status })
    }

    return true
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))
}

function processRefreshToken(
  cookieHeader: string,
): Effect.Effect<boolean, never> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookieHeader,
          },
          body: JSON.stringify({}),
        }),
      catch: (cause) => new NetworkError({ cause }),
    })

    if (!response.ok) {
      yield* new RefreshTokenFailedError({ status: response.status })
    }

    return true
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))
}

export const authMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const accessToken = getCookie('accessToken')
    const cookieHeader = request.headers.get('cookie') ?? ''
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      if (accessToken) {
        const isValid = await Effect.runPromise(
          validateAccessToken(cookieHeader),
        )
        if (isValid) throw redirect({ to: '/' })
      }
      return next()
    }

    if (accessToken) {
      const isValid = await Effect.runPromise(validateAccessToken(cookieHeader))
      if (isValid) {
        return next()
      }
    }

    const refreshResult = await Effect.runPromise(
      processRefreshToken(cookieHeader),
    )

    if (refreshResult) {
      return next()
    }

    throw redirect({ to: '/login' })
  },
)
