import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import {
  FindAllServicesUseCase,
  findAllServicesUseCaseImpl,
} from 'src/usecase/order/FindAllServicesUseCase'
import { ServiceRepository } from '@repositories/ServiceRepository'
import type { LaundryService, ServiceId, UnitType } from '@domain/LaundryService'

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
    findAll: () => Effect.succeed(services),
  } as unknown as ServiceRepository)

const createTestLayer = (services: LaundryService[]) =>
  Layer.effect(
    FindAllServicesUseCase,
    Effect.map(findAllServicesUseCaseImpl, (i) => new FindAllServicesUseCase(i))
  ).pipe(Layer.provide(createMockRepo(services)))

describe('FindAllServicesUseCase', () => {
  it('returns every service regardless of is_active', async () => {
    const active = createTestService('s-1')
    const inactive = createTestService('s-2', { is_active: false })

    const program = Effect.gen(function* () {
      const useCase = yield* FindAllServicesUseCase
      return yield* useCase.execute()
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer([active, inactive]))
    )

    expect(result).toHaveLength(2)
  })
})
