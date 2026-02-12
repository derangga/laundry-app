import { DateTime, Schema } from 'effect'
import { Model } from '@effect/sql'
import { UserId } from './User.js'

export const RefreshTokenId = Schema.String.pipe(Schema.brand('RefreshTokenId'))
export type RefreshTokenId = typeof RefreshTokenId.Type

// Schema for DateTimeUtc that accepts JavaScript Date objects from PostgreSQL
const DateTimeUtcFromDate = Schema.transform(Schema.DateFromSelf, Schema.DateTimeUtcFromSelf, {
  strict: true,
  decode: (date) => DateTime.unsafeFromDate(date),
  encode: (dt) => DateTime.toDate(dt),
})

export class RefreshToken extends Model.Class<RefreshToken>('RefreshToken')({
  id: Model.Generated(RefreshTokenId),
  user_id: UserId,
  token_hash: Schema.String,
  expires_at: DateTimeUtcFromDate,
  created_at: Model.DateTimeInsertFromDate,
  revoked_at: Schema.NullOr(DateTimeUtcFromDate),
}) {}

export class CreateRefreshTokenInput extends Schema.Class<CreateRefreshTokenInput>(
  'CreateRefreshTokenInput'
)({
  user_id: UserId,
  token_hash: Schema.String.pipe(Schema.nonEmptyString()),
  expires_at: DateTimeUtcFromDate,
}) {}
