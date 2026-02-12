import { Schema } from 'effect'
import { UserId, UserRole } from './User'

export class JwtPayload extends Schema.Class<JwtPayload>('JwtPayload')({
  sub: UserId,
  email: Schema.String,
  role: UserRole,
}) {}

// Token rotation
export class TokenPair extends Schema.Class<TokenPair>('TokenPair')({
  accessToken: Schema.String,
  refreshToken: Schema.String,
}) {}

// Login Input
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

// Authenticated user data (subset of User for responses)
export class AuthenticatedUser extends Schema.Class<AuthenticatedUser>('AuthenticatedUser')({
  id: UserId,
  email: Schema.String,
  name: Schema.String,
  role: UserRole,
}) {}

// Login/Refresh Response (same structure)
export class AuthResponse extends Schema.Class<AuthResponse>('AuthResponse')({
  accessToken: Schema.String,
  refreshToken: Schema.String,
  user: AuthenticatedUser,
}) {}

// Logout Input
export class LogoutInput extends Schema.Class<LogoutInput>('LogoutInput')({
  refreshToken: Schema.optional(Schema.String),
  logoutAll: Schema.optional(Schema.Boolean),
}) {}

// Logout Response
export class LogoutResult extends Schema.Class<LogoutResult>('LogoutResult')({
  success: Schema.Boolean,
  message: Schema.String,
}) {}

// Refresh Token Input
export class RefreshTokenInput extends Schema.Class<RefreshTokenInput>('RefreshTokenInput')({
  refreshToken: Schema.String,
}) {}

// Bootstrap Input - for creating first admin user
// Note: role is fixed to 'admin' and not user-selectable
export class BootstrapInput extends Schema.Class<BootstrapInput>('BootstrapInput')({
  email: Schema.String.pipe(Schema.nonEmptyString()),
  password: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(Schema.nonEmptyString()),
}) {}

// Type aliases for clarity
export type LoginResult = AuthResponse
export type RefreshTokenResult = AuthResponse
