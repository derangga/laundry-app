import { Schema } from 'effect'

/**
 * Schema.DateTimeUtc with a JSON Schema annotation so
 * the OpenAPI spec generator can represent it as
 * `{ type: "string", format: "date-time" }`.
 */
export const DateTimeUtcString = Schema.DateTimeUtc.annotations({
  jsonSchema: { type: 'string', format: 'date-time' },
})
