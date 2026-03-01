export {
  UserId,
  UserRole,
  CreateUserInput,
  UpdateUserInput,
  UserWithoutPassword,
  UserBasicInfo,
} from '@laundry-app/shared'

import { Schema, DateTime } from 'effect'
import { Model } from '@effect/sql'
import { UserId, UserRole } from '@laundry-app/shared'

// Schema that accepts JS Date objects from PostgreSQL and converts to DateTime.Utc
const DateTimeUtcFromDate = Schema.transform(Schema.DateFromSelf, Schema.DateTimeUtcFromSelf, {
  strict: true,
  decode: (date) => DateTime.unsafeFromDate(date),
  encode: (dt) => DateTime.toDate(dt),
})

// DB-specific decode schema — same shape as UserWithoutPassword but accepts Date objects
export const UserWithoutPasswordFromDb = Schema.Struct({
  id: UserId,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  created_at: DateTimeUtcFromDate,
  updated_at: DateTimeUtcFromDate,
})

export class User extends Model.Class<User>('User')({
  id: Model.Generated(UserId),
  email: Schema.String,
  password_hash: Schema.String,
  name: Schema.String,
  role: UserRole,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
  deleted_at: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
}) {}

export const UserUpdateData = Schema.partial(
  Schema.Struct({
    email: Schema.String,
    password_hash: Schema.String,
    name: Schema.String,
    role: Schema.String,
  })
)
export type UserUpdateData = typeof UserUpdateData.Type
