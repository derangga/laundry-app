import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import {
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  BootstrapInput,
  AuthResponse,
  LogoutResult,
  AuthenticatedUser,
} from '@domain/Auth'
import { CreateUserInput, UserWithoutPassword } from '@domain/User'
import {
  InvalidCredentials,
  Unauthorized,
  ValidationError,
  BootstrapNotAllowed,
  UserAlreadyExists,
} from '@domain/http/HttpErrors'
import { AuthMiddleware } from 'src/middleware/AuthMiddleware'

export const AuthGroup = HttpApiGroup.make('Auth')
  .add(
    HttpApiEndpoint.post('login', '/api/auth/login')
      .setPayload(LoginInput)
      .addSuccess(AuthResponse)
      .addError(InvalidCredentials)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.post('refresh', '/api/auth/refresh')
      .setPayload(RefreshTokenInput)
      .addSuccess(AuthResponse)
      .addError(Unauthorized)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.post('logout', '/api/auth/logout')
      .setPayload(LogoutInput)
      .addSuccess(LogoutResult)
      .addError(Unauthorized)
      .addError(ValidationError)
      .middleware(AuthMiddleware)
  )
  .add(
    HttpApiEndpoint.post('register', '/api/auth/register')
      .setPayload(CreateUserInput)
      .addSuccess(UserWithoutPassword)
      .addError(UserAlreadyExists)
      .addError(ValidationError)
      .addError(Unauthorized)
      .middleware(AuthMiddleware)
  )
  .add(
    HttpApiEndpoint.post('bootstrap', '/api/auth/bootstrap')
      .setPayload(BootstrapInput)
      .addSuccess(UserWithoutPassword)
      .addError(ValidationError)
      .addError(BootstrapNotAllowed)
  )
  .add(
    HttpApiEndpoint.get('me', '/api/auth/me')
      .addSuccess(AuthenticatedUser)
      .addError(Unauthorized)
      .middleware(AuthMiddleware)
  )
