import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import {
  CreateServiceUseCase,
  createServiceUseCaseImpl,
} from 'src/usecase/order/CreateServiceUseCase'
import { ServiceRepository } from '@repositories/ServiceRepository'
import {
  CreateLaundryServiceInput,
  LaundryService,
  ServiceId,
  UnitType,
} from '@domain/LaundryService'

const createMockRepo = () =>
  Layer.succeed(ServiceRepository, {
    insert: (data: { name: string; price: number; unit_type: UnitType }) =>
      Effect.succeed({
        id: 'new-id' as ServiceId,
        name: data.name,
        price: data.price,
        unit_type: data.unit_type,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as LaundryService),
  } as unknown as ServiceRepository)

const testLayer = Layer.effect(
  CreateServiceUseCase,
  Effect.map(createServiceUseCaseImpl, (i) => new CreateServiceUseCase(i))
).pipe(Layer.provide(createMockRepo()))

describe('CreateServiceUseCase', () => {
  it('creates a service with the given data', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateServiceUseCase
      return yield* useCase.execute({
        name: 'Express Wash',
        price: 25000,
        unit_type: 'kg',
      } as CreateLaundryServiceInput)
    })

    const result = await Effect.runPromise(Effect.provide(program, testLayer))

    expect(result.name).toBe('Express Wash')
    expect(result.price).toBe(25000)
    expect(result.unit_type).toBe('kg')
    expect(result.is_active).toBe(true)
  })
})
