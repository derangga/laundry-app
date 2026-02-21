import { Schema } from 'effect'

/**
 * Health Check Domain Models
 *
 * Used for monitoring server and database health.
 */

export class HealthResponse extends Schema.Class<HealthResponse>('HealthResponse')({
  status: Schema.Literal('ok', 'degraded', 'down'),
  timestamp: Schema.DateTimeUtc,
}) {}

export class DatabaseHealthResponse extends Schema.Class<DatabaseHealthResponse>(
  'DatabaseHealthResponse'
)({
  status: Schema.Literal('ok', 'down'),
  latencyMs: Schema.Number,
  timestamp: Schema.DateTimeUtc,
}) {}
