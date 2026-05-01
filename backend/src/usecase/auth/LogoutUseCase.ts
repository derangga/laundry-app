import { Effect, Option } from 'effect'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { TokenGenerator } from './TokenGenerator'
import { CurrentUser } from '../../domain/CurrentUser'
import { UnauthorizedError } from '../../domain/UserErrors'
import { LogoutInput } from '../../domain/Auth'

export const logoutUseCaseImpl = Effect.gen(function* () {
  const refreshTokenRepo = yield* RefreshTokenRepository
  const tokenGenerator = yield* TokenGenerator

  const execute = Effect.fn('LogoutUseCase.execute')(function* (input: LogoutInput) {
    const userOption = yield* CurrentUser.getOption
    if (Option.isNone(userOption)) {
      return yield* Effect.fail(UnauthorizedError.make())
    }
    const currentUser = userOption.value

    if (input.logoutAll) {
      const revokedCount = yield* refreshTokenRepo.revokeAllForUser(currentUser.id)
      return {
        success: true,
        message: `Logged out from all sessions. ${revokedCount} token(s) revoked.`,
      }
    }

    if (input.refreshToken) {
      const hashedToken = yield* tokenGenerator.hash(input.refreshToken)
      yield* refreshTokenRepo.revokeByTokenHash(hashedToken)
      return {
        success: true,
        message: 'Successfully logged out.',
      }
    }

    return {
      success: true,
      message: 'Logged out (no refresh token provided).',
    }
  })

  return { execute } as const
})

export class LogoutUseCase extends Effect.Service<LogoutUseCase>()('LogoutUseCase', {
  accessors: true,
  effect: logoutUseCaseImpl,
  dependencies: [RefreshTokenRepository.Default, TokenGenerator.Default],
}) {}
