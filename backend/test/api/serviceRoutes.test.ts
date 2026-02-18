import { describe, it, expect, beforeEach } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { LaundryServiceService } from 'src/usecase/order/LaundryServiceService'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { LaundryService, ServiceId, CreateLaundryServiceInput, UpdateLaundryServiceInput } from '@domain/LaundryService'
import { ServiceNotFound } from '@domain/ServiceErrors'
import { CurrentUser } from '@domain/CurrentUser'
import { UserId } from '@domain/User'

const createMockServiceRepo = (services: LaundryService[]) => {
  const repo = {
    findById: (id: ServiceId) => {
      const service = services.find((s) => s.id === id)
      return Effect.succeed(service ? Option.some(service) : Option.none())
    },
    findActive: () => {
      const activeServices = services.filter((s) => s.is_active)
      return Effect.succeed(activeServices)
    },
    insert: (data: CreateLaundryServiceInput) => {
      const newService: LaundryService = {
        id: `service-${Date.now()}-${Math.random().toString(36).slice(2)}` as ServiceId,
        name: data.name,
        price: data.price,
        unit_type: data.unit_type,
        is_active: true,
        created_at: new Date() as any,
        updated_at: new Date() as any,
      }
      services.push(newService)
      return Effect.succeed(newService)
    },
    update: (id: ServiceId, data: UpdateLaundryServiceInput) => {
      const index = services.findIndex((s) => s.id === id)
      if (index === -1) {
        return Effect.succeed(Option.none())
      }
      const existing = services[index]!
      const updated: LaundryService = {
        ...existing,
        name: data.name ?? existing.name,
        price: data.price ?? existing.price,
        unit_type: data.unit_type ?? existing.unit_type,
        is_active: data.is_active ?? existing.is_active,
        updated_at: new Date() as any,
      }
      services[index] = updated
      return Effect.succeed(Option.some(updated))
    },
    softDelete: (id: ServiceId) => {
      const index = services.findIndex((s) => s.id === id)
      if (index !== -1) {
        services[index] = { ...services[index]!, is_active: false, updated_at: new Date() as any }
      }
      return Effect.succeed(undefined)
    },
  } as unknown as ServiceRepository
  return Layer.succeed(ServiceRepository, repo)
}

const createMockServiceService = (services: LaundryService[]) => {
  const mockService = {
    findActive: () =>
      Effect.gen(function* () {
        return services.filter((s) => s.is_active)
      }),
    findById: (id: ServiceId) =>
      Effect.gen(function* () {
        const service = services.find((s) => s.id === id)
        if (!service) {
          return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
        }
        return service
      }),
    create: (data: CreateLaundryServiceInput) =>
      Effect.gen(function* () {
        const newService: LaundryService = {
          id: `service-${Date.now()}-${Math.random().toString(36).slice(2)}` as ServiceId,
          name: data.name,
          price: data.price,
          unit_type: data.unit_type,
          is_active: true,
          created_at: new Date() as any,
          updated_at: new Date() as any,
        }
        services.push(newService)
        return newService
      }),
    update: (id: ServiceId, data: UpdateLaundryServiceInput) =>
      Effect.gen(function* () {
        const index = services.findIndex((s) => s.id === id)
        if (index === -1) {
          return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
        }
        const existing = services[index]!
        const updated: LaundryService = {
          ...existing,
          name: data.name ?? existing.name,
          price: data.price ?? existing.price,
          unit_type: data.unit_type ?? existing.unit_type,
          is_active: data.is_active ?? existing.is_active,
          updated_at: new Date() as any,
        }
        services[index] = updated
        return Effect.succeed(Option.some(updated))
      }),
    softDelete: (id: ServiceId) =>
      Effect.gen(function* () {
        const index = services.findIndex((s) => s.id === id)
        if (index === -1) {
          return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
        }
        const updated: LaundryService = { ...services[index]!, is_active: false, updated_at: new Date() as any }
        services[index] = updated
        return Effect.succeed(undefined)
      }),
  } as unknown as LaundryServiceService

  return Layer.succeed(LaundryServiceService, mockService)
}

