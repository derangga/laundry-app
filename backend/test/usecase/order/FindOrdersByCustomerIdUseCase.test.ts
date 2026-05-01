import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import {
  FindOrdersByCustomerIdUseCase,
  findOrdersByCustomerIdUseCaseImpl,
} from 'src/usecase/order/FindOrdersByCustomerIdUseCase'
import { OrderRepository } from '@repositories/OrderRepository'
import { Order, OrderId, OrderStatus, PaymentStatus } from '@domain/Order'
import { CustomerId } from '@domain/Customer'
import { UserId } from '@domain/User'

const createTestOrder = (id: string, overrides?: Partial<Order>): Order =>
  ({
    id: id as OrderId,
    order_number: `ORD-${id}`,
    customer_id: 'customer-1' as CustomerId,
    status: 'received' as OrderStatus,
    payment_status: 'unpaid' as PaymentStatus,
    total_price: 30000,
    created_by: 'user-1' as UserId,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as Order

const createMockRepo = (orders: Order[]) =>
  Layer.succeed(OrderRepository, {
    findByCustomerId: (customerId: CustomerId) =>
      Effect.succeed(orders.filter((o) => o.customer_id === customerId)),
  } as unknown as OrderRepository)

const createTestLayer = (orders: Order[]) =>
  Layer.effect(
    FindOrdersByCustomerIdUseCase,
    Effect.map(findOrdersByCustomerIdUseCaseImpl, (i) => new FindOrdersByCustomerIdUseCase(i))
  ).pipe(Layer.provide(createMockRepo(orders)))

describe('FindOrdersByCustomerIdUseCase', () => {
  it('returns orders for the given customer', async () => {
    const orders = [
      createTestOrder('order-1', { customer_id: 'customer-1' as CustomerId }),
      createTestOrder('order-2', { customer_id: 'customer-2' as CustomerId }),
      createTestOrder('order-3', { customer_id: 'customer-1' as CustomerId }),
    ]

    const program = Effect.gen(function* () {
      const useCase = yield* FindOrdersByCustomerIdUseCase
      return yield* useCase.execute(CustomerId.make('customer-1'))
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer(orders)))

    expect(result).toHaveLength(2)
    expect(result.every((o) => o.customer_id === 'customer-1')).toBe(true)
  })

  it('returns empty array when customer has no orders', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* FindOrdersByCustomerIdUseCase
      return yield* useCase.execute(CustomerId.make('customer-x'))
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([])))

    expect(result).toHaveLength(0)
  })
})
