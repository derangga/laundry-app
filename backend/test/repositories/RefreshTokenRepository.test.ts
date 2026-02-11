import { describe, it, expect } from 'vitest'
import { DateTime, Effect, Option } from 'effect'
import { RefreshTokenRepository } from '@repositories/RefreshTokenRepository'
import { UserId } from '@domain/User'
import { createMockSqlClient, createSqlError } from './testUtils'
import { RefreshToken, RefreshTokenId } from '@domain/RefreshToken'

const createMockRefreshToken = (overrides?: Partial<RefreshToken>): RefreshToken =>
  ({
    id: 'token-123' as RefreshTokenId,
    user_id: 'user-123' as UserId,
    token_hash: 'hashed_token',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_at: new Date().toISOString(),
    revoked_at: null,
    ...overrides,
  }) as unknown as RefreshToken

describe('RefreshTokenRepository', () => {
  describe('findByTokenHash', () => {
    it('should return Option.some for valid non-revoked token', async () => {
      const mockToken = createMockRefreshToken({
        token_hash: 'valid_hash',
        revoked_at: null,
        expires_at: DateTime.unsafeMake(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
      })
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [mockToken] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findByTokenHash('valid_hash')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const token = Option.getOrThrow(result)
      expect(token.token_hash).toBe('valid_hash')
      expect(token.revoked_at).toBe(null)
    })

    it('should return Option.none for revoked token', async () => {
      // Query filters out revoked tokens, so empty result
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findByTokenHash('revoked_hash')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should return Option.none for expired token', async () => {
      // Query filters out expired tokens, so empty result
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findByTokenHash('expired_hash')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should return Option.none when token not found', async () => {
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findByTokenHash('nonexistent_hash')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Database connection lost')
      const mockSqlLayer = createMockSqlClient<RefreshToken>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findByTokenHash('any_hash')
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findById', () => {
    it('should return Option.some when token exists', async () => {
      const mockToken = createMockRefreshToken({
        id: 'token-456' as RefreshTokenId,
      })
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [mockToken] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findById('token-456' as RefreshTokenId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const token = Option.getOrThrow(result)
      expect(token.id).toBe('token-456')
    })

    it('should return Option.none when token not found', async () => {
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findById('nonexistent-id' as RefreshTokenId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<RefreshToken>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.findById('token-123' as RefreshTokenId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('insert', () => {
    it('should create new refresh token successfully', async () => {
      const newToken = createMockRefreshToken({
        user_id: 'user-789' as UserId,
        token_hash: 'new_token_hash',
      })
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [newToken] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.insert({
          user_id: 'user-789' as UserId,
          token_hash: 'new_token_hash',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.token_hash).toBe('new_token_hash')
      expect(result.user_id).toBe('user-789')
    })

    it('should handle SQL errors on insert', async () => {
      const sqlError = createSqlError('Insert constraint violation')
      const mockSqlLayer = createMockSqlClient<RefreshToken>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.insert({
          user_id: 'user-123' as UserId,
          token_hash: 'token_hash',
          expires_at: new Date(),
        })
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })

    it('should fail when no row returned from insert', async () => {
      const mockSqlLayer = createMockSqlClient<RefreshToken>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.insert({
          user_id: 'user-123' as UserId,
          token_hash: 'token_hash',
          expires_at: new Date(),
        })
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('revoke', () => {
    it('should mark token as revoked by ID', async () => {
      // UPDATE queries return empty array on success
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revoke('token-123' as RefreshTokenId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(true)
    })

    it('should return true even when token not found', async () => {
      // Repository always returns true, query handles NOT FOUND
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revoke('nonexistent-id' as RefreshTokenId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(true)
    })

    it('should handle SQL errors on revoke', async () => {
      const sqlError = createSqlError('Update failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revoke('token-123' as RefreshTokenId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('revokeByTokenHash', () => {
    it('should revoke token by hash', async () => {
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revokeByTokenHash('token_hash_to_revoke')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Revoke failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revokeByTokenHash('any_hash')
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('revokeAllForUser', () => {
    it('should revoke all user tokens and return count', async () => {
      // Mock result array with 3 elements (3 tokens revoked)
      const mockSqlLayer = createMockSqlClient<any>({
        rows: [{}, {}, {}], // 3 rows affected
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revokeAllForUser('user-123' as UserId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(3)
    })

    it('should return 0 when no tokens exist', async () => {
      const mockSqlLayer = createMockSqlClient<any>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revokeAllForUser('user-no-tokens' as UserId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Bulk revoke failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.revokeAllForUser('user-123' as UserId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('deleteExpired', () => {
    it('should delete expired/revoked tokens and return count', async () => {
      // Mock result with 5 deleted rows
      const mockSqlLayer = createMockSqlClient<any>({
        rows: [{}, {}, {}, {}, {}], // 5 rows deleted
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.deleteExpired()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(5)
    })

    it('should return 0 when no expired tokens exist', async () => {
      const mockSqlLayer = createMockSqlClient<any>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.deleteExpired()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Delete operation failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* RefreshTokenRepository
        return yield* repo.deleteExpired()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(RefreshTokenRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })
})
