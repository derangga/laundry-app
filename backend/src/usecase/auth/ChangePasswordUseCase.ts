import { Effect, Option } from 'effect'
import { ChangePasswordInput, ChangePasswordSuccess } from '@laundry-app/shared'
import { UserRepository } from '@repositories/UserRepository'
import { PasswordService } from './PasswordService'
import { CurrentUser } from '@domain/CurrentUser'
import {
  InvalidCredentialsError,
  PasswordMismatchError,
  UserNotFoundError,
} from '@domain/UserErrors'

export const changePasswordUseCaseImpl = Effect.gen(function* () {
  const userRepo = yield* UserRepository
  const passwordService = yield* PasswordService

  const execute = Effect.fn('ChangePasswordUseCase.execute')(function* (
    input: ChangePasswordInput
  ) {
    // Get current user from context (provided by AuthMiddleware)
    const currentUser = yield* CurrentUser

    // Fetch user with password hash
    const userOption = yield* userRepo.findByIdWithPassword(currentUser.id)
    if (Option.isNone(userOption)) {
      return yield* Effect.fail(UserNotFoundError.byId(currentUser.id))
    }
    const user = userOption.value

    // Verify current password
    const isValidPassword = yield* passwordService.verify(input.currentPassword, user.password_hash)
    if (!isValidPassword) {
      return yield* Effect.fail(InvalidCredentialsError.make())
    }

    // Validate newPassword === confirmPassword
    if (input.newPassword !== input.confirmPassword) {
      return yield* Effect.fail(PasswordMismatchError.make())
    }

    // Hash new password
    const newHash = yield* passwordService.hash(input.newPassword)

    // Update password in database
    yield* userRepo.update(currentUser.id, { password_hash: newHash })

    return ChangePasswordSuccess.make({
      success: true,
      message: 'Password changed successfully',
    })
  })

  return { execute } as const
})

export { ChangePasswordInput }

export class ChangePasswordUseCase extends Effect.Service<ChangePasswordUseCase>()(
  'ChangePasswordUseCase',
  {
    accessors: true,
    effect: changePasswordUseCaseImpl,
    dependencies: [UserRepository.Default, PasswordService.Default],
  }
) {}
