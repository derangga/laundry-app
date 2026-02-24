import { Schema } from 'effect'

/**
 * Schema transform for handling decimal numbers.
 * Accepts either a number or a numeric string and converts to number.
 * Useful for parsing database decimal/numeric values that may come as strings.
 */
export const DecimalNumber = Schema.transform(Schema.Union(Schema.Number, Schema.String), Schema.Number, {
  strict: true,
  decode: (input) => (typeof input === 'string' ? parseFloat(input) : input),
  encode: (n) => n,
})
