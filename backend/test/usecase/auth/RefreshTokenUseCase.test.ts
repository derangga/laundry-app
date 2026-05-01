import { describe, it, expect, beforeEach } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { RefreshTokenUseCase, refreshUseCaseImpl } from 'src/usecase/auth/RefreshTokenUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { JwtService } from 'src/usecase/auth/JwtService'
import { TokenGenerator } from 'src/usecase/auth/TokenGenerator'
import { RefreshToken, RefreshTokenId } from '@domain/RefreshToken'
import { User, UserId, UserRole } from '@domain/User'

const MOCK_ACCESS_TOKEN = 'mock-access-token'
const MOCK_RAW_TOKEN = 'mock-raw-token'
const MOCK_HASHED_TOKEN = 'mock-hashed-token'
const MOCK_EXPIRY = new Date('2025-12-31')

const testUser: User = {
  id: 'user-123' as UserId,
  email: 'test@example.com',
  password_hash: 'hashed',
  name: 'Test User',
  role: 'admin' as UserRole,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
} as unknown as User

const validStoredToken: RefreshToken = {
  id: 'token-123' as RefreshTokenId,
  user_id: 'user-123' as UserId,
  token_hash: MOCK_HASHED_TOKEN,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  created_at: new Date('2024-01-01'),
  revoked_at: null,
} as unknown as RefreshToken

let revokedTokenIds: string[] = []
let insertedTokens: unknown[] = []

const MockJwtService = Layer.succeed(JwtService, {
  signAccessToken: () => Effect.succeed(MOCK_ACCESS_TOKEN),
  signRefreshToken: () => Effect.succeed('mock-refresh-jwt'),
  verifyAccessToken: () => Effect.succeed({ sub: 'user-123' as UserId, email: 'test@example.com', role: 'admin' as UserRole }),
  verifyRefreshToken: () => Effect.succeed({ sub: 'user-123' as UserId }),
  getRefreshExpiryDate: () => MOCK_EXPIRY,
  accessExpiry: {} as never,
  refreshExpiry: {} as never,
} as unknown as JwtService)

const MockTokenGenerator = Layer.succeed(TokenGenerator, {
  generate: () => Effect.succeed(MOCK_RAW_TOKEN),
  hash: (_raw: string) => Effect.succeed(MOCK_HASHED_TOKEN),
  generateAndHash: () => Effect.succeed({ rawToken: MOCK_RAW_TOKEN, hashedToken: MOCK_HASHED_TOKEN }),
} as unknown as TokenGenerator)

const createMockUserRepo = (user: User | null) =>
  Layer.succeed(UserRepository, {
    findByEmail: (_email: string) => Effect.succeed(Option.none()),
    findById: (id: UserId) => {
      if (user && id === user.id) return Effect.succeed(Option.some(user))
      return Effect.succeed(Option.none())
    },
    insert: (_user: typeof User.insert.Type) => Effect.succeed(user!),
    update: (_id: UserId, _data: unknown) => Effect.succeed(Option.none()),
    delete: (_id: UserId) => Effect.succeed(true),
    hasAnyUsers: () => Effect.succeed(false),
  } as unknown as UserRepository)

const createMockRefreshTokenRepo = (storedToken: RefreshToken | null) =>
  Layer.succeed(RefreshTokenRepository, {
    findByTokenHash: (_hash: string) => {
      if (storedToken) return Effect.succeed(Option.some(storedToken))
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

const createTestLayer = (opts: { storedToken?: RefreshToken | null; user?: User | null }) =>
  Layer.effect(RefreshTokenUseCase, Effect.map(refreshUseCaseImpl, (impl) => new RefreshTokenUseCase(impl))).pipe(
    Layer.provide(
      Layer.mergeAll(
        createMockUserRepo('user' in opts ? opts.user ?? null : testUser),
        createMockRefreshTokenRepo(opts.storedToken ?? null),
        MockJwtService,
        MockTokenGenerator
      )
    )
  )

describe('RefreshTokenUseCase', () => {
  beforeEach(() => {
    revokedTokenIds = []
    insertedTokens = []
  })

  it('should refresh tokens successfully', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* RefreshTokenUseCase
      return yield* useCase.execute({ refreshToken: 'any-raw-token' })
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer({ storedToken: validStoredToken }))
    )

    expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN)
    expect(result.refreshToken).toBe(MOCK_RAW_TOKEN)
    expect(result.user.id).toBe(testUser.id)
    expect(result.user.email).toBe(testUser.email)
    expect(revokedTokenIds).toContain(validStoredToken.id)
    expect(insertedTokens.length).toBe(1)
  })

  it('should fail with invalid refresh token', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* RefreshTokenUseCase
      return yield* useCase.execute({ refreshToken: 'invalid-token' })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ storedToken: null }))
    )

    expect(result._tag).toBe('Failure')
  })

  it('should fail if user not found', async () => {
    const orphanToken = {
      ...validStoredToken,
      user_id: 'non-existent-user' as UserId,
    } as unknown as RefreshToken

    const program = Effect.gen(function* () {
      const useCase = yield* RefreshTokenUseCase
      return yield* useCase.execute({ refreshToken: 'any-raw-token' })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ storedToken: orphanToken }))
    )

    expect(result._tag).toBe('Failure')
  })

  it('should store new refresh token after rotation', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* RefreshTokenUseCase
      return yield* useCase.execute({ refreshToken: 'any-raw-token' })
    })

    await Effect.runPromise(
      Effect.provide(program, createTestLayer({ storedToken: validStoredToken }))
    )

    expect(insertedTokens.length).toBe(1)
    const inserted = insertedTokens[0] as Record<string, unknown>
    expect(inserted.user_id).toBe(testUser.id)
    expect(inserted.token_hash).toBe(MOCK_HASHED_TOKEN)
    expect(inserted.expires_at).toBe(MOCK_EXPIRY)
  })
})
