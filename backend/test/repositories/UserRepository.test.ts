import { describe, it, expect } from 'vitest'
import { Effect, Option } from 'effect'
import { UserRepository } from '@repositories/UserRepository'
import { User, UserId, UserRole } from '@domain/User'
import { createMockSqlClient, createSqlError } from '../testUtils'

const createMockUser = (overrides?: Partial<User>): User =>
  ({
    id: 'user-123' as UserId,
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    role: 'staff' as UserRole,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }) as unknown as User

describe('UserRepository', () => {
  describe('findByEmail', () => {
    it('should return Option.some when user exists', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' })
      const mockSqlLayer = createMockSqlClient<User>({ rows: [mockUser] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findByEmail('test@example.com')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const user = Option.getOrThrow(result)
      expect(user.email).toBe('test@example.com')
      expect(user.id).toBe('user-123')
    })

    it('should return Option.none when user not found', async () => {
      const mockSqlLayer = createMockSqlClient<User>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findByEmail('nonexistent@example.com')
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Database connection failed')
      const mockSqlLayer = createMockSqlClient<User>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findByEmail('test@example.com')
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findById', () => {
    it('should return Option.some when user exists', async () => {
      const mockUser = createMockUser({ id: 'user-456' as UserId })
      const mockSqlLayer = createMockSqlClient<User>({ rows: [mockUser] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findById('user-456' as UserId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const user = Option.getOrThrow(result)
      expect(user.id).toBe('user-456')
    })

    it('should return Option.none when user not found', async () => {
      const mockSqlLayer = createMockSqlClient<User>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findById('nonexistent-id' as UserId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query timeout')
      const mockSqlLayer = createMockSqlClient<User>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findById('user-123' as UserId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('insert', () => {
    it('should create new user successfully', async () => {
      const newUser = createMockUser({
        email: 'new@example.com',
        name: 'New User',
      })
      const mockSqlLayer = createMockSqlClient<User>({ rows: [newUser] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.insert(
          User.insert.make({
            email: 'new@example.com',
            password_hash: 'hashed',
            name: 'New User',
            role: 'staff',
          })
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.email).toBe('new@example.com')
      expect(result.name).toBe('New User')
    })

    it('should handle SQL errors on insert', async () => {
      const sqlError = createSqlError('Duplicate email violation')
      const mockSqlLayer = createMockSqlClient<User>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.insert(
          User.insert.make({
            email: 'duplicate@example.com',
            password_hash: 'hashed',
            name: 'Duplicate User',
            role: 'staff',
          })
        )
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })

    it('should fail when no row returned from insert', async () => {
      // Empty rows array simulates INSERT that doesn't return data
      const mockSqlLayer = createMockSqlClient<User>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.insert(
          User.insert.make({
            email: 'test@example.com',
            password_hash: 'hashed',
            name: 'Test',
            role: 'staff',
          })
        )
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedUser = createMockUser({
        id: 'user-123' as UserId,
        name: 'Updated Name',
        email: 'updated@example.com',
      })
      const mockSqlLayer = createMockSqlClient<User>({ rows: [updatedUser] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.update('user-123' as UserId, {
          name: 'Updated Name',
          email: 'updated@example.com',
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const user = Option.getOrThrow(result)
      expect(user.name).toBe('Updated Name')
      expect(user.email).toBe('updated@example.com')
    })

    it('should return Option.none when user not found', async () => {
      const mockSqlLayer = createMockSqlClient<User>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.update('nonexistent-id' as UserId, {
          name: 'New Name',
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle empty update (no fields to update)', async () => {
      const mockUser = createMockUser({ id: 'user-123' as UserId })
      const mockSqlLayer = createMockSqlClient<User>({ rows: [mockUser] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        // Empty update should call findById instead
        return yield* repo.update('user-123' as UserId, {})
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
    })

    it('should update only specified fields', async () => {
      const updatedUser = createMockUser({
        name: 'Only Name Changed',
      })
      const mockSqlLayer = createMockSqlClient<User>({ rows: [updatedUser] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.update('user-123' as UserId, {
          name: 'Only Name Changed',
        })
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const user = Option.getOrThrow(result)
      expect(user.name).toBe('Only Name Changed')
    })

    it('should handle SQL errors on update', async () => {
      const sqlError = createSqlError('Update failed')
      const mockSqlLayer = createMockSqlClient<User>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.update('user-123' as UserId, {
          name: 'New Name',
        })
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('delete', () => {
    it('should delete user successfully', async () => {
      // Model.makeRepository.delete returns void/undefined on success
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.delete('user-123' as UserId)
      })

      // Should complete without throwing
      await Effect.runPromise(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )
    })

    it('should handle SQL errors on delete', async () => {
      const sqlError = createSqlError('Foreign key constraint violation')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.delete('user-123' as UserId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(UserRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })
})
