import { Schema } from 'effect'

/**
 * Schema for UTC datetime strings.
 * Uses Effect's built-in DateTimeUtc with JSON Schema annotations for API documentation.
 * Ensures consistent datetime handling across the application.
 */
export const DateTimeUtcString = Schema.DateTimeUtc.annotations({
  jsonSchema: { type: 'string', format: 'date-time' },
})
