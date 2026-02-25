import { Schema } from 'effect'

import { UserId, UserRole } from './user.js'

/**
 * Input schema for user authentication.
 * Validates email format and minimum password length.
 */
export class LoginInput extends Schema.Class<LoginInput>('LoginInput')({
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => 'Invalid email format',
    })
  ),
  password: Schema.String.pipe(
    Schema.minLength(8, { message: () => 'Password must be at least 8 characters' })
  ),
}) {}

/**
 * Authenticated user information schema.
 * Represents the user data returned after successful authentication.
 */
export class AuthenticatedUser extends Schema.Class<AuthenticatedUser>('AuthenticatedUser')({
  id: UserId,
  email: Schema.String,
  name: Schema.String,
  role: UserRole,
}) {}

/**
 * Authentication response schema.
 * Contains access token, refresh token, and authenticated user data.
 */
export class AuthResponse extends Schema.Class<AuthResponse>('AuthResponse')({
  accessToken: Schema.String,
  refreshToken: Schema.String,
  user: AuthenticatedUser,
}) {}

/**
 * Input schema for user logout.
 * Supports logging out from current session or all sessions.
 */
export class LogoutInput extends Schema.Class<LogoutInput>('LogoutInput')({
  refreshToken: Schema.optional(Schema.String),
  logoutAll: Schema.optional(Schema.Boolean),
}) {}

/**
 * Logout result schema.
 * Indicates whether logout was successful with a descriptive message.
 */
export class LogoutResult extends Schema.Class<LogoutResult>('LogoutResult')({
  success: Schema.Boolean,
  message: Schema.String,
}) {}

/**
 * Input schema for refreshing authentication tokens.
 * Requires a valid refresh token to generate new access token.
 */
export class RefreshTokenInput extends Schema.Class<RefreshTokenInput>('RefreshTokenInput')({
  refreshToken: Schema.String,
}) {}

/**
 * Input schema for bootstrapping the application with initial admin user.
 * Used during first-time setup.
 */
export class BootstrapInput extends Schema.Class<BootstrapInput>('BootstrapInput')({
  email: Schema.String.pipe(Schema.nonEmptyString()),
  password: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
}) {}
