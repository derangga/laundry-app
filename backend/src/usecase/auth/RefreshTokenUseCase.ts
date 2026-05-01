import { Effect, Option } from 'effect'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { JwtService } from './JwtService'
import { TokenGenerator } from './TokenGenerator'
import {
  InvalidTokenError,
  RefreshTokenNotFoundError,
  UserNotFoundError,
} from '../../domain/UserErrors'
import { RefreshTokenInput, AuthResponse, JwtPayload, AuthenticatedUser } from '../../domain/Auth'

export { RefreshTokenInput }

export const refreshUseCaseImpl = Effect.gen(function* () {
  const userRepo = yield* UserRepository
  const refreshTokenRepo = yield* RefreshTokenRepository
  const jwtService = yield* JwtService
  const tokenGenerator = yield* TokenGenerator

  const execute = Effect.fn("RefreshTokenUseCase.execute")(function* (input: RefreshTokenInput) {
    if (!input.refreshToken) {
      return yield* Effect.fail(InvalidTokenError.invalid())
    }

    const hashedToken = yield* tokenGenerator.hash(input.refreshToken)

    const storedTokenOption = yield* refreshTokenRepo.findByTokenHash(hashedToken)
    if (Option.isNone(storedTokenOption)) {
      return yield* Effect.fail(RefreshTokenNotFoundError.make())
    }
    const storedToken = storedTokenOption.value

    yield* refreshTokenRepo.revoke(storedToken.id)

    const userOption = yield* userRepo.findById(storedToken.user_id)
    if (Option.isNone(userOption)) {
      return yield* Effect.fail(UserNotFoundError.byId(storedToken.user_id))
    }
    const user = userOption.value

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }
    const accessToken = yield* jwtService.signAccessToken(jwtPayload)

    const { rawToken: newRawToken, hashedToken: newHashedToken } =
      yield* tokenGenerator.generateAndHash()
    const expiresAt = jwtService.getRefreshExpiryDate()

    yield* refreshTokenRepo.insert({
      user_id: user.id,
      token_hash: newHashedToken,
      expires_at: expiresAt,
    })

    return AuthResponse.make({
      accessToken,
      refreshToken: newRawToken,
      user: AuthenticatedUser.make({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    })
  })

  return { execute } as const
})

export class RefreshTokenUseCase extends Effect.Service<RefreshTokenUseCase>()(
  'RefreshTokenUseCase',
  {
    accessors: true,
    effect: refreshUseCaseImpl,
    dependencies: [
      UserRepository.Default,
      RefreshTokenRepository.Default,
      JwtService.Default,
      TokenGenerator.Default,
    ],
  }
) {}
