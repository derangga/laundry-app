import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { UserId } from './User.js'

export const RefreshTokenId = Schema.String.pipe(Schema.brand('RefreshTokenId'))
export type RefreshTokenId = typeof RefreshTokenId.Type

export class RefreshToken extends Model.Class<RefreshToken>('RefreshToken')({
  id: Model.Generated(RefreshTokenId),
  user_id: UserId,
  token_hash: Schema.String,
  expires_at: Schema.DateTimeUtc,
  created_at: Model.DateTimeInsert,
  revoked_at: Schema.NullOr(Schema.DateTimeUtc),
}) {}

export class CreateRefreshTokenInput extends Schema.Class<CreateRefreshTokenInput>(
  'CreateRefreshTokenInput'
)({
  user_id: UserId,
  token_hash: Schema.String.pipe(Schema.nonEmptyString()),
  expires_at: Schema.DateTimeUtc,
}) {}
