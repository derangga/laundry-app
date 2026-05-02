import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  CheckCustomerExistsUseCase,
  checkCustomerExistsUseCaseImpl,
} from 'src/usecase/customer/CheckCustomerExistsUseCase'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { Customer, CustomerId } from '@domain/Customer'

const existingCustomer = {
  id: 'customer-1' as CustomerId,
  name: 'John Doe',
  phone: '+6281234567890',
  address: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
} as unknown as Customer

const createMockCustomerRepo = (findByPhoneResult: Option.Option<Customer>) =>
  Layer.succeed(CustomerRepository, {
    findByPhone: (_phone: string) => Effect.succeed(findByPhoneResult),
  } as unknown as CustomerRepository)

const createTestLayer = (findByPhoneResult: Option.Option<Customer>) =>
  Layer.effect(
    CheckCustomerExistsUseCase,
    Effect.map(checkCustomerExistsUseCaseImpl, (impl) => new CheckCustomerExistsUseCase(impl))
  ).pipe(Layer.provide(createMockCustomerRepo(findByPhoneResult)))

describe('CheckCustomerExistsUseCase', () => {
  it('should return true when customer exists', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CheckCustomerExistsUseCase
      return yield* useCase.execute('+6281234567890')
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer(Option.some(existingCustomer)))
    )

    expect(result).toBe(true)
  })

  it('should return false when customer does not exist', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CheckCustomerExistsUseCase
      return yield* useCase.execute('+6289876543210')
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer(Option.none()))
    )

    expect(result).toBe(false)
  })
})
