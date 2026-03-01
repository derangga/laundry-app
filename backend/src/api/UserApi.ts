import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { UserWithoutPassword, UpdateUserInput } from '@domain/User'
import { UserNotFound, UserAlreadyExists, ValidationError, Unauthorized, Forbidden } from '@domain/http/HttpErrors'
import { AuthAdminMiddleware } from '@middleware/AuthMiddleware'

export const UserGroup = HttpApiGroup.make('Users')
  .add(
    HttpApiEndpoint.get('listUsers', '/api/users')
      .addSuccess(Schema.Array(UserWithoutPassword))
      .addError(Unauthorized)
      .addError(Forbidden)
      .middleware(AuthAdminMiddleware)
  )
  .add(
    HttpApiEndpoint.put('updateUser', '/api/users/:id')
      .setPayload(UpdateUserInput)
      .addSuccess(UserWithoutPassword)
      .addError(UserNotFound)
      .addError(UserAlreadyExists)
      .addError(ValidationError)
      .addError(Unauthorized)
      .addError(Forbidden)
      .middleware(AuthAdminMiddleware)
  )
  .add(
    HttpApiEndpoint.del('deleteUser', '/api/users/:id')
      .addSuccess(UserWithoutPassword)
      .addError(UserNotFound)
      .addError(ValidationError)
      .addError(Unauthorized)
      .addError(Forbidden)
      .middleware(AuthAdminMiddleware)
  )
