import { Schema } from 'effect'

/**
 * Schema for DECIMAL/NUMERIC columns from PostgreSQL.
 * PostgreSQL returns DECIMAL as strings to preserve precision.
 * This schema accepts both string and number inputs, outputs number.
 */
export const DecimalNumber = Schema.transform(
  Schema.Union(Schema.Number, Schema.String),
  Schema.Number,
  {
    strict: true,
    decode: (input) => (typeof input === 'string' ? parseFloat(input) : input),
    encode: (n) => n,
  }
)
