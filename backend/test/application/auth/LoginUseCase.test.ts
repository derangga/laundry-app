import { describe, it, expect, beforeEach } from 'vitest'
import { Effect, Layer, Option, ConfigProvider } from 'effect'
import { login } from 'src/usecase/auth/LoginUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { PasswordService, PasswordServiceLive } from 'src/usecase/auth/PasswordService'
import { JwtServiceLive } from 'src/usecase/auth/JwtService'
import { TokenGeneratorLive } from 'src/usecase/auth/TokenGenerator'
import { User, UserId, UserRole } from '@domain/User'

const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ['JWT_SECRET', 'test-secret-key-that-is-at-least-32-characters-long'],
    ['JWT_ACCESS_EXPIRY', '15m'],
    ['JWT_REFRESH_EXPIRY', '7d'],
    ['BCRYPT_ROUNDS', '12'],
  ])
)

const TestConfig = Layer.setConfigProvider(TestConfigProvider)

describe('LoginUseCase', () => {
  const validPassword = 'password123'
  let hashedPassword: string

  // Create test user with properly hashed password
  const createTestUser = (hash: string): User =>
    ({
      id: 'user-123' as UserId,
      email: 'test@example.com',
      password_hash: hash,
      name: 'Test User',
      role: 'admin' as UserRole,
      created_at: new Date(),
      updated_at: new Date(),
    }) as unknown as User

  // Mock UserRepository
  const createMockUserRepo = (user: User | null) =>
    Layer.succeed(UserRepository, {
      findByEmail: (_email: string) => Effect.succeed(user ? Option.some(user) : Option.none()),
      findById: (_id: UserId) => Effect.succeed(Option.none()),
      insert: (_user: typeof User.insert.Type) => Effect.succeed(user!),
      update: (
        _id: UserId,
        _data: Partial<{ email: string; password_hash: string; name: string; role: string }>
      ) => Effect.succeed(Option.none()),
      delete: (_id: UserId) => Effect.succeed(true),
    } as unknown as UserRepository)

  // Mock RefreshTokenRepository
  const MockRefreshTokenRepo = Layer.succeed(RefreshTokenRepository, {
    findByTokenHash: (_hash: string) => Effect.succeed(Option.none()),
    findById: (_id: unknown) => Effect.succeed(Option.none()),
    insert: (_data: unknown) =>
      Effect.succeed({
        id: 'token-123',
        user_id: 'user-123' as UserId,
        token_hash: 'hashed',
        expires_at: new Date(),
        created_at: new Date(),
        revoked_at: null,
      }),
    revoke: (_id: unknown) => Effect.succeed(true),
    revokeByTokenHash: (_hash: string) => Effect.succeed(true),
    revokeAllForUser: (_userId: UserId) => Effect.succeed(1),
    deleteExpired: () => Effect.succeed(0),
  } as unknown as RefreshTokenRepository)

  beforeEach(async () => {
    // Hash the password before tests
    const hashEffect = Effect.gen(function* () {
      const service = yield* PasswordService
      return yield* service.hash(validPassword)
    })
    hashedPassword = await Effect.runPromise(
      Effect.provide(hashEffect, PasswordServiceLive.pipe(Layer.provide(TestConfig)))
    )
  })

  it('should login successfully with valid credentials', async () => {
    const testUser = createTestUser(hashedPassword)
    const MockUserRepo = createMockUserRepo(testUser)

    const program = login({
      email: 'test@example.com',
      password: validPassword,
    })

    const layers = Layer.mergeAll(
      MockUserRepo,
      MockRefreshTokenRepo,
      PasswordServiceLive,
      JwtServiceLive,
      TokenGeneratorLive
    ).pipe(Layer.provide(TestConfig))

    const result = await Effect.runPromise(Effect.provide(program, layers))

    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.user.id).toBe('user-123')
    expect(result.user.email).toBe('test@example.com')
    expect(result.user.role).toBe('admin')
  })

  it('should fail with invalid email', async () => {
    const MockUserRepo = createMockUserRepo(null)

    const program = login({
      email: 'nonexistent@example.com',
      password: validPassword,
    })

    const layers = Layer.mergeAll(
      MockUserRepo,
      MockRefreshTokenRepo,
      PasswordServiceLive,
      JwtServiceLive,
      TokenGeneratorLive
    ).pipe(Layer.provide(TestConfig))

    const result = await Effect.runPromiseExit(Effect.provide(program, layers))

    expect(result._tag).toBe('Failure')
  })

  it('should fail with invalid password', async () => {
    const testUser = createTestUser(hashedPassword)
    const MockUserRepo = createMockUserRepo(testUser)

    const program = login({
      email: 'test@example.com',
      password: 'wrong-password',
    })

    const layers = Layer.mergeAll(
      MockUserRepo,
      MockRefreshTokenRepo,
      PasswordServiceLive,
      JwtServiceLive,
      TokenGeneratorLive
    ).pipe(Layer.provide(TestConfig))

    const result = await Effect.runPromiseExit(Effect.provide(program, layers))

    expect(result._tag).toBe('Failure')
  })
})
