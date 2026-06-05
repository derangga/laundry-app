import { Effect, Option } from 'effect'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from './PasswordService'
import { BootstrapNotAllowedError, UserAlreadyExistsError } from '@domain/UserErrors'
import type { BootstrapInput } from '@domain/Auth'
import { User, UserWithoutPassword } from '@domain/User'

export const bootstrapUseCaseImpl = Effect.gen(function* () {
  const userRepo = yield* UserRepository
  const passwordService = yield* PasswordService

  const execute = Effect.fn('BootstrapUseCase.execute')(function* (input: BootstrapInput) {
    const hasUsers = yield* userRepo.hasAnyUsers()
    if (hasUsers) {
      return yield* Effect.fail(BootstrapNotAllowedError.make())
    }

    const existingUser = yield* userRepo.findByEmail(input.email)
    if (Option.isSome(existingUser)) {
      return yield* Effect.fail(UserAlreadyExistsError.make(input.email))
    }

    const hashedPassword = yield* passwordService.hash(input.password)

    const user = yield* userRepo.insert(
      User.insert.make({
        email: input.email,
        password_hash: hashedPassword,
        name: input.name,
        role: 'admin',
      })
    )

    return UserWithoutPassword.make({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    })
  })

  return { execute } as const
})

export class BootstrapUseCase extends Effect.Service<BootstrapUseCase>()('BootstrapUseCase', {
  accessors: true,
  effect: bootstrapUseCaseImpl,
  dependencies: [UserRepository.Default, PasswordService.Default],
}) {}
