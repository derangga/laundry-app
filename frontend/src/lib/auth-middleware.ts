import { createMiddleware } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { Effect, Option } from 'effect'
import {
  AccessTokenInvalidError,
  NetworkError,
  RefreshTokenFailedError,
} from '@/domain/auth-error'
import { ApiBaseUrl, ConfigLive } from './config'

const getBaseUrl = Effect.gen(function* () {
  return yield* ApiBaseUrl
}).pipe(Effect.provide(ConfigLive), Effect.orDie)

function validateAccessToken(
  baseUrl: string,
  cookieHeader: string,
): Effect.Effect<boolean, never> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${baseUrl}/api/auth/me`, {
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
  baseUrl: string,
  cookieHeader: string,
): Effect.Effect<Response, NetworkError | RefreshTokenFailedError> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${baseUrl}/api/auth/refresh`, {
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

    return response
  })
}

export const authMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const baseUrl = await Effect.runPromise(getBaseUrl)
    const accessToken = getCookie('accessToken')
    const cookieHeader = request.headers.get('cookie') ?? ''
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      if (accessToken) {
        const isValid = await Effect.runPromise(
          validateAccessToken(baseUrl, cookieHeader),
        )
        if (isValid) throw redirect({ to: '/' })
      }
      return next()
    }

    if (accessToken) {
      const isValid = await Effect.runPromise(
        validateAccessToken(baseUrl, cookieHeader),
      )
      if (isValid) {
        return next()
      }
    }

    const refreshResult = await Effect.runPromise(
      Effect.option(processRefreshToken(baseUrl, cookieHeader)),
    )

    if (Option.isSome(refreshResult)) {
      const result = await next()
      refreshResult.value.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          result.response.headers.append('set-cookie', value)
        }
      })
      return result
    }

    throw redirect({ to: '/login' })
  },
)
