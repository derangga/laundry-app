import { describe, it, expect, vi } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  SoftDeleteServiceUseCase,
  softDeleteServiceUseCaseImpl,
} from 'src/usecase/order/SoftDeleteServiceUseCase'
import {
  FindServiceByIdUseCase,
  findServiceByIdUseCaseImpl,
} from 'src/usecase/order/FindServiceByIdUseCase'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { ServiceNotFound } from '@domain/ServiceErrors'
import type { LaundryService, UnitType } from '@domain/LaundryService'
import { ServiceId } from '@domain/LaundryService'

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

const createMockRepo = (services: LaundryService[], softDeleteSpy?: (id: ServiceId) => void) =>
  Layer.succeed(ServiceRepository, {
    findById: (id: ServiceId) => {
      const svc = services.find((s) => s.id === id)
      return Effect.succeed(svc ? Option.some(svc) : Option.none())
    },
    softDelete: (id: ServiceId) => {
      softDeleteSpy?.(id)
      return Effect.succeed(undefined)
    },
  } as unknown as ServiceRepository)

const createTestLayer = (services: LaundryService[], softDeleteSpy?: (id: ServiceId) => void) => {
  const repoLayer = createMockRepo(services, softDeleteSpy)
  const findByIdLayer = Layer.effect(
    FindServiceByIdUseCase,
    Effect.map(findServiceByIdUseCaseImpl, (i) => new FindServiceByIdUseCase(i))
  ).pipe(Layer.provide(repoLayer))
  return Layer.effect(
    SoftDeleteServiceUseCase,
    Effect.map(softDeleteServiceUseCaseImpl, (i) => new SoftDeleteServiceUseCase(i))
  ).pipe(Layer.provide(Layer.mergeAll(repoLayer, findByIdLayer)))
}

describe('SoftDeleteServiceUseCase', () => {
  it('soft deletes an existing service', async () => {
    const spy = vi.fn()
    const svc = createTestService('s-1')

    const program = Effect.gen(function* () {
      const useCase = yield* SoftDeleteServiceUseCase
      return yield* useCase.execute(ServiceId.make('s-1'))
    })

    await Effect.runPromise(Effect.provide(program, createTestLayer([svc], spy)))

    expect(spy).toHaveBeenCalledWith('s-1')
  })

  it('fails with ServiceNotFound when service is missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* SoftDeleteServiceUseCase
      return yield* useCase.execute(ServiceId.make('missing'))
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(ServiceNotFound)
    }
  })
})
