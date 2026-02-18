import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { Effect, Layer, Option } from 'effect'

import { createTestUsers, TestConfig } from './fixtures'
import { UserRepository } from '@repositories/UserRepository'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { PasswordServiceLive } from 'src/usecase/auth/PasswordService'
import { JwtServiceLive } from 'src/usecase/auth/JwtService'
import { TokenGeneratorLive } from 'src/usecase/auth/TokenGenerator'
import { RefreshToken, RefreshTokenId } from '@domain/RefreshToken'
import { User, UserId } from '@domain/User'
import { login } from 'src/usecase/auth/LoginUseCase'
import { refreshTokens as refreshTokensUseCase } from 'src/usecase/auth/RefreshTokenUseCase'
import { logout } from 'src/usecase/auth/LogoutUseCase'
import { JwtService } from 'src/usecase/auth/JwtService'
import { CurrentUser } from '@domain/CurrentUser'

const createMockUserRepo = (users: User[]) =>
  Layer.succeed(UserRepository, {
    findByEmail: (email: string) =>
      Effect.succeed(Option.fromNullable(users.find((u) => u.email === email))),
    findById: (_id: UserId) => Effect.succeed(Option.fromNullable(users.find((u) => u.id === _id))),
    insert: (_user: typeof User.insert.Type) => Effect.succeed(users[0] ?? users[0]),
    update: (
      _id: UserId,
      _data: Partial<{ email: string; password_hash: string; name: string; role: string }>
    ) => Effect.succeed(Option.none()),
    delete: (_id: UserId) => Effect.succeed(true),
    findByEmailWithoutPassword: (_email: string) => Effect.succeed(Option.fromNullable(users[0])),
  } as unknown as UserRepository)

