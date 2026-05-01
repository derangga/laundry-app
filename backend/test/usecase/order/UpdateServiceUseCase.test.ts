import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  UpdateServiceUseCase,
  updateServiceUseCaseImpl,
} from 'src/usecase/order/UpdateServiceUseCase'
import {
  FindServiceByIdUseCase,
  findServiceByIdUseCaseImpl,
} from 'src/usecase/order/FindServiceByIdUseCase'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { ServiceNotFound } from '@domain/ServiceErrors'
import {
  LaundryService,
  ServiceId,
  UnitType,
  UpdateLaundryServiceInput,
} from '@domain/LaundryService'

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

const createMockRepo = (services: LaundryService[]) =>
  Layer.succeed(ServiceRepository, {
    findById: (id: ServiceId) => {
      const svc = services.find((s) => s.id === id)
      return Effect.succeed(svc ? Option.some(svc) : Option.none())
    },
    update: (id: ServiceId, data: Partial<LaundryService>) => {
      const svc = services.find((s) => s.id === id)
      if (!svc) return Effect.succeed(Option.none())
      return Effect.succeed(Option.some({ ...svc, ...data, updated_at: new Date() }))
    },
  } as unknown as ServiceRepository)

const createTestLayer = (services: LaundryService[]) => {
  const repoLayer = createMockRepo(services)
  const findByIdLayer = Layer.effect(
    FindServiceByIdUseCase,
    Effect.map(findServiceByIdUseCaseImpl, (i) => new FindServiceByIdUseCase(i))
  ).pipe(Layer.provide(repoLayer))
  const updateLayer = Layer.effect(
    UpdateServiceUseCase,
    Effect.map(updateServiceUseCaseImpl, (i) => new UpdateServiceUseCase(i))
  ).pipe(Layer.provide(Layer.mergeAll(repoLayer, findByIdLayer)))
  return updateLayer
}

describe('UpdateServiceUseCase', () => {
  it('updates an existing service', async () => {
    const svc = createTestService('s-1', { name: 'Wash', price: 15000 })

    const program = Effect.gen(function* () {
      const useCase = yield* UpdateServiceUseCase
      return yield* useCase.execute(ServiceId.make('s-1'), {
        price: 20000,
      } as UpdateLaundryServiceInput)
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([svc])))

    expect(result.price).toBe(20000)
    expect(result.name).toBe('Wash')
  })

  it('fails with ServiceNotFound when service is missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* UpdateServiceUseCase
      return yield* useCase.execute(ServiceId.make('missing'), {
        price: 1,
      } as UpdateLaundryServiceInput)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(ServiceNotFound)
    }
  })
})
