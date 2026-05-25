/**
 * Auth-aware HTTP client derived from the backend contract (`AppApi`).
 *
 * Replaces the hand-rolled `api-client.ts`. The client is generated via
 * `HttpApiClient.make(AppApi)`, giving end-to-end type safety: every endpoint
 * name, payload, path, urlParams, success, and typed error union comes straight
 * from the single source of truth in `@laundry-app/api-contract`.
 *
 * Auth behavior is preserved from the old client:
 *  - `credentials: 'include'` (via `FetchLive`) so the browser auto-sends the
 *    httpOnly `accessToken` cookie. The derived client never has to supply a
 *    security credential — `HttpApiClient`'s generated methods take only
 *    `{ path?, urlParams?, payload?, headers? }`, NOT a security argument, so
 *    the cookie/bearer schemes on the contract's middleware are satisfied
 *    transparently by the browser. (RISK B.)
 *  - A shared, semaphore-guarded silent token refresh on 401 + single retry,
 *    implemented as an `HttpClient` transform so it wraps every request once.
 */

import { Cause, Duration, Effect, Exit, Layer, ManagedRuntime } from 'effect'
import {
  HttpApiClient,
  HttpBody,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform'
import { AppApi } from '@laundry-app/api-contract'
import { ApiBaseUrl, EnvConfigProvider, FetchLive } from './config'

/**
 * Layer that builds the auth-aware, contract-derived client and exposes it
 * through a Tag-like service handle.
 */
class ApiClient extends Effect.Service<ApiClient>()('ApiClient', {
  effect: Effect.gen(function* () {
    const baseUrl = yield* ApiBaseUrl

    // Base HttpClient with the SSR/internal base URL prepended (empty in the
    // browser, where relative URLs are proxied).
    const baseHttpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
    )

    // Single shared permit guards concurrent refreshes: the first 401 refreshes,
    // everyone else waits, nobody stampedes `/api/auth/refresh`.
    const semaphore = yield* Effect.makeSemaphore(1)

    // Guarded silent refresh. The single permit serializes concurrent 401s so
    // only one refresh hits `/api/auth/refresh`; the rest await it. Failures are
    // swallowed — if the session is truly gone the retried request stays 401 and
    // `HttpApiClient` surfaces the typed `Unauthorized` to the caller.
    const refreshTokens = semaphore
      .withPermits(1)(
        baseHttpClient
          .post('/api/auth/refresh', { body: HttpBody.unsafeJson({}) })
          .pipe(Effect.scoped),
      )
      .pipe(
        Effect.timeoutFail({
          duration: Duration.seconds(10),
          onTimeout: () => new Error('Token refresh timed out'),
        }),
        Effect.ignore,
      )

    // Transform every request: a non-2xx 401 arrives here as a *successful*
    // response value (HttpClient does not fail on non-2xx). On the first 401 we
    // refresh once and re-issue the request a single time; whatever the retry
    // returns (success or another 401) is handed back to HttpApiClient, which
    // maps it to the success schema or the typed `Unauthorized` error.
    const authClient = baseHttpClient.pipe(
      HttpClient.transformResponse((effect) =>
        Effect.flatMap(effect, (response) =>
          response.status === 401
            ? // Refresh once, then re-issue the original request exactly once.
              refreshTokens.pipe(Effect.zipRight(effect))
            : Effect.succeed(response),
        ),
      ),
    )

    const client = yield* HttpApiClient.make(AppApi, {
      // The base URL is already prepended on `authClient`; `transformClient`
      // swaps in our fully-configured, auth-aware client.
      transformClient: () => authClient,
    })

    return { client }
  }),
  dependencies: [FetchLive],
}) {}

const ApiClientLive = ApiClient.Default.pipe(
  Layer.provide(EnvConfigProvider),
  Layer.orDie,
)

/**
 * The contract-derived client type. `ApiClientType[Group][endpoint]` is the
 * fully-typed call; its rejection (Effect error channel) is the endpoint's
 * typed error union (e.g. `InvalidCredentials | ValidationError | ...`) plus
 * `HttpClientError`. All members carry `_tag` and `message`.
 */
export type ApiClientType = ApiClient['client']

/**
 * Extracts the typed error union from a client-method call, for annotating
 * TanStack `useMutation`/`useQuery` so `onError` can `switch (error._tag)`.
 *
 * Example: `ClientError<ReturnType<ApiClientType['Auth']['login']>>`.
 */
export type ClientError<T> =
  T extends Effect.Effect<unknown, infer E, unknown> ? E : never

/**
 * Browser singleton runtime holding the derived client + shared refresh
 * semaphore. One instance for the whole app lifetime.
 */
export const runtime = ManagedRuntime.make(ApiClientLive)

/**
 * Resolve the derived, auth-aware client (memoized by the runtime layer).
 */
const getClient = Effect.map(ApiClient, (s) => s.client)

/**
 * Run a client effect built from the derived client and surface the RAW tagged
 * error to the caller's Promise rejection.
 *
 * `runtime.runPromise` would reject with a `FiberFailure` wrapping the error,
 * so `error._tag` would be unreadable in TanStack Query `onError`. We run to an
 * Exit and re-reject with the underlying failure value (the tagged error), so
 * hooks can `switch (error._tag)`.
 */
export const runClient = async <A, E>(
  build: (client: ApiClient['client']) => Effect.Effect<A, E>,
): Promise<A> => {
  const exit = await runtime.runPromiseExit(Effect.flatMap(getClient, build))
  if (Exit.isSuccess(exit)) {
    return exit.value
  }
  const failure = Cause.failureOption(exit.cause)
  if (failure._tag === 'Some') {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw failure.value
  }
  throw Cause.squash(exit.cause)
}
