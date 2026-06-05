import { describe, it, expect, beforeEach } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  FindActiveServicesUseCase,
  findActiveServicesUseCaseImpl,
} from 'src/usecase/order/FindActiveServicesUseCase'
import {
  FindAllServicesUseCase,
  findAllServicesUseCaseImpl,
} from 'src/usecase/order/FindAllServicesUseCase'
import {
  FindServiceByIdUseCase,
  findServiceByIdUseCaseImpl,
} from 'src/usecase/order/FindServiceByIdUseCase'
import {
  CreateServiceUseCase,
  createServiceUseCaseImpl,
} from 'src/usecase/order/CreateServiceUseCase'
import {
  UpdateServiceUseCase,
  updateServiceUseCaseImpl,
} from 'src/usecase/order/UpdateServiceUseCase'
import {
  SoftDeleteServiceUseCase,
  softDeleteServiceUseCaseImpl,
} from 'src/usecase/order/SoftDeleteServiceUseCase'
import { ServiceRepository } from '@repositories/ServiceRepository'
import type {
  LaundryService,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
} from '@domain/LaundryService'
import { ServiceId } from '@domain/LaundryService'
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
        services[index] = {
          ...services[index]!,
          deleted_at: new Date() as any,
          updated_at: new Date() as any,
        }
      }
      return Effect.succeed(undefined)
    },
  } as unknown as ServiceRepository
  return Layer.succeed(ServiceRepository, repo)
}

const FindServiceByIdLayer = Layer.effect(
  FindServiceByIdUseCase,
  Effect.map(findServiceByIdUseCaseImpl, (i) => new FindServiceByIdUseCase(i))
)

const buildUseCasesLayer = () =>
  Layer.mergeAll(
    Layer.effect(
      FindActiveServicesUseCase,
      Effect.map(findActiveServicesUseCaseImpl, (i) => new FindActiveServicesUseCase(i))
    ),
    Layer.effect(
      FindAllServicesUseCase,
      Effect.map(findAllServicesUseCaseImpl, (i) => new FindAllServicesUseCase(i))
    ),
    FindServiceByIdLayer,
    Layer.effect(
      CreateServiceUseCase,
      Effect.map(createServiceUseCaseImpl, (i) => new CreateServiceUseCase(i))
    ),
    Layer.effect(
      UpdateServiceUseCase,
      Effect.map(updateServiceUseCaseImpl, (i) => new UpdateServiceUseCase(i))
    ).pipe(Layer.provide(FindServiceByIdLayer)),
    Layer.effect(
      SoftDeleteServiceUseCase,
      Effect.map(softDeleteServiceUseCaseImpl, (i) => new SoftDeleteServiceUseCase(i))
    ).pipe(Layer.provide(FindServiceByIdLayer))
  )

const createTestLayer = (services: LaundryService[]) =>
  buildUseCasesLayer().pipe(Layer.provide(createMockServiceRepo(services)))

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
        const findActive = yield* FindActiveServicesUseCase
        return yield* findActive.execute()
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('Regular Laundry')
      expect(result[0]!.is_active).toBe(true)
    })

    it('should return empty array when no services', async () => {
      const testLayer = createTestLayer(services)

      const program = Effect.gen(function* () {
        const findActive = yield* FindActiveServicesUseCase
        return yield* findActive.execute()
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
        const createService = yield* CreateServiceUseCase
        return yield* createService.execute({
          name: 'Regular Laundry',
          price: 10000,
          unit_type: 'kg',
        } as CreateLaundryServiceInput)
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
        const createService = yield* CreateServiceUseCase
        return yield* createService.execute({
          name: 'New Service',
          price: 20000,
          unit_type: 'set',
        } as CreateLaundryServiceInput)
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
        const updateService = yield* UpdateServiceUseCase
        const findById = yield* FindServiceByIdUseCase
        yield* updateService.execute(ServiceId.make('service-1'), {
          price: 15000,
        } as UpdateLaundryServiceInput)
        return yield* findById.execute(ServiceId.make('service-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result.price).toBe(15000)
    })
  })

  describe('Not Found Cases', () => {
    it('should fail when service not found', async () => {
      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const updateService = yield* UpdateServiceUseCase
        return yield* updateService.execute(ServiceId.make('non-existent'), {
          price: 15000,
        } as UpdateLaundryServiceInput)
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
        const softDelete = yield* SoftDeleteServiceUseCase
        const findById = yield* FindServiceByIdUseCase
        yield* softDelete.execute(ServiceId.make('service-1'))
        return yield* findById.execute(ServiceId.make('service-1'))
      })

      const result = await Effect.runPromise(Effect.provide(program, testLayer))

      expect(result.deleted_at).not.toBeNull()
      expect(result.deleted_at).not.toBeUndefined()
    })
  })

  describe('Not Found Cases', () => {
    it('should fail when service not found', async () => {
      const testLayer = Layer.mergeAll(createTestLayer(services), provideCurrentUser('admin'))

      const program = Effect.gen(function* () {
        const softDelete = yield* SoftDeleteServiceUseCase
        return yield* softDelete.execute(ServiceId.make('non-existent'))
      })

      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer))

      expect(result._tag).toBe('Failure')
    })
  })
})
