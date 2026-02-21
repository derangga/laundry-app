import { Effect, Duration, Schedule, Ref } from 'effect'
import { RateLimitExceeded } from '../../domain/http/HttpErrors'
import { RateLimitEntry, RateLimitStrategy, RateLimitInfo } from '../../domain/RateLimit'

/**
 * Rate Limiting Service
 *
 * In-memory rate limiting with automatic cleanup.
 * Suitable for single-instance deployment (MVP).
 *
 * Future scaling: Replace with Redis-backed implementation for multi-instance.
 */

/**
 * Rate limiting strategies for different endpoints
 */
export const RateLimitStrategies = {
  login: new RateLimitStrategy({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),
  refresh: new RateLimitStrategy({
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),
  authenticatedApi: new RateLimitStrategy({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  }),
  publicApi: new RateLimitStrategy({
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  }),
  orderCreation: new RateLimitStrategy({
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  }),
  customerSearch: new RateLimitStrategy({
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  }),
} as const

export class RateLimitService extends Effect.Service<RateLimitService>()('RateLimitService', {
  effect: Effect.gen(function* () {
    // In-memory store: Map<key, { count, resetAt }>
    const store = yield* Ref.make<Map<string, RateLimitEntry>>(new Map())

    /**
     * Cleanup expired entries every minute
     */
    const cleanup = Effect.gen(function* () {
      const now = Date.now()
      yield* Ref.update(store, (map) => {
        const newMap = new Map(map)
        for (const [key, entry] of newMap.entries()) {
          if (entry.resetAt < now) {
            newMap.delete(key)
          }
        }
        return newMap
      })
    })

    // Start cleanup fiber (runs in background)
    yield* cleanup.pipe(
      Effect.repeat(Schedule.fixed(Duration.minutes(1))),
      Effect.forkDaemon
    )

    /**
     * Check rate limit for a key
     * Returns Effect that fails with RateLimitExceeded if limit exceeded
     */
    const checkLimit = (
      key: string,
      strategy: RateLimitStrategy
    ): Effect.Effect<void, RateLimitExceeded> =>
      Effect.gen(function* () {
        const now = Date.now()
        const currentStore = yield* Ref.get(store)
        const entry = currentStore.get(key)

        // No entry or expired - allow request
        if (!entry || entry.resetAt < now) {
          yield* Ref.update(store, (map) => {
            const newMap = new Map(map)
            newMap.set(
              key,
              new RateLimitEntry({
                count: 1,
                resetAt: now + strategy.windowMs,
              })
            )
            return newMap
          })
          return
        }

        // Check if limit exceeded
        if (entry.count >= strategy.maxRequests) {
          const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
          return yield* Effect.fail(
            new RateLimitExceeded({
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: retryAfterSeconds,
              limit: strategy.maxRequests,
            })
          )
        }

        // Increment count
        yield* Ref.update(store, (map) => {
          const newMap = new Map(map)
          newMap.set(
            key,
            new RateLimitEntry({
              count: entry.count + 1,
              resetAt: entry.resetAt,
            })
          )
          return newMap
        })
      })

    /**
     * Get current limit info for a key (for adding headers)
     */
    const getLimitInfo = (
      key: string,
      strategy: RateLimitStrategy
    ): Effect.Effect<RateLimitInfo> =>
      Effect.gen(function* () {
        const now = Date.now()
        const currentStore = yield* Ref.get(store)
        const entry = currentStore.get(key)

        if (!entry || entry.resetAt < now) {
          return new RateLimitInfo({
            limit: strategy.maxRequests,
            remaining: strategy.maxRequests - 1,
            reset: now + strategy.windowMs,
          })
        }

        return new RateLimitInfo({
          limit: strategy.maxRequests,
          remaining: Math.max(0, strategy.maxRequests - entry.count),
          reset: entry.resetAt,
        })
      })

    /**
     * Reset rate limit for a key (useful for testing)
     */
    const reset = (key: string): Effect.Effect<void> =>
      Ref.update(store, (map) => {
        const newMap = new Map(map)
        newMap.delete(key)
        return newMap
      })

    return {
      checkLimit,
      getLimitInfo,
      reset,
    } as const
  }),
}) {}

export const RateLimitServiceLive = RateLimitService.Default
