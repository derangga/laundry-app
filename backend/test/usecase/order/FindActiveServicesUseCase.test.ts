import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import {
  FindActiveServicesUseCase,
  findActiveServicesUseCaseImpl,
} from 'src/usecase/order/FindActiveServicesUseCase'
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
    findActive: () => Effect.succeed(services.filter((s) => s.is_active)),
  } as unknown as ServiceRepository)

const createTestLayer = (services: LaundryService[]) =>
  Layer.effect(
    FindActiveServicesUseCase,
    Effect.map(findActiveServicesUseCaseImpl, (i) => new FindActiveServicesUseCase(i))
  ).pipe(Layer.provide(createMockRepo(services)))

describe('FindActiveServicesUseCase', () => {
  it('returns only active services', async () => {
    const active = createTestService('s-1', { name: 'Wash' })
    const inactive = createTestService('s-2', { name: 'Iron', is_active: false })

    const program = Effect.gen(function* () {
      const useCase = yield* FindActiveServicesUseCase
      return yield* useCase.execute()
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer([active, inactive]))
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('s-1')
  })

  it('returns empty array when no active services', async () => {
    const inactive = createTestService('s-1', { is_active: false })

    const program = Effect.gen(function* () {
      const useCase = yield* FindActiveServicesUseCase
      return yield* useCase.execute()
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([inactive])))

    expect(result).toHaveLength(0)
  })
})
