import type {
  AuthenticatedUser,
  AuthResponse,
  UserId,
  UserRole,
} from '@laundry-app/shared'

export function fakeAuthenticatedUser(
  overrides: Partial<{
    id: string
    email: string
    name: string
    role: UserRole
  }> = {},
): AuthenticatedUser {
  return {
    id: (overrides.id ?? 'user_test_admin_001') as UserId,
    email: overrides.email ?? 'admin@laundry.test',
    name: overrides.name ?? 'Test Admin',
    role: overrides.role ?? 'admin',
  } as AuthenticatedUser
}

export function fakeAuthResponse(
  overrides: Partial<AuthResponse> = {},
): AuthResponse {
  return {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user: fakeAuthenticatedUser(),
    ...overrides,
  } as AuthResponse
}
