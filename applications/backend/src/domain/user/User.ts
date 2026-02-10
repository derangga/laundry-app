import { Schema } from "effect"
import { Model } from "@effect/sql"

export const UserRole = Schema.Literal("admin", "staff")
export type UserRole = typeof UserRole.Type

export class User extends Model.Class<User>("User")({
  id: Model.Generated(Schema.String),
  email: Schema.String,
  password_hash: Schema.String,
  name: Schema.String,
  role: UserRole,
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {}

export class CreateUserInput extends Schema.Class<CreateUserInput>("CreateUserInput")({
  email: Schema.String.pipe(Schema.nonEmptyString()),
  password: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
}) {}

export class UserWithoutPassword extends Schema.Class<UserWithoutPassword>("UserWithoutPassword")({
  id: Schema.String,
  email: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
  role: UserRole,
  created_at: Schema.DateTimeUtc,
  updated_at: Schema.DateTimeUtc,
}) {}
