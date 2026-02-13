import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { PasswordService } from './PasswordService'
import { JwtService } from './JwtService'
import { TokenGenerator } from './TokenGenerator'
import { InvalidCredentialsError } from '@domain/UserErrors'
import { LoginInput, JwtPayload, LoginResult, AuthResponse, AuthenticatedUser } from '@domain/Auth'

export { LoginInput }

export const login = (
  input: LoginInput
): Effect.Effect<
  LoginResult,
  InvalidCredentialsError | SqlError.SqlError | Error,
  UserRepository | RefreshTokenRepository | PasswordService | JwtService | TokenGenerator
> =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const refreshTokenRepo = yield* RefreshTokenRepository
    const passwordService = yield* PasswordService
    const jwtService = yield* JwtService
    const tokenGenerator = yield* TokenGenerator

    // Find user by email
    const userOption = yield* userRepo.findByEmail(input.email)
    if (Option.isNone(userOption)) {
      return yield* Effect.fail(InvalidCredentialsError.make())
    }
    const user = userOption.value

    // Verify password
    const isValidPassword = yield* passwordService.verify(input.password, user.password_hash)
    if (!isValidPassword) {
      return yield* Effect.fail(InvalidCredentialsError.make())
    }

    // Generate access token
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }
    const accessToken = yield* jwtService.signAccessToken(jwtPayload)

    // Generate refresh token
    const { rawToken, hashedToken } = yield* tokenGenerator.generateAndHash()
    const expiresAt = jwtService.getRefreshExpiryDate()

    // Store refresh token in database
    yield* refreshTokenRepo.insert({
      user_id: user.id,
      token_hash: hashedToken,
      expires_at: expiresAt,
    })

    return AuthResponse.make({
      accessToken,
      refreshToken: rawToken,
      user: AuthenticatedUser.make({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    })
  })

export class LoginUseCase extends Effect.Service<LoginUseCase>()('LoginUseCase', {
  effect: Effect.gen(function* () {
    return {
      execute: login,
    } as const
  }),
}) {}
