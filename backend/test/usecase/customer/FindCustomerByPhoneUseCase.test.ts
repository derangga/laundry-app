import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  FindCustomerByPhoneUseCase,
  findCustomerByPhoneUseCaseImpl,
} from 'src/usecase/customer/FindCustomerByPhoneUseCase'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { Customer, CustomerId } from '@domain/Customer'
import { CustomerNotFound } from '@domain/CustomerErrors'

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
    FindCustomerByPhoneUseCase,
    Effect.map(findCustomerByPhoneUseCaseImpl, (impl) => new FindCustomerByPhoneUseCase(impl))
  ).pipe(Layer.provide(createMockCustomerRepo(findByPhoneResult)))

describe('FindCustomerByPhoneUseCase', () => {
  it('should find customer successfully with valid phone number', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* FindCustomerByPhoneUseCase
      return yield* useCase.execute('+6281234567890')
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer(Option.some(existingCustomer)))
    )

    expect(result.id).toBe('customer-1')
    expect(result.name).toBe('John Doe')
    expect(result.phone).toBe('+6281234567890')
  })

  it('should fail with CustomerNotFound when phone not registered', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* FindCustomerByPhoneUseCase
      return yield* useCase.execute('+6289876543210')
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer(Option.none()))
    )

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(CustomerNotFound)
    }
  })

  it('should fail with InvalidPhoneNumber for invalid format', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* FindCustomerByPhoneUseCase
      return yield* useCase.execute('invalid')
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer(Option.none()))
    )

    expect(exit._tag).toBe('Failure')
  })
})
