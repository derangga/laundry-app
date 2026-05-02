import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  CreateCustomerUseCase,
  createCustomerUseCaseImpl,
} from 'src/usecase/customer/CreateCustomerUseCase'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CreateCustomerInput, Customer, CustomerId } from '@domain/Customer'
import { CustomerAlreadyExists } from '@domain/CustomerErrors'

const existingCustomer = {
  id: 'customer-1' as CustomerId,
  name: 'John Doe',
  phone: '+6281234567890',
  address: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
} as unknown as Customer

const createMockCustomerRepo = (opts: {
  findByPhoneResult?: Option.Option<Customer>
  insertSpy?: (data: { name: string; phone: string; address: string | null }) => void
}) =>
  Layer.succeed(CustomerRepository, {
    findByPhone: (_phone: string) => Effect.succeed(opts.findByPhoneResult ?? Option.none()),
    insert: (data: { name: string; phone: string; address: string | null }) => {
      opts.insertSpy?.(data)
      return Effect.succeed({
        id: 'customer-new' as CustomerId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      } as unknown as Customer)
    },
  } as unknown as CustomerRepository)

const createTestLayer = (opts: {
  findByPhoneResult?: Option.Option<Customer>
  insertSpy?: (data: { name: string; phone: string; address: string | null }) => void
}) =>
  Layer.effect(
    CreateCustomerUseCase,
    Effect.map(createCustomerUseCaseImpl, (impl) => new CreateCustomerUseCase(impl))
  ).pipe(Layer.provide(createMockCustomerRepo(opts)))

describe('CreateCustomerUseCase', () => {
  it('should create customer successfully without address', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateCustomerUseCase
      return yield* useCase.execute(
        CreateCustomerInput.make({
          name: 'Jane Doe',
          phone: '+6285555666777',
        })
      )
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer({})))

    expect(result.name).toBe('Jane Doe')
    expect(result.phone).toBe('+6285555666777')
    expect(result.address).toBeNull()
  })

  it('should create customer with address', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateCustomerUseCase
      return yield* useCase.execute(
        new CreateCustomerInput({
          name: 'Bob Smith',
          phone: '+6285555666888',
          address: '123 Main Street, Jakarta',
        })
      )
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer({})))

    expect(result.name).toBe('Bob Smith')
    expect(result.phone).toBe('+6285555666888')
    expect(result.address).toBe('123 Main Street, Jakarta')
  })

  it('should fail with CustomerAlreadyExists when phone already registered', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateCustomerUseCase
      return yield* useCase.execute(
        CreateCustomerInput.make({
          name: 'Another User',
          phone: '+6281234567890',
        })
      )
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ findByPhoneResult: Option.some(existingCustomer) }))
    )

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(CustomerAlreadyExists)
    }
  })

  it('should normalize phone number from 08xx to +628xx format', async () => {
    let captured: { name: string; phone: string; address: string | null } | undefined

    const program = Effect.gen(function* () {
      const useCase = yield* CreateCustomerUseCase
      return yield* useCase.execute(
        CreateCustomerInput.make({
          name: 'Phone Normalized User',
          phone: '085551234567',
        })
      )
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer({
          insertSpy: (data) => {
            captured = data
          },
        })
      )
    )

    expect(captured?.phone).toBe('+6285551234567')
    expect(result.phone).toBe('+6285551234567')
  })

  it('should normalize phone number with dashes and spaces', async () => {
    let captured: { name: string; phone: string; address: string | null } | undefined

    const program = Effect.gen(function* () {
      const useCase = yield* CreateCustomerUseCase
      return yield* useCase.execute(
        CreateCustomerInput.make({
          name: 'Formatted Phone User',
          phone: '+628-5512-3456-7890',
        })
      )
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer({
          insertSpy: (data) => {
            captured = data
          },
        })
      )
    )

    expect(captured?.phone).toBe('+628551234567890')
    expect(result.phone).toBe('+628551234567890')
  })

  it('should fail with InvalidPhoneNumber for invalid format', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateCustomerUseCase
      return yield* useCase.execute(
        CreateCustomerInput.make({
          name: 'Invalid Phone User',
          phone: '12345',
        })
      )
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer({})))

    expect(exit._tag).toBe('Failure')
  })
})
