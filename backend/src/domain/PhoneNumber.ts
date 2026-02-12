import { Effect, Schema } from 'effect'
import { InvalidPhoneNumber } from './CustomerErrors.js'

// Indonesian phone number format: +62XXXXXXXXX (9-13 digits after +62)
export const PhoneNumberSchema = Schema.String.pipe(
  Schema.pattern(/^\+62\d{9,13}$/),
  Schema.brand('PhoneNumber')
)

export type PhoneNumber = Schema.Schema.Type<typeof PhoneNumberSchema>

export const normalizePhoneNumber = (
  phone: string
): Effect.Effect<PhoneNumber, InvalidPhoneNumber> => {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '')

  // Normalize to +62XXXXXXXXX format
  let withPrefix: string
  if (cleaned.startsWith('+62')) {
    // Already in correct format
    withPrefix = cleaned
  } else if (cleaned.startsWith('62')) {
    // Missing + prefix (e.g., 628123456789)
    withPrefix = '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    // Local format (e.g., 08123456789)
    withPrefix = '+62' + cleaned.slice(1)
  } else {
    // Assume it's just the number without country code
    withPrefix = '+62' + cleaned
  }

  return Schema.decode(PhoneNumberSchema)(withPrefix).pipe(
    Effect.mapError(
      () =>
        new InvalidPhoneNumber({
          phone,
          reason: 'Invalid Indonesian phone number format. Expected +62XXXXXXXXX',
        })
    )
  )
}
