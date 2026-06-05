import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import {
  CreateWalkInOrderUseCase,
  createWalkInOrderUseCaseImpl,
} from 'src/usecase/order/CreateWalkInOrderUseCase'
import { CreateOrderUseCase } from 'src/usecase/order/CreateOrderUseCase'
import { CheckCustomerExistsUseCase } from 'src/usecase/customer/CheckCustomerExistsUseCase'
import { CreateCustomerUseCase } from 'src/usecase/customer/CreateCustomerUseCase'
import { CustomerAlreadyExists } from '@domain/CustomerErrors'
import type { Order, OrderId, OrderStatus, PaymentStatus } from '@domain/Order'
import { CreateWalkInOrderInput, CreateOrderItemInput } from '@domain/Order'
import type { Customer, CustomerId } from '@domain/Customer'
import { ServiceId } from '@domain/LaundryService'
import { UserId } from '@domain/User'

const customerRecord = {
  id: 'customer-1' as CustomerId,
  name: 'New Customer',
  phone: '+628123456789',
  address: null,
  created_at: new Date(),
  updated_at: new Date(),
} as unknown as Customer

const createMockCheckCustomerExists = (exists: boolean) =>
  Layer.succeed(CheckCustomerExistsUseCase, {
    execute: (_phone: string) => Effect.succeed(exists),
  } as unknown as CheckCustomerExistsUseCase)

const createMockCreateCustomer = () =>
  Layer.succeed(CreateCustomerUseCase, {
    execute: (_data: unknown) => Effect.succeed(customerRecord),
  } as unknown as CreateCustomerUseCase)

const createMockCreateOrderUseCase = (capture?: { input?: unknown }) =>
  Layer.succeed(CreateOrderUseCase, {
    execute: (input: unknown) => {
      if (capture) capture.input = input
      return Effect.succeed({
        id: 'order-1' as OrderId,
        order_number: 'ORD-1',
        customer_id: customerRecord.id,
        status: 'received' as OrderStatus,
        payment_status: 'unpaid' as PaymentStatus,
        total_price: 15000,
        created_by: 'user-1' as UserId,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as Order)
    },
  } as unknown as CreateOrderUseCase)

const createTestLayer = (opts: { exists: boolean; capture?: { input?: unknown } }) =>
  Layer.effect(
    CreateWalkInOrderUseCase,
    Effect.map(createWalkInOrderUseCaseImpl, (i) => new CreateWalkInOrderUseCase(i))
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        createMockCheckCustomerExists(opts.exists),
        createMockCreateCustomer(),
        createMockCreateOrderUseCase(opts.capture)
      )
    )
  )

describe('CreateWalkInOrderUseCase', () => {
  it('creates customer and order when phone is new', async () => {
    const capture: { input?: unknown } = {}

    const program = Effect.gen(function* () {
      const useCase = yield* CreateWalkInOrderUseCase
      return yield* useCase.execute(
        CreateWalkInOrderInput.make({
          customer_name: 'New Customer',
          customer_phone: '+628123456789',
          customer_address: null,
          items: [
            CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
          ],
        }),
        UserId.make('user-1')
      )
    })

    const result = await Effect.runPromise(
      Effect.provide(program, createTestLayer({ exists: false, capture }))
    )

    expect(result.id).toBe('order-1')
    expect(capture.input).toBeDefined()
  })

  it('fails with CustomerAlreadyExists when phone already exists', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CreateWalkInOrderUseCase
      return yield* useCase.execute(
        CreateWalkInOrderInput.make({
          customer_name: 'Existing',
          customer_phone: '+628123456789',
          customer_address: null,
          items: [
            CreateOrderItemInput.make({ service_id: ServiceId.make('service-1'), quantity: 1 }),
          ],
        }),
        UserId.make('user-1')
      )
    })

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, createTestLayer({ exists: true }))
    )

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(CustomerAlreadyExists)
    }
  })
})
