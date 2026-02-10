import { describe, it, expect, beforeEach } from "vitest"
import { Effect, Layer, Option } from "effect"
import { logout, logoutAll } from "@application/auth/LogoutUseCase"
import { RefreshTokenRepository } from "@infrastructure/database/repositories/RefreshTokenRepository"
import { TokenGeneratorLive } from "@infrastructure/TokenGenerator"
import { CurrentUser, CurrentUserData } from "@domain/CurrentUser"
import { UserId, UserRole } from "@domain/User"

describe("LogoutUseCase", () => {
  const testUser: CurrentUserData = {
    id: "user-123" as UserId,
    email: "test@example.com",
    role: "admin" as UserRole,
  }

  // Track revocation calls for assertions
  let revokedTokenHashes: string[] = []
  let revokedUserIds: UserId[] = []

  const createMockRefreshTokenRepo = () =>
    Layer.succeed(RefreshTokenRepository, {
      findByTokenHash: (_hash: string) => Effect.succeed(Option.none()),
      findById: (_id: unknown) => Effect.succeed(Option.none()),
      insert: (_data: unknown) =>
        Effect.succeed({
          id: "token-123",
          user_id: "user-123" as UserId,
          token_hash: "hashed",
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
        return Effect.succeed(3) // Simulate 3 tokens revoked
      },
      deleteExpired: () => Effect.succeed(0),
    } as unknown as RefreshTokenRepository)

  beforeEach(() => {
    revokedTokenHashes = []
    revokedUserIds = []
  })

  describe("logout", () => {
    it("should logout with specific refresh token", async () => {
      const MockRefreshTokenRepo = createMockRefreshTokenRepo()
      const program = logout({
        refreshToken: "test-refresh-token",
      })

      const layers = Layer.merge(MockRefreshTokenRepo, TokenGeneratorLive)
      const result = await Effect.runPromise(
        Effect.provide(
          Effect.provide(program, layers),
          CurrentUser.layer(testUser)
        )
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain("Successfully logged out")
      expect(revokedTokenHashes.length).toBe(1)
    })

    it("should logout from all sessions when logoutAll is true", async () => {
      const MockRefreshTokenRepo = createMockRefreshTokenRepo()
      const program = logout({
        logoutAll: true,
      })

      const layers = Layer.merge(MockRefreshTokenRepo, TokenGeneratorLive)
      const result = await Effect.runPromise(
        Effect.provide(
          Effect.provide(program, layers),
          CurrentUser.layer(testUser)
        )
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain("all sessions")
      expect(revokedUserIds).toContain(testUser.id)
    })

    it("should handle logout without refresh token", async () => {
      const MockRefreshTokenRepo = createMockRefreshTokenRepo()
      const program = logout({})

      const layers = Layer.merge(MockRefreshTokenRepo, TokenGeneratorLive)
      const result = await Effect.runPromise(
        Effect.provide(
          Effect.provide(program, layers),
          CurrentUser.layer(testUser)
        )
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain("no refresh token")
    })

    it("should fail when user is not authenticated", async () => {
      const MockRefreshTokenRepo = createMockRefreshTokenRepo()
      const program = logout({
        refreshToken: "test-refresh-token",
      })

      const layers = Layer.merge(MockRefreshTokenRepo, TokenGeneratorLive)
      // Cast to handle missing CurrentUser context for testing
      const programWithLayers = Effect.provide(program, layers) as Effect.Effect<unknown, unknown, never>
      const result = await Effect.runPromiseExit(programWithLayers)

      expect(result._tag).toBe("Failure")
    })
  })

  describe("logoutAll", () => {
    it("should revoke all tokens for a user", async () => {
      const MockRefreshTokenRepo = createMockRefreshTokenRepo()
      const userId = "user-123" as UserId
      const program = logoutAll(userId)

      const result = await Effect.runPromise(Effect.provide(program, MockRefreshTokenRepo))

      expect(result.success).toBe(true)
      expect(result.message).toContain("terminated")
      expect(revokedUserIds).toContain(userId)
    })
  })
})
