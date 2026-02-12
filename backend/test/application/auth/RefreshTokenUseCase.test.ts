import { describe, it, expect, beforeEach } from 'vitest'
import { Effect, Layer, Option, ConfigProvider } from 'effect'
import { refreshTokens } from 'src/usecase/auth/RefreshTokenUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { RefreshToken, RefreshTokenId } from '@domain/RefreshToken'
import { JwtServiceLive } from 'src/usecase/auth/JwtService'
import { TokenGenerator, TokenGeneratorLive } from 'src/usecase/auth/TokenGenerator'
import { User, UserId, UserRole } from '@domain/User'

const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ['JWT_SECRET', 'test-secret-key-that-is-at-least-32-characters-long'],
    ['JWT_ACCESS_EXPIRY', '15m'],
    ['JWT_REFRESH_EXPIRY', '7d'],
  ])
)

const TestConfig = Layer.setConfigProvider(TestConfigProvider)

describe('RefreshTokenUseCase', () => {
  const testUser: User = {
    id: 'user-123' as UserId,
    email: 'test@example.com',
    password_hash: 'hashed',
    name: 'Test User',
    role: 'admin' as UserRole,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as User

  const validStoredToken: RefreshToken = {
    id: 'token-123' as RefreshTokenId,
    user_id: 'user-123' as UserId,
    token_hash: 'stored-hash',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    created_at: new Date(),
    revoked_at: null,
  } as unknown as RefreshToken

  let revokedTokenIds: string[] = []
  let insertedTokens: unknown[] = []

  const createMockRefreshTokenRepo = (storedToken: RefreshToken | null, tokenHash: string) =>
    Layer.succeed(RefreshTokenRepository, {
      findByTokenHash: (hash: string) => {
        if (hash === tokenHash && storedToken) {
          return Effect.succeed(Option.some(storedToken))
        }
        return Effect.succeed(Option.none())
      },
      findById: (_id: unknown) => Effect.succeed(Option.none()),
      insert: (data: unknown) => {
        insertedTokens.push(data)
        return Effect.succeed({
          id: 'new-token-123' as RefreshTokenId,
          ...(data as object),
          created_at: new Date(),
          revoked_at: null,
        })
      },
      revoke: (id: unknown) => {
        revokedTokenIds.push(id as string)
        return Effect.succeed(true)
      },
      revokeByTokenHash: (_hash: string) => Effect.succeed(true),
      revokeAllForUser: (_userId: UserId) => Effect.succeed(1),
      deleteExpired: () => Effect.succeed(0),
    } as unknown as RefreshTokenRepository)

  const MockUserRepo = Layer.succeed(UserRepository, {
    findByEmail: (_email: string) => Effect.succeed(Option.none()),
    findById: (id: UserId) => {
      if (id === testUser.id) {
        return Effect.succeed(Option.some(testUser))
      }
      return Effect.succeed(Option.none())
    },
    insert: (_user: typeof User.insert.Type) => Effect.succeed(testUser),
    update: (_id: UserId, _data: unknown) => Effect.succeed(Option.none()),
    delete: (_id: UserId) => Effect.succeed(true),
  } as unknown as UserRepository)

  beforeEach(() => {
    revokedTokenIds = []
    insertedTokens = []
  })

  it('should refresh tokens successfully', async () => {
    const rawToken = 'raw-refresh-token'

    // Get the hash of the raw token to match against
    const hashProgram = Effect.gen(function* () {
      const tokenGen = yield* TokenGenerator
      return yield* tokenGen.hash(rawToken)
    })
    const expectedHash = await Effect.runPromise(Effect.provide(hashProgram, TokenGeneratorLive))

    const storedToken = {
      ...validStoredToken,
      token_hash: expectedHash,
    } as unknown as RefreshToken

    const MockRefreshTokenRepo = createMockRefreshTokenRepo(storedToken, expectedHash)

    const program = refreshTokens({
      refreshToken: rawToken,
    })

    const layers = Layer.mergeAll(
      MockUserRepo,
      MockRefreshTokenRepo,
      JwtServiceLive,
      TokenGeneratorLive
    ).pipe(Layer.provide(TestConfig))

    const result = await Effect.runPromise(Effect.provide(program, layers))

    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.refreshToken).not.toBe(rawToken) // New token issued
    expect(result.user.id).toBe(testUser.id)
    expect(result.user.email).toBe(testUser.email)
    expect(revokedTokenIds).toContain(storedToken.id) // Old token revoked
    expect(insertedTokens.length).toBe(1) // New token inserted
  })

  it('should fail with invalid refresh token', async () => {
    const MockRefreshTokenRepo = createMockRefreshTokenRepo(null, '')

    const program = refreshTokens({
      refreshToken: 'invalid-token',
    })

    const layers = Layer.mergeAll(
      MockUserRepo,
      MockRefreshTokenRepo,
      JwtServiceLive,
      TokenGeneratorLive
    ).pipe(Layer.provide(TestConfig))

    const result = await Effect.runPromiseExit(Effect.provide(program, layers))

    expect(result._tag).toBe('Failure')
  })

  it('should fail if user not found', async () => {
    const rawToken = 'raw-refresh-token'

    const hashProgram = Effect.gen(function* () {
      const tokenGen = yield* TokenGenerator
      return yield* tokenGen.hash(rawToken)
    })
    const expectedHash = await Effect.runPromise(Effect.provide(hashProgram, TokenGeneratorLive))

    // Token for a non-existent user
    const storedToken = {
      ...validStoredToken,
      user_id: 'non-existent-user' as UserId,
      token_hash: expectedHash,
    } as unknown as RefreshToken

    const MockRefreshTokenRepo = createMockRefreshTokenRepo(storedToken, expectedHash)

    const program = refreshTokens({
      refreshToken: rawToken,
    })

    const layers = Layer.mergeAll(
      MockUserRepo,
      MockRefreshTokenRepo,
      JwtServiceLive,
      TokenGeneratorLive
    ).pipe(Layer.provide(TestConfig))

    const result = await Effect.runPromiseExit(Effect.provide(program, layers))

    expect(result._tag).toBe('Failure')
  })
})
