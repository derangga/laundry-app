import { Schema } from 'effect'

/**
 * Rate limit entry - represents the current state of rate limiting for a key
 * Used for in-memory tracking of request counts and reset times
 */
export class RateLimitEntry extends Schema.Class<RateLimitEntry>('RateLimitEntry')({
  count: Schema.Number.pipe(Schema.nonNegative()),
  resetAt: Schema.Number.pipe(Schema.positive()),
}) {}

/**
 * Rate limit strategy - configuration for rate limiting behavior
 * Defines the maximum requests and time window for rate limiting
 */
export class RateLimitStrategy extends Schema.Class<RateLimitStrategy>('RateLimitStrategy')({
  maxRequests: Schema.Number.pipe(Schema.positive()),
  windowMs: Schema.Number.pipe(Schema.positive()),
}) {}

/**
 * Rate limit info - information about current rate limit status
 * Used for adding rate limit headers to HTTP responses
 */
export class RateLimitInfo extends Schema.Class<RateLimitInfo>('RateLimitInfo')({
  limit: Schema.Number,
  remaining: Schema.Number.pipe(Schema.nonNegative()),
  reset: Schema.Number,
}) {}
