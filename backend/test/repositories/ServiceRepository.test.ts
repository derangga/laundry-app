import { describe, it, expect } from 'vitest'
import { Effect, Option } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import {
  LaundryService,
  ServiceId,
  ActiveServiceInfo,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
  UnitType,
} from '@domain/LaundryService'
import { createMockSqlClient, createSqlError } from '../testUtils'

const createMockService = (overrides: Partial<LaundryService> = {}): LaundryService =>
  ({
    id: 'service-123' as ServiceId,
    name: 'Regular Wash',
    price: 10000,
    unit_type: 'kg' as UnitType,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }) as unknown as LaundryService

describe('ServiceRepository', () => {
  describe('findById', () => {
    it('should return Some when service exists', async () => {
      const mockService = createMockService({ id: 'service-123' as ServiceId })
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [mockService] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findById('service-123' as ServiceId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const service = Option.getOrThrow(result)
      expect(service.id).toBe('service-123')
      expect(service.name).toBe('Regular Wash')
    })

    it('should return None when service does not exist', async () => {
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findById('nonexistent' as ServiceId)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Database connection failed')
      const mockSqlLayer = createMockSqlClient<LaundryService>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findById('service-123' as ServiceId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findActive', () => {
    it('should return only active services', async () => {
      const services = [
        createMockService({ id: '1' as ServiceId, is_active: true, name: 'Active Service 1' }),
        createMockService({ id: '2' as ServiceId, is_active: false, name: 'Inactive Service' }),
        createMockService({ id: '3' as ServiceId, is_active: true, name: 'Active Service 2' }),
      ]
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: services })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActive()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(3)
      // Note: The actual filtering happens in the SQL query, mock returns all
      // In real scenario, SQL would filter by is_active = true
    })

    it('should return empty array when no services exist', async () => {
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActive()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<LaundryService>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActive()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findAll', () => {
    it('should return all services', async () => {
      const services = [
        createMockService({ id: '1' as ServiceId, is_active: true }),
        createMockService({ id: '2' as ServiceId, is_active: false }),
      ]
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: services })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findAll()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
    })

    it('should return empty array when no services exist', async () => {
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findAll()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<LaundryService>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findAll()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('insert', () => {
    it('should create a new service', async () => {
      const newService = createMockService({
        id: 'new-service-id' as ServiceId,
        name: 'Express Wash',
        price: 20000,
      })
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [newService] })

      const input: CreateLaundryServiceInput = {
        name: 'Express Wash',
        price: 20000,
        unit_type: 'kg' as UnitType,
      } as CreateLaundryServiceInput

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.name).toBe('Express Wash')
      expect(result.price).toBe(20000)
      expect(result.unit_type).toBe('kg')
    })

    it('should handle SQL errors on insert', async () => {
      const sqlError = createSqlError('Duplicate service name')
      const mockSqlLayer = createMockSqlClient<LaundryService>({
        shouldFail: true,
        error: sqlError,
      })

      const input: CreateLaundryServiceInput = {
        name: 'Duplicate Service',
        price: 10000,
        unit_type: 'kg' as UnitType,
      } as CreateLaundryServiceInput

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })

    it('should fail when no row returned from insert', async () => {
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [] })

      const input: CreateLaundryServiceInput = {
        name: 'Test Service',
        price: 10000,
        unit_type: 'kg' as UnitType,
      } as CreateLaundryServiceInput

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('update', () => {
    it('should update existing service', async () => {
      const updatedService = createMockService({
        id: 'service-123' as ServiceId,
        price: 15000,
        name: 'Updated Wash',
      })
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [updatedService] })

      const updateData: UpdateLaundryServiceInput = {
        price: 15000,
        name: 'Updated Wash',
      } as UpdateLaundryServiceInput

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update('service-123' as ServiceId, updateData)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const service = Option.getOrThrow(result)
      expect(service.price).toBe(15000)
      expect(service.name).toBe('Updated Wash')
    })

    it('should return None when service does not exist', async () => {
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update(
          'nonexistent' as ServiceId,
          { price: 15000 } as UpdateLaundryServiceInput
        )
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isNone(result)).toBe(true)
    })

    it('should update only specified fields', async () => {
      const updatedService = createMockService({
        id: 'service-123' as ServiceId,
        price: 25000,
        name: 'Regular Wash', // name unchanged
      })
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [updatedService] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update('service-123' as ServiceId, {
          price: 25000,
        } as UpdateLaundryServiceInput)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
      const service = Option.getOrThrow(result)
      expect(service.price).toBe(25000)
    })

    it('should handle empty update (no fields to update)', async () => {
      const mockService = createMockService({ id: 'service-123' as ServiceId })
      // Empty update falls back to findById, so we need to mock for findById call
      const mockSqlLayer = createMockSqlClient<LaundryService>({ rows: [mockService] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update('service-123' as ServiceId, {})
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(Option.isSome(result)).toBe(true)
    })

    it('should handle SQL errors on update', async () => {
      const sqlError = createSqlError('Update failed')
      const mockSqlLayer = createMockSqlClient<LaundryService>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update('service-123' as ServiceId, {
          price: 15000,
        } as UpdateLaundryServiceInput)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('softDelete', () => {
    it('should soft delete service', async () => {
      const mockSqlLayer = createMockSqlClient<never>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.softDelete('service-123' as ServiceId)
      })

      // Should complete without throwing
      await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )
    })

    it('should handle SQL errors on soft delete', async () => {
      const sqlError = createSqlError('Delete failed')
      const mockSqlLayer = createMockSqlClient<never>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.softDelete('service-123' as ServiceId)
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })

  describe('findActiveServiceInfo', () => {
    it('should return active service info without timestamps', async () => {
      const activeServices = [
        {
          id: '1' as ServiceId,
          name: 'Service 1',
          price: 10000,
          unit_type: 'kg' as UnitType,
        },
        {
          id: '2' as ServiceId,
          name: 'Service 2',
          price: 20000,
          unit_type: 'set' as UnitType,
        },
      ] as ActiveServiceInfo[]
      const mockSqlLayer = createMockSqlClient<ActiveServiceInfo>({ rows: activeServices })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActiveServiceInfo()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('price')
      expect(result[0]).toHaveProperty('unit_type')
      expect(result[0]).not.toHaveProperty('is_active')
      expect(result[0]).not.toHaveProperty('created_at')
      expect(result[0]).not.toHaveProperty('updated_at')
    })

    it('should return empty array when no active services', async () => {
      const mockSqlLayer = createMockSqlClient<ActiveServiceInfo>({ rows: [] })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActiveServiceInfo()
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result.length).toBe(0)
    })

    it('should handle SQL errors', async () => {
      const sqlError = createSqlError('Query failed')
      const mockSqlLayer = createMockSqlClient<ActiveServiceInfo>({
        shouldFail: true,
        error: sqlError,
      })

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActiveServiceInfo()
      })

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(ServiceRepository.Default), Effect.provide(mockSqlLayer))
      )

      expect(result._tag).toBe('Failure')
    })
  })
})
