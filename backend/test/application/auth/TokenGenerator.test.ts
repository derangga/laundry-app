import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { TokenGenerator, TokenGeneratorLive } from 'src/usecase/auth/TokenGenerator'

describe('TokenGenerator', () => {
  const runWithService = <A, E>(effect: Effect.Effect<A, E, TokenGenerator>) =>
    Effect.runPromise(Effect.provide(effect, TokenGeneratorLive))

  describe('generate', () => {
    it('should generate a random token', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        return yield* service.generate()
      })

      const token = await runWithService(program)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes = 64 hex characters
    })

    it('should generate unique tokens', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        const token1 = yield* service.generate()
        const token2 = yield* service.generate()
        return { token1, token2 }
      })

      const { token1, token2 } = await runWithService(program)
      expect(token1).not.toBe(token2)
    })

    it('should generate tokens of specified length', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        return yield* service.generate(16)
      })

      const token = await runWithService(program)
      expect(token.length).toBe(32) // 16 bytes = 32 hex characters
    })
  })

  describe('hash', () => {
    it('should hash a token with SHA-256', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        return yield* service.hash('test-token')
      })

      const hash = await runWithService(program)
      expect(hash).toBeDefined()
      expect(hash.length).toBe(64) // SHA-256 = 64 hex characters
    })

    it('should produce consistent hashes for the same input', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        const hash1 = yield* service.hash('test-token')
        const hash2 = yield* service.hash('test-token')
        return { hash1, hash2 }
      })

      const { hash1, hash2 } = await runWithService(program)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        const hash1 = yield* service.hash('token-1')
        const hash2 = yield* service.hash('token-2')
        return { hash1, hash2 }
      })

      const { hash1, hash2 } = await runWithService(program)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateAndHash', () => {
    it('should generate a token and its hash', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        return yield* service.generateAndHash()
      })

      const { rawToken, hashedToken } = await runWithService(program)
      expect(rawToken).toBeDefined()
      expect(hashedToken).toBeDefined()
      expect(rawToken).not.toBe(hashedToken)
    })

    it('should produce a hash that matches manually hashing the token', async () => {
      const program = Effect.gen(function* () {
        const service = yield* TokenGenerator
        const { rawToken, hashedToken } = yield* service.generateAndHash()
        const manualHash = yield* service.hash(rawToken)
        return { hashedToken, manualHash }
      })

      const { hashedToken, manualHash } = await runWithService(program)
      expect(hashedToken).toBe(manualHash)
    })
  })
})
