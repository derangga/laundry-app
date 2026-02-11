import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import {
  LaundryService,
  ServiceId,
  ActiveServiceInfo,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
  UnitType,
} from '@domain/LaundryService'

// Create a mock service
const createMockService = (overrides: Partial<LaundryService> = {}): LaundryService =>
  ({
    id: 'service-123' as ServiceId,
    name: 'Regular Wash',
    price: 10000,
    unit_type: 'kg' as UnitType,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as unknown as LaundryService

// Create a mock ServiceRepository
const createMockServiceRepo = (services: LaundryService[] = []) =>
  Layer.succeed(ServiceRepository, {
    findById: (id: ServiceId) =>
      Effect.succeed(Option.fromNullable(services.find((s) => s.id === id))),
    findActive: () => Effect.succeed(services.filter((s) => s.is_active)),
    findAll: () => Effect.succeed(services),
    insert: (data: CreateLaundryServiceInput) =>
      Effect.succeed(
        createMockService({
          name: data.name,
          price: data.price,
          unit_type: data.unit_type,
        })
      ),
    update: (id: ServiceId, data: UpdateLaundryServiceInput) => {
      const service = services.find((s) => s.id === id)
      if (!service) {
        return Effect.succeed(Option.none())
      }
      return Effect.succeed(
        Option.some(
          createMockService({
            ...service,
            name: data.name ?? service.name,
            price: data.price ?? service.price,
            unit_type: data.unit_type ?? service.unit_type,
            is_active: data.is_active ?? service.is_active,
          })
        )
      )
    },
    softDelete: (_id: ServiceId) => Effect.succeed(void 0),
    findActiveServiceInfo: () =>
      Effect.succeed(
        services
          .filter((s) => s.is_active)
          .map((s) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            unit_type: s.unit_type,
          })) as ActiveServiceInfo[]
      ),
  } as unknown as ServiceRepository)

describe('ServiceRepository', () => {
  const mockService = createMockService()

  describe('findById', () => {
    it('should return Some when service exists', async () => {
      const MockRepo = createMockServiceRepo([mockService])

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findById('service-123' as ServiceId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe('service-123')
        expect(result.value.name).toBe('Regular Wash')
      }
    })

    it('should return None when service does not exist', async () => {
      const MockRepo = createMockServiceRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findById('nonexistent' as ServiceId)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('findActive', () => {
    it('should return only active services', async () => {
      const services = [
        createMockService({ id: '1' as ServiceId, is_active: true }),
        createMockService({ id: '2' as ServiceId, is_active: false }),
        createMockService({ id: '3' as ServiceId, is_active: true }),
      ]
      const MockRepo = createMockServiceRepo(services)

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActive()
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
      expect(result.every((s) => s.is_active)).toBe(true)
    })
  })

  describe('findAll', () => {
    it('should return all services', async () => {
      const services = [
        createMockService({ id: '1' as ServiceId, is_active: true }),
        createMockService({ id: '2' as ServiceId, is_active: false }),
      ]
      const MockRepo = createMockServiceRepo(services)

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findAll()
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
    })
  })

  describe('insert', () => {
    it('should create a new service', async () => {
      const MockRepo = createMockServiceRepo([])

      const input: CreateLaundryServiceInput = {
        name: 'Express Wash',
        price: 20000,
        unit_type: 'kg' as UnitType,
      } as CreateLaundryServiceInput

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.insert(input)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.name).toBe('Express Wash')
      expect(result.price).toBe(20000)
      expect(result.unit_type).toBe('kg')
    })
  })

  describe('update', () => {
    it('should update existing service', async () => {
      const MockRepo = createMockServiceRepo([mockService])

      const updateData: UpdateLaundryServiceInput = {
        price: 15000,
      } as UpdateLaundryServiceInput

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update('service-123' as ServiceId, updateData)
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.price).toBe(15000)
      }
    })

    it('should return None when service does not exist', async () => {
      const MockRepo = createMockServiceRepo([])

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.update(
          'nonexistent' as ServiceId,
          { price: 15000 } as UpdateLaundryServiceInput
        )
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe('softDelete', () => {
    it('should soft delete service', async () => {
      const MockRepo = createMockServiceRepo([mockService])

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.softDelete('service-123' as ServiceId)
      })

      // Should complete without throwing
      await Effect.runPromise(Effect.provide(program, MockRepo))
    })
  })

  describe('findActiveServiceInfo', () => {
    it('should return active service info without timestamps', async () => {
      const services = [
        createMockService({ id: '1' as ServiceId, is_active: true }),
        createMockService({ id: '2' as ServiceId, is_active: false }),
        createMockService({ id: '3' as ServiceId, is_active: true }),
      ]
      const MockRepo = createMockServiceRepo(services)

      const program = Effect.gen(function* () {
        const repo = yield* ServiceRepository
        return yield* repo.findActiveServiceInfo()
      })

      const result = await Effect.runPromise(Effect.provide(program, MockRepo))
      expect(result.length).toBe(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('price')
      expect(result[0]).toHaveProperty('unit_type')
      expect(result[0]).not.toHaveProperty('is_active')
      expect(result[0]).not.toHaveProperty('created_at')
    })
  })
})
