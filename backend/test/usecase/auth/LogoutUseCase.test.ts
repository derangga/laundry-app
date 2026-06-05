import { describe, it, expect, beforeEach } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { LogoutUseCase, logoutUseCaseImpl } from 'src/usecase/auth/LogoutUseCase'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { TokenGenerator } from 'src/usecase/auth/TokenGenerator'
import type { CurrentUserData } from '@domain/CurrentUser'
import { CurrentUser } from '@domain/CurrentUser'
import type { UserId, UserRole } from '@domain/User'

const MOCK_HASHED_TOKEN = 'hashed-token-value'

const testUser: CurrentUserData = {
  id: 'user-123' as UserId,
  email: 'test@example.com',
  role: 'admin' as UserRole,
}

let revokedTokenHashes: string[] = []
let revokedUserIds: UserId[] = []

const MockTokenGenerator = Layer.succeed(TokenGenerator, {
  generate: () => Effect.succeed({ raw: 'raw-token', hashed: MOCK_HASHED_TOKEN }),
  hash: (_raw: string) => Effect.succeed(MOCK_HASHED_TOKEN),
} as unknown as TokenGenerator)

const createMockRefreshTokenRepo = () =>
  Layer.succeed(RefreshTokenRepository, {
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
    revokeByTokenHash: (hash: string) => {
      revokedTokenHashes.push(hash)
      return Effect.succeed(true)
    },
    revokeAllForUser: (userId: UserId) => {
      revokedUserIds.push(userId)
      return Effect.succeed(3)
    },
    deleteExpired: () => Effect.succeed(0),
  } as unknown as RefreshTokenRepository)

const createTestLayer = () =>
  Layer.effect(
    LogoutUseCase,
    Effect.map(logoutUseCaseImpl, (impl) => new LogoutUseCase(impl))
  ).pipe(Layer.provide(Layer.mergeAll(createMockRefreshTokenRepo(), MockTokenGenerator)))

describe('LogoutUseCase', () => {
  beforeEach(() => {
    revokedTokenHashes = []
    revokedUserIds = []
  })

  it('should logout with specific refresh token', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LogoutUseCase
      return yield* useCase.execute({ refreshToken: 'test-refresh-token' })
    })

    const result = await Effect.runPromise(
      Effect.provide(Effect.provide(program, createTestLayer()), CurrentUser.layer(testUser))
    )

    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully logged out')
    expect(revokedTokenHashes).toEqual([MOCK_HASHED_TOKEN])
  })

  it('should logout from all sessions when logoutAll is true', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LogoutUseCase
      return yield* useCase.execute({ logoutAll: true })
    })

    const result = await Effect.runPromise(
      Effect.provide(Effect.provide(program, createTestLayer()), CurrentUser.layer(testUser))
    )

    expect(result.success).toBe(true)
    expect(result.message).toContain('all sessions')
    expect(revokedUserIds).toContain(testUser.id)
  })

  it('should handle logout without refresh token', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LogoutUseCase
      return yield* useCase.execute({})
    })

    const result = await Effect.runPromise(
      Effect.provide(Effect.provide(program, createTestLayer()), CurrentUser.layer(testUser))
    )

    expect(result.success).toBe(true)
    expect(result.message).toContain('no refresh token')
  })

  it('should fail when user is not authenticated', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LogoutUseCase
      return yield* useCase.execute({ refreshToken: 'test-refresh-token' })
    })

    const programWithLayers = Effect.provide(program, createTestLayer()) as Effect.Effect<
      unknown,
      unknown,
      never
    >
    const result = await Effect.runPromiseExit(programWithLayers)

    expect(result._tag).toBe('Failure')
  })

  it('should revoke all tokens when logoutAll via revokeAllForUser', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LogoutUseCase
      return yield* useCase.execute({ logoutAll: true })
    })

    const result = await Effect.runPromise(
      Effect.provide(Effect.provide(program, createTestLayer()), CurrentUser.layer(testUser))
    )

    expect(result.success).toBe(true)
    expect(result.message).toContain('sessions')
    expect(revokedUserIds).toContain(testUser.id)
  })
})
