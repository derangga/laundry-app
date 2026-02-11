import { Schema } from '@effect/schema'
import { Effect } from 'effect'
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

  // Convert 08... to +628...
  const withPrefix = cleaned.startsWith('0')
    ? '+62' + cleaned.slice(1)
    : cleaned.startsWith('+62')
      ? cleaned
      : '+62' + cleaned

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
