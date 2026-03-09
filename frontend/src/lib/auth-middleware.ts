import { createMiddleware } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { Effect, Layer, Option, pipe } from 'effect'
import {
  HttpClient,
  HttpClientRequest,
  HttpBody,
  Headers,
} from '@effect/platform'
import {
  NetworkError,
  RefreshTokenFailedError,
} from '@/domain/auth-error'
import { ApiBaseUrl, ConfigLive, FetchLive } from './config'

type AuthResult =
  | { readonly action: 'next' }
  | { readonly action: 'redirect'; readonly to: string }
  | { readonly action: 'next-with-cookie'; readonly cookie: string }

class AuthClient extends Effect.Service<AuthClient>()('AuthClient', {
  effect: Effect.gen(function* () {
    const baseUrl = yield* ApiBaseUrl
    const baseClient = yield* HttpClient.HttpClient

    const client = baseClient.pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    )

    const withCookie = (cookieHeader: string) =>
      client.pipe(
        HttpClient.mapRequest(
          HttpClientRequest.setHeader('Cookie', cookieHeader),
        ),
      )

    const validateAccessToken = (
      httpClient: HttpClient.HttpClient,
    ): Effect.Effect<boolean> =>
      Effect.scoped(
        httpClient.get('/api/auth/me').pipe(
          Effect.map((response) => response.status === 200),
          Effect.catchAll(() => Effect.succeed(false)),
        ),
      )

    const refreshToken = (
      httpClient: HttpClient.HttpClient,
    ): Effect.Effect<
      string | null,
      NetworkError | RefreshTokenFailedError
    > =>
      Effect.scoped(
        Effect.gen(function* () {
          const response = yield* httpClient
            .post('/api/auth/refresh', { body: HttpBody.unsafeJson({}) })
            .pipe(Effect.mapError((cause) => new NetworkError({ cause })))

          if (response.status !== 200) {
            return yield* new RefreshTokenFailedError({
              status: response.status,
            })
          }

          const setCookieHeader = pipe(
            Headers.get(response.headers, 'set-cookie'),
            Option.getOrNull,
          )

          if (!setCookieHeader) {
            return yield* new RefreshTokenFailedError({ status: 0 })
          }

          return setCookieHeader
        }),
      )

    const check = (
      accessToken: string | undefined,
      cookieHeader: string,
      pathname: string,
    ): Effect.Effect<AuthResult> =>
      Effect.gen(function* () {
        const httpClient = withCookie(cookieHeader)

        if (pathname === '/login') {
          if (accessToken) {
            const isValid = yield* validateAccessToken(httpClient)
            if (isValid) return { action: 'redirect' as const, to: '/' }
          }
          return { action: 'next' as const }
        }

        if (accessToken) {
          const isValid = yield* validateAccessToken(httpClient)
          if (isValid) return { action: 'next' as const }
        }

        const refreshResult = yield* Effect.option(
          refreshToken(httpClient),
        )

        if (Option.isSome(refreshResult) && refreshResult.value) {
          return {
            action: 'next-with-cookie' as const,
            cookie: refreshResult.value,
          }
        }

        return { action: 'redirect' as const, to: '/login' }
      })

    return { check } as const
  }),
  dependencies: [
    Layer.mergeAll(ConfigLive, FetchLive),
  ],
}) {}

export const authMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const accessToken = getCookie('accessToken')
    const cookieHeader = request.headers.get('cookie') ?? ''
    const url = new URL(request.url)

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const authClient = yield* AuthClient
        return yield* authClient.check(accessToken, cookieHeader, url.pathname)
      }).pipe(Effect.provide(AuthClient.Default)),
    )

    switch (result.action) {
      case 'redirect':
        throw redirect({ to: result.to })
      case 'next-with-cookie': {
        const response = await next()
        response.response.headers.append('set-cookie', result.cookie)
        return response
      }
      case 'next':
        return next()
    }
  },
)
