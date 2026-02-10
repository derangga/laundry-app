import { Schema } from "effect"

export const UserRole = Schema.Literal("admin", "staff")
export type UserRole = typeof UserRole.Type

export class User extends Schema.Class<User>("User")({
  id: Schema.UUID,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  passwordHash: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export class CreateUserInput extends Schema.Class<CreateUserInput>("CreateUserInput")({
  email: Schema.String.pipe(Schema.nonEmptyString()),
  password: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
}) {}

export class UserWithoutPassword extends Schema.Class<UserWithoutPassword>("UserWithoutPassword")({
  id: Schema.UUID,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}
