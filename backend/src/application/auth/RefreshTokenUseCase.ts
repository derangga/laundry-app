import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '../../infrastructure/database/repositories/UserRepository'
import { RefreshTokenRepository } from '../../infrastructure/database/repositories/RefreshTokenRepository'
import { JwtService, JwtPayload } from '../../infrastructure/JwtService'
import { TokenGenerator } from '../../infrastructure/TokenGenerator'
import {
  InvalidTokenError,
  RefreshTokenNotFoundError,
  UserNotFoundError,
} from '../../domain/UserErrors'
import { RefreshTokenInput, AuthResponse } from '../../domain/Auth'

export { RefreshTokenInput }
export type RefreshTokenResult = AuthResponse

export const refreshTokens = (
  input: RefreshTokenInput
): Effect.Effect<
  RefreshTokenResult,
  InvalidTokenError | RefreshTokenNotFoundError | UserNotFoundError | SqlError.SqlError | Error,
  UserRepository | RefreshTokenRepository | JwtService | TokenGenerator
> =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const refreshTokenRepo = yield* RefreshTokenRepository
    const jwtService = yield* JwtService
    const tokenGenerator = yield* TokenGenerator

    // Hash the incoming refresh token
    const hashedToken = yield* tokenGenerator.hash(input.refreshToken)

    // Find the stored refresh token
    const storedTokenOption = yield* refreshTokenRepo.findByTokenHash(hashedToken)
    if (Option.isNone(storedTokenOption)) {
      return yield* Effect.fail(RefreshTokenNotFoundError.make())
    }
    const storedToken = storedTokenOption.value

    // Revoke the old refresh token (token rotation)
    yield* refreshTokenRepo.revoke(storedToken.id)

    // Find the user
    const userOption = yield* userRepo.findById(storedToken.user_id)
    if (Option.isNone(userOption)) {
      return yield* Effect.fail(UserNotFoundError.byId(storedToken.user_id))
    }
    const user = userOption.value

    // Generate new access token
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }
    const accessToken = yield* jwtService.signAccessToken(jwtPayload)

    // Generate new refresh token
    const { rawToken: newRawToken, hashedToken: newHashedToken } =
      yield* tokenGenerator.generateAndHash()
    const expiresAt = jwtService.getRefreshExpiryDate()

    // Store new refresh token
    yield* refreshTokenRepo.insert({
      user_id: user.id,
      token_hash: newHashedToken,
      expires_at: expiresAt,
    })

    return {
      accessToken,
      refreshToken: newRawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  })

export class RefreshTokenUseCase extends Effect.Service<RefreshTokenUseCase>()(
  'RefreshTokenUseCase',
  {
    effect: Effect.gen(function* () {
      return {
        execute: refreshTokens,
      } as const
    }),
  }
) {}
