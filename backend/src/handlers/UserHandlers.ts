import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { ListUsersUseCase } from 'src/usecase/user/ListUsersUseCase'
import { UpdateUserUseCase } from 'src/usecase/user/UpdateUserUseCase'
import { DeleteUserUseCase } from 'src/usecase/user/DeleteUserUseCase'
import { UserId } from '@domain/User'
import { UserNotFound, UserAlreadyExists, ValidationError } from '@domain/http/HttpErrors'

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
        return yield* listUsersUseCase.execute().pipe(Effect.orDie)
      })
    )

    /**
     * Update user name and/or email
     * PUT /api/users/:id
     * Protected: Requires admin role
     * Payload: UpdateUserInput
     * Returns: UserWithoutPassword
     */
    .handle('updateUser', ({ payload }) =>
      Effect.gen(function* () {
        const updateUserUseCase = yield* UpdateUserUseCase
        const request = yield* HttpServerRequest.HttpServerRequest

        const url = new URL(request.url, 'http://localhost')
        const pathParts = url.pathname.split('/').filter(Boolean)
        const id = pathParts[pathParts.length - 1]

        if (!id) {
          return yield* Effect.fail(
            new ValidationError({ message: 'User ID is required', field: 'id' })
          )
        }

        return yield* updateUserUseCase.execute(UserId.make(id), payload).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'UserNotFoundError') {
                return new UserNotFound({
                  message: (error as any).message || `User not found with id: ${id}`,
                  userId: id,
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
    .handle('deleteUser', () =>
      Effect.gen(function* () {
        const deleteUserUseCase = yield* DeleteUserUseCase
        const request = yield* HttpServerRequest.HttpServerRequest

        const url = new URL(request.url, 'http://localhost')
        const pathParts = url.pathname.split('/').filter(Boolean)
        const id = pathParts[pathParts.length - 1]

        if (!id) {
          return yield* Effect.fail(
            new ValidationError({ message: 'User ID is required', field: 'id' })
          )
        }

        return yield* deleteUserUseCase.execute(UserId.make(id)).pipe(
          Effect.mapError((error) => {
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'UserNotFoundError') {
                return new UserNotFound({
                  message: (error as any).message || `User not found with id: ${id}`,
                  userId: id,
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
