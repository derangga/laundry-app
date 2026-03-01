import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '@repositories/UserRepository'
import { UserId, UpdateUserInput, UserWithoutPassword, UserUpdateData } from '@domain/User'
import { UserNotFoundError, UserAlreadyExistsError } from '@domain/UserErrors'

const updateUser = (
  id: UserId,
  input: UpdateUserInput
): Effect.Effect<
  UserWithoutPassword,
  UserNotFoundError | UserAlreadyExistsError | SqlError.SqlError | Error,
  UserRepository
> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository

    if (input.name === undefined && input.email === undefined) {
      return yield* Effect.fail(
        new UserNotFoundError({ message: 'At least one field (name or email) must be provided' })
      )
    }

    if (input.email !== undefined) {
      const existing = yield* repo.findByEmail(input.email)
      if (Option.isSome(existing) && existing.value.id !== id) {
        return yield* Effect.fail(UserAlreadyExistsError.make(input.email))
      }
    }

    const updates: UserUpdateData = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
    }

    const result = yield* repo.update(id, updates)

    if (Option.isNone(result)) {
      return yield* Effect.fail(UserNotFoundError.byId(id))
    }

    const user = result.value
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  })

export class UpdateUserUseCase extends Effect.Service<UpdateUserUseCase>()('UpdateUserUseCase', {
  effect: Effect.gen(function* () {
    return {
      execute: updateUser,
    } as const
  }),
}) {}
