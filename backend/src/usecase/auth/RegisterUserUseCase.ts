import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from './PasswordService'
import { UserAlreadyExistsError } from '@domain/UserErrors'
import { CreateUserInput, User, UserWithoutPassword } from '@domain/User'

export { CreateUserInput }
export type RegisterResult = UserWithoutPassword

export const register = (
  input: CreateUserInput
): Effect.Effect<
  RegisterResult,
  UserAlreadyExistsError | SqlError.SqlError | Error,
  UserRepository | PasswordService
> =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const passwordService = yield* PasswordService

    // Check if user already exists
    const existingUser = yield* userRepo.findByEmail(input.email)
    if (Option.isSome(existingUser)) {
      return yield* Effect.fail(UserAlreadyExistsError.make(input.email))
    }

    // Hash password
    const hashedPassword = yield* passwordService.hash(input.password)

    // Insert user
    const user = yield* userRepo.insert(
      User.insert.make({
        email: input.email,
        password_hash: hashedPassword,
        name: input.name,
        role: input.role,
      })
    )

    // Return user without password
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  })

export class RegisterUserUseCase extends Effect.Service<RegisterUserUseCase>()(
  'RegisterUserUseCase',
  {
    effect: Effect.gen(function* () {
      return {
        execute: register,
      } as const
    }),
  }
) {}
