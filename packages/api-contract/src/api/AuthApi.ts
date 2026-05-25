import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import {
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  BootstrapInput,
  AuthResponse,
  LogoutResult,
  AuthenticatedUser,
  ChangePasswordInput,
  ChangePasswordSuccess,
  CreateUserInput,
  UserWithoutPassword,
} from '@laundry-app/shared'
import {
  InvalidCredentials,
  Unauthorized,
  ValidationError,
  BootstrapNotAllowed,
  UserAlreadyExists,
  UnprocessibleEntity,
} from '../errors.js'
import { AuthMiddleware } from '../middleware.js'

export const AuthGroup = HttpApiGroup.make('Auth')
  .add(
    HttpApiEndpoint.post('login', '/api/auth/login')
      .setPayload(LoginInput)
      .addSuccess(AuthResponse)
      .addError(InvalidCredentials)
      .addError(ValidationError)
      .addError(UnprocessibleEntity)
  )
  .add(
    HttpApiEndpoint.post('refresh', '/api/auth/refresh')
      .setPayload(RefreshTokenInput)
      .addSuccess(AuthResponse)
      .addError(Unauthorized)
      .addError(UnprocessibleEntity)
  )
  .add(
    HttpApiEndpoint.post('logout', '/api/auth/logout')
      .setPayload(LogoutInput)
      .addSuccess(LogoutResult)
      .addError(Unauthorized)
      .addError(UnprocessibleEntity)
      .middleware(AuthMiddleware)
  )
  .add(
    HttpApiEndpoint.post('register', '/api/auth/register')
      .setPayload(CreateUserInput)
      .addSuccess(UserWithoutPassword)
      .addError(UserAlreadyExists)
      .addError(ValidationError)
      .addError(Unauthorized)
      .addError(UnprocessibleEntity)
      .middleware(AuthMiddleware)
  )
  .add(
    HttpApiEndpoint.post('bootstrap', '/api/auth/bootstrap')
      .setPayload(BootstrapInput)
      .addSuccess(UserWithoutPassword)
      .addError(ValidationError)
      .addError(BootstrapNotAllowed)
      .addError(UnprocessibleEntity)
  )
  .add(
    HttpApiEndpoint.get('me', '/api/auth/me')
      .addSuccess(AuthenticatedUser)
      .addError(Unauthorized)
      .middleware(AuthMiddleware)
  )
  .add(
    HttpApiEndpoint.patch('changePassword', '/api/auth/change-password')
      .setPayload(ChangePasswordInput)
      .addSuccess(ChangePasswordSuccess)
      .addError(InvalidCredentials)
      .addError(ValidationError)
      .addError(Unauthorized)
      .addError(UnprocessibleEntity)
      .middleware(AuthMiddleware)
  )
