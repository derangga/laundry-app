import { HttpApiBuilder } from '@effect/platform'
import { Effect, DateTime } from 'effect'
import { AppApi } from '@api/AppApi'
import { HealthResponse, DatabaseHealthResponse } from '@domain/Health'
import { testConnection } from '../SqlClient'

/**
 * Health Check Handlers
 *
 * Provides endpoints for monitoring server and database health.
 * - /health: Quick server health check (returns immediately)
 * - /health/db: Database connectivity check (measures latency)
 */
export const HealthHandlersLive = HttpApiBuilder.group(AppApi, 'Health', (handlers) =>
  handlers
    /**
     * Server health check
     * GET /health
     * Returns: HealthResponse with status 'ok'
     *
     * Used for: Load balancer health checks, uptime monitoring
     * Expected response time: < 10ms
     */
    .handle('serverHealth', () =>
      Effect.gen(function* () {
        const now = yield* DateTime.now
        return new HealthResponse({
          status: 'ok',
          timestamp: now,
        })
      })
    )

    /**
     * Database health check
     * GET /health/db
     * Returns: DatabaseHealthResponse with status and latency
     *
     * Used for: Deep health monitoring, database connectivity verification
     * Expected response time: < 100ms
     */
    .handle('databaseHealth', () =>
      Effect.gen(function* () {
        const start = Date.now()
        const now = yield* DateTime.now

        // Test database connection
        const result = yield* testConnection.pipe(
          Effect.catchAll(() => Effect.succeed(false))
        )

        const latencyMs = Date.now() - start

        if (!result) {
          return new DatabaseHealthResponse({
            status: 'down',
            latencyMs,
            timestamp: now,
          })
        }

        return new DatabaseHealthResponse({
          status: 'ok',
          latencyMs,
          timestamp: now,
        })
      })
    )
)
