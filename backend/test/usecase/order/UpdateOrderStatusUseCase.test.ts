import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  UpdateOrderStatusUseCase,
  updateOrderStatusUseCaseImpl,
} from 'src/usecase/order/UpdateOrderStatusUseCase'
import {
  FindOrderByIdUseCase,
  findOrderByIdUseCaseImpl,
} from 'src/usecase/order/FindOrderByIdUseCase'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderNotFound, InvalidOrderTransition } from '@domain/OrderErrors'
import type { Order, OrderStatus, PaymentStatus } from '@domain/Order'
import { OrderId } from '@domain/Order'
import type { CustomerId } from '@domain/Customer'
import type { UserId } from '@domain/User'

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
    updateStatus: (id: OrderId, status: OrderStatus) => {
      const ord = orders.find((o) => o.id === id)
      return Effect.succeed(ord ? { ...ord, status, updated_at: new Date() } : ord)
    },
  } as unknown as OrderRepository)

const createTestLayer = (orders: Order[]) => {
  const repoLayer = createMockRepo(orders)
  const findByIdLayer = Layer.effect(
    FindOrderByIdUseCase,
    Effect.map(findOrderByIdUseCaseImpl, (i) => new FindOrderByIdUseCase(i))
  ).pipe(Layer.provide(repoLayer))
  return Layer.effect(
    UpdateOrderStatusUseCase,
    Effect.map(updateOrderStatusUseCaseImpl, (i) => new UpdateOrderStatusUseCase(i))
  ).pipe(Layer.provide(Layer.mergeAll(repoLayer, findByIdLayer)))
}

describe('UpdateOrderStatusUseCase', () => {
  it('updates status with a valid transition', async () => {
    const order = createTestOrder('order-1')

    const program = Effect.gen(function* () {
      const useCase = yield* UpdateOrderStatusUseCase
      return yield* useCase.execute(OrderId.make('order-1'), 'in_progress' as OrderStatus)
    })

    await expect(
      Effect.runPromise(Effect.provide(program, createTestLayer([order])))
    ).resolves.toBeDefined()
  })

  it('fails with InvalidOrderTransition for an invalid transition', async () => {
    const delivered = createTestOrder('order-2', { status: 'delivered' as OrderStatus })

    const program = Effect.gen(function* () {
      const useCase = yield* UpdateOrderStatusUseCase
      return yield* useCase.execute(OrderId.make('order-2'), 'in_progress' as OrderStatus)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([delivered])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(InvalidOrderTransition)
    }
  })

  it('fails with OrderNotFound when order is missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* UpdateOrderStatusUseCase
      return yield* useCase.execute(OrderId.make('missing'), 'in_progress' as OrderStatus)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(OrderNotFound)
    }
  })
})
