export {
  UserId,
  UserRole,
  CreateUserInput,
  UpdateUserInput,
  UserWithoutPassword,
  UserBasicInfo,
} from '@laundry-app/shared'

import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { UserId, UserRole } from '@laundry-app/shared'

// DB-specific decode schema — same shape as UserWithoutPassword but accepts Date objects
export const UserWithoutPasswordFromDb = Schema.Struct({
  id: UserId,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  created_at: Schema.DateTimeUtcFromDate,
  updated_at: Schema.DateTimeUtcFromDate,
})

// DB-specific decode schema for full user row (includes password_hash)
export const UserFromDb = Schema.Struct({
  id: UserId,
  email: Schema.String,
  password_hash: Schema.String,
  name: Schema.String,
  role: UserRole,
  created_at: Schema.DateTimeUtcFromDate,
  updated_at: Schema.DateTimeUtcFromDate,
  deleted_at: Schema.optional(Schema.NullOr(Schema.DateFromSelf)),
})
export type UserFromDb = typeof UserFromDb.Type

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
