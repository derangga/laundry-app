import { Effect, Option } from 'effect'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from './PasswordService'
import { UserAlreadyExistsError } from '@domain/UserErrors'
import type { CreateUserInput } from '@domain/User'
import { User, UserWithoutPassword } from '@domain/User'

export const registerUserUseCaseImpl = Effect.gen(function* () {
  const userRepo = yield* UserRepository
  const passwordService = yield* PasswordService

  const execute = Effect.fn('RegisterUserUseCase.execute')(function* (input: CreateUserInput) {
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
        role: input.role,
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

export class RegisterUserUseCase extends Effect.Service<RegisterUserUseCase>()(
  'RegisterUserUseCase',
  {
    accessors: true,
    effect: registerUserUseCaseImpl,
    dependencies: [UserRepository.Default, PasswordService.Default],
  }
) {}
