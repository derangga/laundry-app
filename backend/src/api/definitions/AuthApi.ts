import {
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  BootstrapInput,
  AuthResponse,
  LogoutResult,
} from '@domain/Auth'
import { CreateUserInput, UserWithoutPassword } from '@domain/User'

/**
 * Auth API Schema Definitions
 *
 * Defines the request/response schemas for authentication endpoints:
 * - POST /login - Authenticate user with email/password
 * - POST /refresh - Rotate access/refresh tokens
 * - POST /logout - Revoke refresh token and logout
 * - POST /register - Create new user account (protected)
 * - POST /bootstrap - Create first admin user (public)
 *
 * These definitions are used for:
 * - API documentation generation
 * - Type-safe client generation
 * - Request/response validation
 * - OpenAPI schema export (future)
 */

export const AuthApiEndpoints = {
  login: {
    method: 'POST',
    path: '/login',
    payload: LoginInput,
    response: AuthResponse,
  },
  refresh: {
    method: 'POST',
    path: '/refresh',
    payload: RefreshTokenInput,
    response: AuthResponse,
  },
  logout: {
    method: 'POST',
    path: '/logout',
    payload: LogoutInput,
    response: LogoutResult,
  },
  register: {
    method: 'POST',
    path: '/register',
    payload: CreateUserInput,
    response: UserWithoutPassword,
    status: 201,
    protected: true,
  },
  bootstrap: {
    method: 'POST',
    path: '/bootstrap',
    payload: BootstrapInput,
    response: UserWithoutPassword,
    status: 201,
  },
} as const
