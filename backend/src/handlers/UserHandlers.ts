import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { ListUsersUseCase } from 'src/usecase/user/ListUsersUseCase'
import { UpdateUserUseCase } from 'src/usecase/user/UpdateUserUseCase'
import { DeleteUserUseCase } from 'src/usecase/user/DeleteUserUseCase'
import { UserId } from '@domain/User'
import {
  UserNotFound,
  UserAlreadyExists,
  ValidationError,
  RetrieveDataEror,
} from '@domain/http/HttpErrors'

export const UserHandlersLive = HttpApiBuilder.group(AppApi, 'Users', (handlers) =>
  handlers
    /**
     * List all non-deleted users
     * GET /api/users
     * Protected: Requires admin role
     * Returns: UserWithoutPassword[]
     */
    .handle('listUsers', () =>
      Effect.gen(function* () {
        const listUsersUseCase = yield* ListUsersUseCase
        return yield* listUsersUseCase.execute().pipe(
          Effect.mapError((cause) => {
            console.log(cause)
            return new RetrieveDataEror({ message: cause.message })
          })
        )
      })
    )

    /**
     * Update user name and/or email
     * PUT /api/users/:id
     * Protected: Requires admin role
     * Payload: UpdateUserInput
     * Returns: UserWithoutPassword
     */
    .handle('updateUser', ({ path, payload }) =>
      Effect.gen(function* () {
        const updateUserUseCase = yield* UpdateUserUseCase

        return yield* updateUserUseCase.execute(UserId.make(path.id), payload).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'UserNotFoundError') {
                return new UserNotFound({
                  message: (error as any).message || `User not found with id: ${path.id}`,
                  userId: path.id,
                })
              }
              if (tag === 'UserAlreadyExistsError') {
                return new UserAlreadyExists({
                  message: (error as any).message || 'User already exists',
                  email: (error as any).email || '',
                })
              }
            }
            const message = error instanceof Error ? error.message : 'Failed to update user'
            return new ValidationError({ message })
          })
        )
      })
    )

    /**
     * Soft-delete a user
     * DELETE /api/users/:id
     * Protected: Requires admin role
     * Returns: UserWithoutPassword
     */
    .handle('deleteUser', ({ path }) =>
      Effect.gen(function* () {
        const deleteUserUseCase = yield* DeleteUserUseCase

        return yield* deleteUserUseCase.execute(UserId.make(path.id)).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'UserNotFoundError') {
                return new UserNotFound({
                  message: (error as any).message || `User not found with id: ${path.id}`,
                  userId: path.id,
                })
              }
            }
            const message = error instanceof Error ? error.message : 'Failed to delete user'
            return new ValidationError({ message })
          })
        )
      })
    )
)