const createTestLayer = (services: LaundryService[]) =>
  Layer.mergeAll(createMockServiceRepo(services), createMockServiceService(services))

const provideCurrentUser = (role: 'admin' | 'staff') =>
  Layer.succeed(CurrentUser, {
    id: UserId.make('user-1'),
    email: 'test@example.com',
    role,
  })

describe('GET /api/services', () => {
  let services: LaundryService[]

  beforeEach(() => {
    services = []
  })

  describe('Success Cases', () => {
    it('should return active services', async () => {
      const activeService: LaundryService = {
        id: 'service-1' as ServiceId,
        name: 'Regular Laundry',
        price: 10000,
        unit_type: 'kg' as const,
        is_active: true,
        created_at: new Date() as any,
        updated_at: new Date() as any,
      }
      const inactiveService: LaundryService = {
        id: 'service-2' as ServiceId,
        name: 'Express Laundry',
        price: 15000,
        unit_type: 'kg' as const,
        is_active: false,
        created_at: new Date() as any,
        updated_at: new Date() as any,
      }
      services.push(activeService, inactiveService)

      const testLayer = createTestLayer(services)

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.findActive()
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('Regular Laundry')
      expect(result[0]!.is_active).toBe(true)
    })

    it('should return empty array when no services', async () => {
      const testLayer = createTestLayer(services)

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.findActive()
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result).toHaveLength(0)
    })
  })
})

describe('POST /api/services', () => {
  let services: LaundryService[]

  beforeEach(() => {
    services = []
  })

  describe('Success Cases', () => {
    it('should create service as admin', async () => {
      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.create({
          name: 'Regular Laundry',
          price: 10000,
          unit_type: 'kg',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result.name).toBe('Regular Laundry')
      expect(result.price).toBe(10000)
      expect(result.unit_type).toBe('kg')
      expect(result.is_active).toBe(true)
    })
  })

  describe('Authorization Cases', () => {
    it('should allow admin to create service', async () => {
      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.create({
          name: 'New Service',
          price: 20000,
          unit_type: 'set',
        })
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result.name).toBe('New Service')
    })
  })
})

describe('PUT /api/services/:id', () => {
  let services: LaundryService[]

  beforeEach(() => {
    services = []
  })

  describe('Success Cases', () => {
    it('should update service as admin', async () => {
      const existingService: LaundryService = {
        id: 'service-1' as ServiceId,
        name: 'Regular Laundry',
        price: 10000,
        unit_type: 'kg' as const,
        is_active: true,
        created_at: new Date() as any,
        updated_at: new Date() as any,
      }
      services.push(existingService)

      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        yield* service.update(ServiceId.make('service-1'), { price: 15000 })
        return yield* service.findById(ServiceId.make('service-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result.price).toBe(15000)
    })
  })

  describe('Not Found Cases', () => {
    it('should fail when service not found', async () => {
      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.update(ServiceId.make('non-existent'), { price: 15000 })
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})

describe('DELETE /api/services/:id', () => {
  let services: LaundryService[]

  beforeEach(() => {
    services = []
  })

  describe('Success Cases', () => {
    it('should soft delete service as admin', async () => {
      const existingService: LaundryService = {
        id: 'service-1' as ServiceId,
        name: 'Regular Laundry',
        price: 10000,
        unit_type: 'kg' as const,
        is_active: true,
        created_at: new Date() as any,
        updated_at: new Date() as any,
      }
      services.push(existingService)

      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        yield* service.softDelete(ServiceId.make('service-1'))
        return yield* service.findById(ServiceId.make('service-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result.is_active).toBe(false)
    })
  })

  describe('Not Found Cases', () => {
    it('should fail when service not found', async () => {
      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const service = yield* LaundryServiceService
        return yield* service.softDelete(ServiceId.make('non-existent'))
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})
