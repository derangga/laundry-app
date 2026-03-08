import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { TokenGenerator } from './TokenGenerator'
import { CurrentUser } from '../../domain/CurrentUser'
import { UnauthorizedError } from '../../domain/UserErrors'
import { LogoutInput, LogoutResult } from '../../domain/Auth'

export const logoutUseCaseImpl = Effect.gen(function* () {
  const refreshTokenRepo = yield* RefreshTokenRepository
  const tokenGenerator = yield* TokenGenerator

  const execute = (
    input: LogoutInput
  ): Effect.Effect<LogoutResult, SqlError.SqlError | UnauthorizedError, CurrentUser> =>
    Effect.gen(function* () {
      const userOption = yield* CurrentUser.getOption
      if (Option.isNone(userOption)) {
        return yield* Effect.fail(UnauthorizedError.make())
      }
      const currentUser = userOption.value

      if (input.logoutAll) {
        // Revoke all refresh tokens for the user
        const revokedCount = yield* refreshTokenRepo.revokeAllForUser(currentUser.id)
        return {
          success: true,
          message: `Logged out from all sessions. ${revokedCount} token(s) revoked.`,
        }
      }

      if (input.refreshToken) {
        // Revoke specific refresh token
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
  effect: logoutUseCaseImpl,
  dependencies: [RefreshTokenRepository.Default, TokenGenerator.Default],
}) {}