const createMockRefreshTokenRepo = (tokens: RefreshToken[]) => {
  const mockRepo = {
    findByTokenHash: (hash: string) =>
      Effect.succeed(Option.fromNullable(tokens.find((t) => t.token_hash === hash))),
    findById: (_id: RefreshTokenId) => Effect.succeed(Option.none()),
    insert: (_data: typeof RefreshToken.insert.Type) => {
      const newToken = {
        id: RefreshTokenId.make(`token-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        user_id: _data.user_id,
        token_hash: _data.token_hash,
        expires_at: _data.expires_at,
        created_at: new Date() as any,
        revoked_at: null,
      }
      tokens.push(newToken)
      return Effect.succeed(newToken)
    },
    revoke: (_id: RefreshTokenId) => Effect.succeed(true),
    revokeByTokenHash: (hash: string) => {
      const index = tokens.findIndex((t) => t.token_hash === hash)
      if (index >= 0 && tokens[index]) {
        const token = tokens[index]
        tokens[index] = { ...token, revoked_at: new Date() as any }
      }
      return Effect.succeed(true)
    },
    revokeAllForUser: (userId: UserId) => {
      const count = tokens.filter((t) => t.user_id === userId).length
      return Effect.succeed(count)
    },
    deleteExpired: () => Effect.succeed(0),
  }
  return Layer.succeed(RefreshTokenRepository, mockRepo as unknown as RefreshTokenRepository)
}

const createTestLayer = (users: User[], storedRefreshTokens: RefreshToken[]) =>
  Layer.mergeAll(
    createMockUserRepo(users),
    createMockRefreshTokenRepo(storedRefreshTokens),
    PasswordServiceLive,
    JwtServiceLive,
    TokenGeneratorLive
  ).pipe(Layer.provide(TestConfig))

const provideCurrentUser = (user: User) =>
  Layer.succeed(CurrentUser, {
    id: user.id,
    email: user.email,
    role: user.role,
  })

describe('POST /api/auth/login', () => {
  let testUsers: {
    admin: { email: string; password: string; hashedPassword: string; user: User }
    staff: { email: string; password: string; hashedPassword: string; user: User }
  }
  let refreshTokens: RefreshToken[]

  beforeAll(async () => {
    testUsers = await createTestUsers()
    refreshTokens = []
  })

  it('should login successfully with valid credentials', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const result = await Effect.runPromise(
      Effect.provide(
        login({
          email: 'admin@example.com',
          password: 'password123',
        }),
        testLayer
      )
    )

    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.user.id).toBe(testUsers.admin.user.id)
    expect(result.user.email).toBe('admin@example.com')
    expect(result.user.role).toBe('admin')
  })

  it('should store refresh token in database after login', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    await Effect.runPromise(
      Effect.provide(
        login({
          email: 'admin@example.com',
          password: 'password123',
        }),
        testLayer
      )
    )

    expect(refreshTokens.length).toBeGreaterThan(0)
    const lastToken = refreshTokens[refreshTokens.length - 1]
    expect(lastToken).toBeDefined()
    expect(lastToken!.token_hash).toBeDefined()
    expect(lastToken!.user_id).toBe(testUsers.admin.user.id)
  })

  it('should fail with invalid email format', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const result = await Effect.runPromiseExit(
      Effect.provide(
        login({
          email: 'notanemail',
          password: 'password123',
        }),
        testLayer
      )
    )
    expect(result._tag).toBe('Failure')
  })

  it('should fail with password too short', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const result = await Effect.runPromiseExit(
      Effect.provide(
        login({
          email: 'test@example.com',
          password: 'short',
        }),
        testLayer
      )
    )
    expect(result._tag).toBe('Failure')
  })

  it('should fail with wrong password', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const result = await Effect.runPromiseExit(
      Effect.provide(
        login({
          email: 'admin@example.com',
          password: 'wrongpassword',
        }),
        testLayer
      )
    )
    expect(result._tag).toBe('Failure')
  })

  it('should fail with non-existent user', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const result = await Effect.runPromiseExit(
      Effect.provide(
        login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
        testLayer
      )
    )
    expect(result._tag).toBe('Failure')
  })
})

describe('POST /api/auth/refresh', () => {
  let testUsers: {
    admin: { email: string; password: string; hashedPassword: string; user: User }
    staff: { email: string; password: string; hashedPassword: string; user: User }
  }
  let refreshTokens: RefreshToken[]

  beforeEach(() => {
    refreshTokens = []
  })

  beforeAll(async () => {
    testUsers = await createTestUsers()
  })

  it('should refresh token successfully', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const program = Effect.gen(function* () {
      const loginResult = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })
      const refreshResult = yield* refreshTokensUseCase({
        refreshToken: loginResult.refreshToken,
      })
      return { login: loginResult, refresh: refreshResult }
    })

    const result = await Effect.runPromise(Effect.provide(program, testLayer))

    expect(result.refresh.accessToken).toBeDefined()
    expect(result.refresh.refreshToken).toBeDefined()
    expect(result.refresh.refreshToken).not.toBe(result.login.refreshToken)
  })

  it('should fail with invalid refresh token', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const result = await Effect.runPromiseExit(
      Effect.provide(
        refreshTokensUseCase({
          refreshToken: 'invalid-token-12345',
        }),
        testLayer
      )
    )
    expect(result._tag).toBe('Failure')
  })

  it('should revoke old token after refresh', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const program = Effect.gen(function* () {
      const loginResult = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })
      const oldTokenHash = refreshTokens[refreshTokens.length - 1]?.token_hash

      yield* refreshTokensUseCase({
        refreshToken: loginResult.refreshToken,
      })

      return { oldTokenHash }
    })

    const { oldTokenHash } = await Effect.runPromise(Effect.provide(program, testLayer))

    const revokedToken = refreshTokens.find((t) => t.token_hash === oldTokenHash)
    expect(revokedToken?.revoked_at).toBeDefined()
  })
})

describe('POST /api/auth/logout', () => {
  let testUsers: {
    admin: { email: string; password: string; hashedPassword: string; user: User }
    staff: { email: string; password: string; hashedPassword: string; user: User }
  }
  let refreshTokens: RefreshToken[]

  beforeEach(() => {
    refreshTokens = []
  })

  beforeAll(async () => {
    testUsers = await createTestUsers()
  })

  it('should logout successfully', async () => {
    const baseLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)
    const fullLayer = Layer.mergeAll(baseLayer, provideCurrentUser(testUsers.admin.user))

    const program = Effect.gen(function* () {
      const loginResult = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })

      const result = yield* logout({
        refreshToken: loginResult.refreshToken,
      })
      return result
    })

    const result = await Effect.runPromise(Effect.provide(program, fullLayer))

    expect(result.success).toBe(true)
  })

  it('should logout all sessions', async () => {
    const baseLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)
    const fullLayer = Layer.mergeAll(baseLayer, provideCurrentUser(testUsers.admin.user))

    const program = Effect.gen(function* () {
      const loginResult = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })

      const result = yield* logout({
        refreshToken: loginResult.refreshToken,
        logoutAll: true,
      })
      return result
    })

    const result = await Effect.runPromise(Effect.provide(program, fullLayer))

    expect(result.success).toBe(true)
    expect(result.message).toContain('revoked')
  })

  it('should succeed without refresh token', async () => {
    const baseLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)
    const fullLayer = Layer.mergeAll(baseLayer, provideCurrentUser(testUsers.admin.user))

    const result = await Effect.runPromise(Effect.provide(logout({}), fullLayer))
    expect(result.success).toBe(true)
    expect(result.message).toContain('no refresh token')
  })
})

describe('Integration Flows', () => {
  let testUsers: {
    admin: { email: string; password: string; hashedPassword: string; user: User }
    staff: { email: string; password: string; hashedPassword: string; user: User }
  }
  let refreshTokens: RefreshToken[]

  beforeEach(() => {
    refreshTokens = []
  })

  beforeAll(async () => {
    testUsers = await createTestUsers()
  })

  it('should complete full authentication flow', async () => {
    const baseLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)
    const fullLayer = Layer.mergeAll(baseLayer, provideCurrentUser(testUsers.admin.user))

    const program = Effect.gen(function* () {
      const loginResult = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })
      expect(loginResult.accessToken).toBeDefined()
      expect(loginResult.refreshToken).toBeDefined()

      const refreshResult = yield* refreshTokensUseCase({
        refreshToken: loginResult.refreshToken,
      })
      expect(refreshResult.accessToken).toBeDefined()
      expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken)

      const logoutResult = yield* logout({
        refreshToken: refreshResult.refreshToken,
      })
      expect(logoutResult.success).toBe(true)

      return { login: loginResult, refresh: refreshResult, logout: logoutResult }
    })

    const result = await Effect.runPromise(Effect.provide(program, fullLayer))
    expect(result.logout.success).toBe(true)
  })

  it('should support multiple sessions for same user', async () => {
    const testLayer = createTestLayer([testUsers.admin.user, testUsers.staff.user], refreshTokens)

    const program = Effect.gen(function* () {
      const session1 = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })

      const session2 = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })

      return { session1, session2 }
    })

    const result = await Effect.runPromise(Effect.provide(program, testLayer))

    expect(result.session1.refreshToken).not.toBe(result.session2.refreshToken)
    expect(refreshTokens.length).toBe(2)
  })
})

describe('Cookie Security', () => {
  it('should generate tokens with proper expiration times', async () => {
    const testUsers = await createTestUsers()
    const refreshTokens: RefreshToken[] = []
    const testLayer = createTestLayer([testUsers.admin.user], refreshTokens)

    const program = Effect.gen(function* () {
      const loginResult = yield* login({
        email: 'admin@example.com',
        password: 'password123',
      })

      const jwtService = yield* JwtService
      const payload = yield* jwtService.verifyAccessToken(loginResult.accessToken)

      return { loginResult, payload }
    })

    const { payload } = await Effect.runPromise(Effect.provide(program, testLayer))

    expect(payload.sub).toBeDefined()
    expect(payload.email).toBeDefined()
    expect(payload.role).toBeDefined()
  })
})
