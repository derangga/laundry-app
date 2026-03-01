import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '@repositories/UserRepository'
import { UserId, UserWithoutPassword } from '@domain/User'
import { UserNotFoundError } from '@domain/UserErrors'

const deleteUser = (
  id: UserId
): Effect.Effect<UserWithoutPassword, UserNotFoundError | SqlError.SqlError, UserRepository> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const result = yield* repo.softDelete(id)

    if (Option.isNone(result)) {
      return yield* Effect.fail(UserNotFoundError.byId(id))
    }

    return result.value
  })

export class DeleteUserUseCase extends Effect.Service<DeleteUserUseCase>()('DeleteUserUseCase', {
  effect: Effect.gen(function* () {
    return {
      execute: deleteUser,
    } as const
  }),
}) {}
