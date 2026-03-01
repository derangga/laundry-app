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
