import { Effect } from "effect"
import { SqlError } from "@effect/sql"
import { RefreshTokenRepository } from "../../infrastructure/database/repositories/RefreshTokenRepository"
import { TokenGenerator } from "../../infrastructure/TokenGenerator"
import { CurrentUser } from "../../domain/CurrentUser"
import { UserId } from "../../domain/User"
import { UnauthorizedError } from "../../domain/UserErrors"

export interface LogoutInput {
  readonly refreshToken?: string
  readonly logoutAll?: boolean
}

export interface LogoutResult {
  readonly success: boolean
  readonly message: string
}

export const logout = (
  input: LogoutInput
): Effect.Effect<
  LogoutResult,
  SqlError.SqlError | UnauthorizedError,
  RefreshTokenRepository | TokenGenerator | CurrentUser
> =>
  Effect.gen(function* () {
    const refreshTokenRepo = yield* RefreshTokenRepository
    const tokenGenerator = yield* TokenGenerator

    const userOption = yield* CurrentUser.getOption
    if (userOption._tag === "None") {
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
        message: "Successfully logged out.",
      }
    }

    return {
      success: true,
      message: "Logged out (no refresh token provided).",
    }
  })

export const logoutAll = (
  userId: UserId
): Effect.Effect<LogoutResult, SqlError.SqlError, RefreshTokenRepository> =>
  Effect.gen(function* () {
    const refreshTokenRepo = yield* RefreshTokenRepository
    const revokedCount = yield* refreshTokenRepo.revokeAllForUser(userId)
    return {
      success: true,
      message: `All sessions terminated. ${revokedCount} token(s) revoked.`,
    }
  })

export class LogoutUseCase extends Effect.Service<LogoutUseCase>()("LogoutUseCase", {
  effect: Effect.gen(function* () {
    return {
      execute: logout,
      logoutAll,
    } as const
  }),
}) {}
