import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { LoginUseCase, loginUseCaseImpl } from 'src/usecase/auth/LoginUseCase'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { PasswordService } from 'src/usecase/auth/PasswordService'
import { JwtService } from 'src/usecase/auth/JwtService'
import { TokenGenerator } from 'src/usecase/auth/TokenGenerator'
import { UserId, UserRole } from '@domain/User'

const testUser = {
  id: 'user-123' as UserId,
  email: 'test@example.com',
  password_hash: 'already-hashed',
  name: 'Test User',
  role: 'admin' as UserRole,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  deleted_at: undefined,
}

const MOCK_ACCESS_TOKEN = 'mock-access-token'
const MOCK_RAW_TOKEN = 'mock-raw-token'
const MOCK_HASHED_TOKEN = 'mock-hashed-token'
const MOCK_EXPIRY = new Date('2025-01-01')

const createMockUserRepo = (user: typeof testUser | null) =>
  Layer.succeed(UserRepository, {
    findByEmail: (_email: string) =>
      Effect.succeed(user ? Option.some(user) : Option.none()),
  } as unknown as UserRepository)

const createMockPasswordService = (isValid: boolean) =>
  Layer.succeed(PasswordService, {
    hash: (_pw: string) => Effect.succeed('hashed'),
    verify: (_pw: string, _hash: string) => Effect.succeed(isValid),
  } as unknown as PasswordService)

const MockJwtService = Layer.succeed(JwtService, {
  signAccessToken: (_payload: unknown) => Effect.succeed(MOCK_ACCESS_TOKEN),
  getRefreshExpiryDate: () => MOCK_EXPIRY,
} as unknown as JwtService)

const MockTokenGenerator = Layer.succeed(TokenGenerator, {
  generateAndHash: () =>
    Effect.succeed({ rawToken: MOCK_RAW_TOKEN, hashedToken: MOCK_HASHED_TOKEN }),
} as unknown as TokenGenerator)

const createMockRefreshTokenRepo = (insertSpy?: (data: unknown) => void) =>
  Layer.succeed(RefreshTokenRepository, {
    insert: (data: unknown) => {
      insertSpy?.(data)
      return Effect.succeed({
        id: 'token-123',
        user_id: testUser.id,
        token_hash: MOCK_HASHED_TOKEN,
        expires_at: MOCK_EXPIRY,
        created_at: new Date(),
        revoked_at: null,
      })
    },
  } as unknown as RefreshTokenRepository)

const createTestLayer = (opts: {
  user?: typeof testUser | null
  passwordValid?: boolean
  insertSpy?: (data: unknown) => void
}) =>
  Layer.effect(LoginUseCase, Effect.map(loginUseCaseImpl, (impl) => new LoginUseCase(impl))).pipe(
    Layer.provide(
      Layer.mergeAll(
        createMockUserRepo('user' in opts ? opts.user ?? null : testUser),
        createMockPasswordService(opts.passwordValid ?? true),
        MockJwtService,
        MockTokenGenerator,
        createMockRefreshTokenRepo(opts.insertSpy)
      )
    )
  )

describe('LoginUseCase', () => {
  it('should login successfully with valid credentials', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LoginUseCase
      return yield* useCase.execute({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer({ user: testUser }))
    )

    expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN)
    expect(result.refreshToken).toBe(MOCK_RAW_TOKEN)
    expect(result.user.id).toBe('user-123')
    expect(result.user.email).toBe('test@example.com')
    expect(result.user.name).toBe('Test User')
    expect(result.user.role).toBe('admin')
  })

  it('should fail with invalid email', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LoginUseCase
      return yield* useCase.execute({
        email: 'nonexistent@example.com',
        password: 'password123',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ user: null }))
    )

    expect(result._tag).toBe('Failure')
  })

  it('should fail with invalid password', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* LoginUseCase
      return yield* useCase.execute({
        email: 'test@example.com',
        password: 'wrong-password',
      })
    })

    const result = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ passwordValid: false }))
    )

    expect(result._tag).toBe('Failure')
  })

  it('should store refresh token with correct user_id', async () => {
    let capturedData: Record<string, unknown> | undefined

    const program = Effect.gen(function* () {
      const useCase = yield* LoginUseCase
      return yield* useCase.execute({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer({
          insertSpy: (data) => {
            capturedData = data as Record<string, unknown>
          },
        })
      )
    )

    expect(capturedData).toBeDefined()
    expect(capturedData!.user_id).toBe('user-123')
    expect(capturedData!.token_hash).toBe(MOCK_HASHED_TOKEN)
    expect(capturedData!.expires_at).toBe(MOCK_EXPIRY)
  })
})
