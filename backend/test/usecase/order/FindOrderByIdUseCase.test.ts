import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  FindOrderByIdUseCase,
  findOrderByIdUseCaseImpl,
} from 'src/usecase/order/FindOrderByIdUseCase'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderNotFound } from '@domain/OrderErrors'
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
    findById: (id: OrderId) => {
      const ord = orders.find((o) => o.id === id)
      return Effect.succeed(ord ? Option.some(ord) : Option.none())
    },
  } as unknown as OrderRepository)

const createTestLayer = (orders: Order[]) =>
  Layer.effect(
    FindOrderByIdUseCase,
    Effect.map(findOrderByIdUseCaseImpl, (i) => new FindOrderByIdUseCase(i))
  ).pipe(Layer.provide(createMockRepo(orders)))

describe('FindOrderByIdUseCase', () => {
  it('returns the order when found', async () => {
    const order = createTestOrder('order-1')

    const program = Effect.gen(function* () {
      const useCase = yield* FindOrderByIdUseCase
      return yield* useCase.execute(OrderId.make('order-1'))
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([order])))

    expect(result.id).toBe('order-1')
  })

  it('fails with OrderNotFound when missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* FindOrderByIdUseCase
      return yield* useCase.execute(OrderId.make('missing'))
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(OrderNotFound)
    }
  })
})
