import { Schema } from 'effect'

import { DateTimeUtcString } from './common/datetime.js'

/**
 * Branded type for User IDs.
 * Ensures type safety when working with user identifiers across the application.
 */
export const UserId = Schema.String.pipe(Schema.brand('UserId'))
export type UserId = typeof UserId.Type

/**
 * User role enumeration.
 * - `admin`: Full system access including user management
 * - `staff`: Limited to order and customer management
 */
export const UserRole = Schema.Literal('admin', 'staff')
export type UserRole = typeof UserRole.Type

/**
 * Input schema for creating a new user.
 * Validates email format and requires non-empty password and name.
 */
export class CreateUserInput extends Schema.Class<CreateUserInput>('CreateUserInput')({
  email: Schema.String.pipe(
    Schema.nonEmptyString(),
    Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: () => 'Invalid email format',
    })
  ),
  password: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
}) {}

/**
 * User response schema without password field.
 * Used for safe user data transmission in API responses.
 */
export class UserWithoutPassword extends Schema.Class<UserWithoutPassword>('UserWithoutPassword')({
  id: UserId,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

/**
 * Minimal user information schema.
 * Used for displaying user details in contexts where full information isn't needed.
 */
export class UserBasicInfo extends Schema.Class<UserBasicInfo>('UserBasicInfo')({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}

/**
 * Input schema for updating an existing user.
 * Both fields are optional — at least one must be provided.
 */
export class UpdateUserInput extends Schema.Class<UpdateUserInput>('UpdateUserInput')({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  email: Schema.optional(
    Schema.String.pipe(
      Schema.nonEmptyString(),
      Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
        message: () => 'Invalid email format',
      })
    )
  ),
}) {}
