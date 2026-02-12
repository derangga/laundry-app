import { Effect, Layer, ConfigProvider } from 'effect'
import { PasswordService, PasswordServiceLive } from '@application/auth/PasswordService'
import { User, UserId, UserRole } from '@domain/User'

export const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ['JWT_SECRET', 'test-secret-key-for-integration-testing-minimum-32-chars'],
    ['JWT_ACCESS_EXPIRY', '15m'],
    ['JWT_REFRESH_EXPIRY', '7d'],
    ['BCRYPT_ROUNDS', '4'],
  ])
)

export const TestConfig = Layer.setConfigProvider(TestConfigProvider)

export interface TestUser {
  email: string
  password: string
  hashedPassword: string
  user: User
}

export const createTestUsers = async (): Promise<{ admin: TestUser; staff: TestUser }> => {
  const hashEffect = Effect.gen(function* () {
    const service = yield* PasswordService
    const hash = yield* service.hash('password123')
    return hash
  })

  const hashedPassword = await Effect.runPromise(
    Effect.provide(hashEffect, PasswordServiceLive.pipe(Layer.provide(TestConfig)))
  )

  const adminUser = {
    id: 'test-admin-id' as UserId,
    email: 'admin@example.com',
    password_hash: hashedPassword,
    name: 'Admin User',
    role: 'admin' as UserRole,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  } as unknown as User

  const staffUser = {
    id: 'test-staff-id' as UserId,
    email: 'staff@example.com',
    password_hash: hashedPassword,
    name: 'Staff User',
    role: 'staff' as UserRole,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  } as unknown as User

  return {
    admin: { email: 'admin@example.com', password: 'password123', hashedPassword, user: adminUser },
    staff: { email: 'staff@example.com', password: 'password123', hashedPassword, user: staffUser },
  }
}

export const expiredRefreshToken = {
  id: 'expired-token-id' as const,
  user_id: 'test-admin-id' as UserId,
  token_hash: 'expired-token-hash',
  expires_at: new Date('2020-01-01'),
  created_at: new Date('2020-01-01'),
  revoked_at: null,
}

export const createRefreshTokenRecord = (
  userId: UserId,
  tokenHash: string,
  expiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
) => ({
  id: `token-${Date.now()}-${Math.random().toString(36).slice(2)}` as const,
  user_id: userId,
  token_hash: tokenHash,
  expires_at: expiresAt,
  created_at: new Date(),
  revoked_at: null as Date | null,
})
