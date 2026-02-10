import { describe, it, expect } from "vitest"
import { Effect, Layer, ConfigProvider } from "effect"
import { JwtService, JwtServiceLive, JwtPayload } from "@infrastructure/JwtService"
import { UserId, UserRole } from "@domain/User"

const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["JWT_SECRET", "test-secret-key-that-is-at-least-32-characters-long"],
    ["JWT_ACCESS_EXPIRY", "15m"],
    ["JWT_REFRESH_EXPIRY", "7d"],
  ])
)

const TestConfig = Layer.setConfigProvider(TestConfigProvider)

describe("JwtService", () => {
  const runWithService = <A, E>(effect: Effect.Effect<A, E, JwtService>) =>
    Effect.runPromise(Effect.provide(effect, Layer.merge(JwtServiceLive, TestConfig)))

  const testPayload: JwtPayload = {
    sub: "user-123" as UserId,
    email: "test@example.com",
    role: "admin" as UserRole,
  }

  describe("signAccessToken", () => {
    it("should sign an access token", async () => {
      const program = Effect.gen(function* () {
        const service = yield* JwtService
        return yield* service.signAccessToken(testPayload)
      })

      const token = await runWithService(program)
      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe("signRefreshToken", () => {
    it("should sign a refresh token", async () => {
      const program = Effect.gen(function* () {
        const service = yield* JwtService
        return yield* service.signRefreshToken("user-123" as UserId)
      })

      const token = await runWithService(program)
      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })
  })

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", async () => {
      const program = Effect.gen(function* () {
        const service = yield* JwtService
        const token = yield* service.signAccessToken(testPayload)
        return yield* service.verifyAccessToken(token)
      })

      const payload = await runWithService(program)
      expect(payload.sub).toBe(testPayload.sub)
      expect(payload.email).toBe(testPayload.email)
      expect(payload.role).toBe(testPayload.role)
    })

    it("should reject an invalid token", async () => {
      const program = Effect.gen(function* () {
        const service = yield* JwtService
        return yield* service.verifyAccessToken("invalid-token")
      })

      await expect(runWithService(program)).rejects.toThrow()
    })

    it("should reject a malformed token", async () => {
      const program = Effect.gen(function* () {
        const service = yield* JwtService
        return yield* Effect.either(service.verifyAccessToken("not.a.valid.jwt"))
      })

      const result = await runWithService(program)
      expect(result._tag).toBe("Left")
    })
  })

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", async () => {
      const userId = "user-123" as UserId

      const program = Effect.gen(function* () {
        const service = yield* JwtService
        const token = yield* service.signRefreshToken(userId)
        return yield* service.verifyRefreshToken(token)
      })

      const payload = await runWithService(program)
      expect(payload.sub).toBe(userId)
    })
  })

  describe("getRefreshExpiryDate", () => {
    it("should return a future date", async () => {
      const program = Effect.gen(function* () {
        const service = yield* JwtService
        return service.getRefreshExpiryDate()
      })

      const expiryDate = await runWithService(program)
      expect(expiryDate.getTime()).toBeGreaterThan(Date.now())
    })
  })
})
