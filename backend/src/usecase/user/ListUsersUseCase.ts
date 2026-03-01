import { Effect } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '@repositories/UserRepository'
import { UserWithoutPassword } from '@domain/User'

const listUsers = (): Effect.Effect<UserWithoutPassword[], SqlError.SqlError, UserRepository> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    return yield* repo.findAll()
  })

export class ListUsersUseCase extends Effect.Service<ListUsersUseCase>()('ListUsersUseCase', {
  effect: Effect.gen(function* () {
    return {
      execute: listUsers,
    } as const
  }),
}) {}
