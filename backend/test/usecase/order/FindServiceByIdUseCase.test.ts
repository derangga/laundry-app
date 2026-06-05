import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
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

const createMockRepo = (services: LaundryService[]) =>
  Layer.succeed(ServiceRepository, {
    findById: (id: ServiceId) => {
      const svc = services.find((s) => s.id === id)
      return Effect.succeed(svc ? Option.some(svc) : Option.none())
    },
  } as unknown as ServiceRepository)

const createTestLayer = (services: LaundryService[]) =>
  Layer.effect(
    FindServiceByIdUseCase,
    Effect.map(findServiceByIdUseCaseImpl, (i) => new FindServiceByIdUseCase(i))
  ).pipe(Layer.provide(createMockRepo(services)))

describe('FindServiceByIdUseCase', () => {
  it('returns service when found', async () => {
    const svc = createTestService('s-1', { name: 'Wash', price: 15000 })

    const program = Effect.gen(function* () {
      const useCase = yield* FindServiceByIdUseCase
      return yield* useCase.execute(ServiceId.make('s-1'))
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([svc])))

    expect(result.id).toBe('s-1')
    expect(result.name).toBe('Wash')
  })

  it('fails with ServiceNotFound when missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* FindServiceByIdUseCase
      return yield* useCase.execute(ServiceId.make('missing'))
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(ServiceNotFound)
    }
  })
})
