import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { DateTimeUtcString } from './common/DateTimeUtcString.js'

export const UserId = Schema.String.pipe(Schema.brand('UserId'))
export type UserId = typeof UserId.Type

export const UserRole = Schema.Literal('admin', 'staff')
export type UserRole = typeof UserRole.Type

export class User extends Model.Class<User>('User')({
  id: Model.Generated(UserId),
  email: Schema.String,
  password_hash: Schema.String,
  name: Schema.String,
  role: UserRole,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}

export class CreateUserInput extends Schema.Class<CreateUserInput>('CreateUserInput')({
  email: Schema.String.pipe(Schema.nonEmptyString()),
  password: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
}) {}

export class UserWithoutPassword extends Schema.Class<UserWithoutPassword>('UserWithoutPassword')({
  id: UserId,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

export class UserBasicInfo extends Schema.Class<UserBasicInfo>('UserBasicInfo')({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}
