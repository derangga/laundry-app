import { Schema } from 'effect'
import { UserId, UserRole, AuthResponse } from '@laundry-app/shared'

export class JwtPayload extends Schema.Class<JwtPayload>('JwtPayload')({
  sub: UserId,
  email: Schema.String,
  role: UserRole,
}) {}

export class TokenPair extends Schema.Class<TokenPair>('TokenPair')({
  accessToken: Schema.String,
  refreshToken: Schema.String,
}) {}

export {
  LoginInput,
  AuthenticatedUser,
  AuthResponse,
  LogoutInput,
  LogoutResult,
  RefreshTokenInput,
  BootstrapInput,
} from '@laundry-app/shared'

export type LoginResult = AuthResponse
export type RefreshTokenResult = AuthResponse
