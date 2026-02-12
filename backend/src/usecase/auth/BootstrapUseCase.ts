import { Effect, Option } from 'effect'
import { SqlError } from '@effect/sql'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from './PasswordService'
import { BootstrapNotAllowedError, UserAlreadyExistsError } from '@domain/UserErrors'
import { BootstrapInput } from '@domain/Auth'
import { User, UserWithoutPassword } from '@domain/User'

export { BootstrapInput }
export type BootstrapResult = UserWithoutPassword

export const bootstrap = (
  input: BootstrapInput
): Effect.Effect<
  BootstrapResult,
  BootstrapNotAllowedError | UserAlreadyExistsError | SqlError.SqlError | Error,
  UserRepository | PasswordService
> =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const passwordService = yield* PasswordService

    // 1. Check if any users exist - bootstrap only allowed when empty
    const hasUsers = yield* userRepo.hasAnyUsers()
    if (hasUsers) {
      return yield* Effect.fail(BootstrapNotAllowedError.make())
    }

    // 2. Double-check email doesn't exist (defensive)
    const existingUser = yield* userRepo.findByEmail(input.email)
    if (Option.isSome(existingUser)) {
      return yield* Effect.fail(UserAlreadyExistsError.make(input.email))
    }

    // 3. Hash password
    const hashedPassword = yield* passwordService.hash(input.password)

    // 4. Insert admin user (role is hardcoded to 'admin')
    const user = yield* userRepo.insert(
      User.insert.make({
        email: input.email,
        password_hash: hashedPassword,
        name: input.name,
        role: 'admin',
      })
    )

    console.log('result insert: ', user)
    // 5. Return user without password
    return UserWithoutPassword.make({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    })
  })

export class BootstrapUseCase extends Effect.Service<BootstrapUseCase>()('BootstrapUseCase', {
  effect: Effect.gen(function* () {
    return {
      execute: bootstrap,
    } as const
  }),
}) {}
