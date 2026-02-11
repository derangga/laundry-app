import { describe, it, expect } from 'vitest'
import { Effect, Layer, ConfigProvider } from 'effect'
import { PasswordService, PasswordServiceLive } from '@application/auth/PasswordService'

const TestConfigProvider = ConfigProvider.fromMap(
  new Map([['BCRYPT_ROUNDS', '12']])
)

const TestConfig = Layer.setConfigProvider(TestConfigProvider)

describe('PasswordService', () => {
  const runWithService = <A, E>(effect: Effect.Effect<A, E, PasswordService>) =>
    Effect.runPromise(Effect.provide(effect, Layer.merge(PasswordServiceLive, TestConfig)))

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'securePassword123!'

      const program = Effect.gen(function* () {
        const service = yield* PasswordService
        return yield* service.hash(password)
      })

      const hash = await runWithService(program)
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should produce different hashes for the same password', async () => {
      const password = 'securePassword123!'

      const program = Effect.gen(function* () {
        const service = yield* PasswordService
        const hash1 = yield* service.hash(password)
        const hash2 = yield* service.hash(password)
        return { hash1, hash2 }
      })

      const { hash1, hash2 } = await runWithService(program)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'securePassword123!'

      const program = Effect.gen(function* () {
        const service = yield* PasswordService
        const hash = yield* service.hash(password)
        return yield* service.verify(password, hash)
      })

      const isValid = await runWithService(program)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'securePassword123!'
      const wrongPassword = 'wrongPassword456!'

      const program = Effect.gen(function* () {
        const service = yield* PasswordService
        const hash = yield* service.hash(password)
        return yield* service.verify(wrongPassword, hash)
      })

      const isValid = await runWithService(program)
      expect(isValid).toBe(false)
    })

    it('should handle empty passwords', async () => {
      const program = Effect.gen(function* () {
        const service = yield* PasswordService
        const hash = yield* service.hash('')
        return yield* service.verify('', hash)
      })

      const isValid = await runWithService(program)
      expect(isValid).toBe(true)
    })
  })
})
