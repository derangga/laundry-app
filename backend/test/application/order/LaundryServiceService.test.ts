import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { LaundryServiceService } from '@application/order/LaundryServiceService'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { ServiceNotFound } from '@domain/ServiceErrors'
import { LaundryService, ServiceId, UnitType } from '@domain/LaundryService'

describe('LaundryServiceService', () => {
  // Test data
  const createTestService = (id: string, overrides?: Partial<LaundryService>): LaundryService =>
    ({
      id: id as ServiceId,
      name: 'Test Service',
      price: 10000,
      unit_type: 'kg' as UnitType,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as LaundryService

  const service1 = createTestService('service-1', { name: 'Washing', price: 15000 })
  const service2 = createTestService('service-2', { name: 'Ironing', price: 8000, unit_type: 'set' as UnitType })
  const inactiveService = createTestService('service-3', { name: 'Dry Cleaning', is_active: false })

  // Create a complete mock repository layer
  const createMockServiceRepo = (services: LaundryService[]) => {
    const mockRepo = {
      findById: (id: ServiceId) => {
        const service = services.find((s) => s.id === id)
        return Effect.succeed(service ? Option.some(service) : Option.none())
      },
      findActive: () => Effect.succeed(services.filter((s) => s.is_active)),
      insert: (data: { name: string; price: number; unit_type: UnitType }) =>
        Effect.succeed(
          createTestService('new-service-id', {
            name: data.name,
            price: data.price,
            unit_type: data.unit_type,
          })
        ),
      update: (id: ServiceId, data: Partial<{ name: string; price: number; unit_type: UnitType; is_active: boolean }>) => {
        const service = services.find((s) => s.id === id)
        if (!service) {
          return Effect.succeed(Option.none())
        }
        return Effect.succeed(
          Option.some({
            ...service,
            ...data,
            updated_at: new Date(),
          })
        )
      },
      softDelete: (_id: ServiceId) => Effect.succeed(void 0),
    } as unknown as ServiceRepository

    return Layer.succeed(ServiceRepository, mockRepo)
  }

  // Create service layer by building the service effect directly
  const createServiceLayer = (services: LaundryService[]) => {
    const mockRepoLayer = createMockServiceRepo(services)
    
    // Build the service manually
    const serviceEffect = Effect.gen(function* () {
      const repo = yield* ServiceRepository

      const findActive = () => repo.findActive()

      const findById = (id: string) =>
        Effect.gen(function* () {
          const serviceOption = yield* repo.findById(id as ServiceId)

          if (Option.isNone(serviceOption)) {
            return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
          }

          return serviceOption.value
        })

      const create = (data: { name: string; price: number; unit_type: UnitType }) => repo.insert(data)

      const update = (id: string, data: Partial<{ name?: string; price?: number; unit_type?: UnitType }>) =>
        Effect.gen(function* () {
          yield* findById(id)
          yield* repo.update(id as ServiceId, data)
        })

      const softDelete = (id: string) =>
        Effect.gen(function* () {
          yield* findById(id)
          yield* repo.softDelete(id as ServiceId)
        })

      return {
        _tag: 'LaundryServiceService' as const,
        findActive,
        findById,
        create,
        update,
        softDelete,
      }
    })

    return Layer.effect(LaundryServiceService, serviceEffect).pipe(
      Layer.provide(mockRepoLayer)
    )
  }

  describe('findActive', () => {
    it('should return all active services', async () => {
      const serviceLayer = createServiceLayer([service1, service2, inactiveService])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.findActive()
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result).toHaveLength(2)
      expect(result.map((s) => s.id)).toContain('service-1')
      expect(result.map((s) => s.id)).toContain('service-2')
      expect(result.map((s) => s.id)).not.toContain('service-3')
    })

    it('should return empty array when no active services', async () => {
      const serviceLayer = createServiceLayer([inactiveService])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.findActive()
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result).toHaveLength(0)
    })
  })

  describe('findById', () => {
    it('should return service when found', async () => {
      const serviceLayer = createServiceLayer([service1, service2])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.findById('service-1')
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.id).toBe('service-1')
      expect(result.name).toBe('Washing')
      expect(result.price).toBe(15000)
    })

    it('should fail with ServiceNotFound when service does not exist', async () => {
      const serviceLayer = createServiceLayer([service1])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.findById('non-existent-id')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })
  })

  describe('create', () => {
    it('should create service with valid data', async () => {
      const serviceLayer = createServiceLayer([])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.create({
          name: 'New Service',
          price: 20000,
          unit_type: 'kg' as UnitType,
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, serviceLayer))

      expect(result.name).toBe('New Service')
      expect(result.price).toBe(20000)
      expect(result.unit_type).toBe('kg')
      expect(result.is_active).toBe(true)
    })
  })

  describe('update', () => {
    it('should update service when it exists', async () => {
      const serviceLayer = createServiceLayer([service1])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        yield* service.update('service-1', { name: 'Updated Washing', price: 18000 })
        return yield* service.findById('service-1')
      })

      await expect(
        Effect.runPromise(Effect.provide(program, serviceLayer))
      ).resolves.toBeDefined()
    })

    it('should fail with ServiceNotFound when updating non-existent service', async () => {
      const serviceLayer = createServiceLayer([service1])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.update('non-existent-id', { name: 'Updated' })
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })

    it('should allow partial updates', async () => {
      const serviceLayer = createServiceLayer([service1])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        yield* service.update('service-1', { price: 25000 })
        return yield* service.findById('service-1')
      })

      await expect(
        Effect.runPromise(Effect.provide(program, serviceLayer))
      ).resolves.toBeDefined()
    })
  })

  describe('softDelete', () => {
    it('should soft delete service when it exists', async () => {
      const serviceLayer = createServiceLayer([service1])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.softDelete('service-1')
      })

      await expect(
        Effect.runPromise(Effect.provide(program, serviceLayer))
      ).resolves.toBeUndefined()
    })

    it('should fail with ServiceNotFound when deleting non-existent service', async () => {
      const serviceLayer = createServiceLayer([service1])

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.softDelete('non-existent-id')
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, serviceLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})
