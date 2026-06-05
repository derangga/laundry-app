import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  UpdatePaymentStatusUseCase,
  updatePaymentStatusUseCaseImpl,
} from 'src/usecase/order/UpdatePaymentStatusUseCase'
import {
  FindOrderByIdUseCase,
  findOrderByIdUseCaseImpl,
} from 'src/usecase/order/FindOrderByIdUseCase'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderNotFound, PaymentUpdateNotAllowed } from '@domain/OrderErrors'
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
    updatePaymentStatus: (id: OrderId, paymentStatus: PaymentStatus) => {
      const ord = orders.find((o) => o.id === id)
      return Effect.succeed(
        ord ? { ...ord, payment_status: paymentStatus, updated_at: new Date() } : ord
      )
    },
  } as unknown as OrderRepository)

const createTestLayer = (orders: Order[]) => {
  const repoLayer = createMockRepo(orders)
  const findByIdLayer = Layer.effect(
    FindOrderByIdUseCase,
    Effect.map(findOrderByIdUseCaseImpl, (i) => new FindOrderByIdUseCase(i))
  ).pipe(Layer.provide(repoLayer))
  return Layer.effect(
    UpdatePaymentStatusUseCase,
    Effect.map(updatePaymentStatusUseCaseImpl, (i) => new UpdatePaymentStatusUseCase(i))
  ).pipe(Layer.provide(Layer.mergeAll(repoLayer, findByIdLayer)))
}

describe('UpdatePaymentStatusUseCase', () => {
  it('updates payment status when order exists', async () => {
    const order = createTestOrder('order-1')

    const program = Effect.gen(function* () {
      const useCase = yield* UpdatePaymentStatusUseCase
      return yield* useCase.execute(OrderId.make('order-1'), 'paid' as PaymentStatus)
    })

    await expect(
      Effect.runPromise(Effect.provide(program, createTestLayer([order])))
    ).resolves.toBeDefined()
  })

  it('fails with OrderNotFound when order is missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* UpdatePaymentStatusUseCase
      return yield* useCase.execute(OrderId.make('missing'), 'paid' as PaymentStatus)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(OrderNotFound)
    }
  })

  it('fails with PaymentUpdateNotAllowed when order is cancelled', async () => {
    const order = createTestOrder('order-cancelled', {
      status: 'cancelled' as OrderStatus,
      payment_status: 'unpaid' as PaymentStatus,
    })

    const program = Effect.gen(function* () {
      const useCase = yield* UpdatePaymentStatusUseCase
      return yield* useCase.execute(OrderId.make('order-cancelled'), 'paid' as PaymentStatus)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([order])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PaymentUpdateNotAllowed)
    }
  })

  it('fails with PaymentUpdateNotAllowed when payment status is refunded', async () => {
    const order = createTestOrder('order-refunded', {
      status: 'received' as OrderStatus,
      payment_status: 'refunded' as PaymentStatus,
    })

    const program = Effect.gen(function* () {
      const useCase = yield* UpdatePaymentStatusUseCase
      return yield* useCase.execute(OrderId.make('order-refunded'), 'paid' as PaymentStatus)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([order])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PaymentUpdateNotAllowed)
    }
  })

  it('fails with PaymentUpdateNotAllowed when order is delivered without calling updatePaymentStatus', async () => {
    const order = createTestOrder('order-delivered', {
      status: 'delivered' as OrderStatus,
      payment_status: 'paid' as PaymentStatus,
    })

    let updateCalled = false
    const repoLayer = Layer.succeed(OrderRepository, {
      findById: (id: OrderId) =>
        Effect.succeed(id === order.id ? Option.some(order) : Option.none()),
      updatePaymentStatus: (_id: OrderId, paymentStatus: PaymentStatus) => {
        updateCalled = true
        return Effect.succeed({ ...order, payment_status: paymentStatus, updated_at: new Date() })
      },
    } as unknown as OrderRepository)
    const findByIdLayer = Layer.effect(
      FindOrderByIdUseCase,
      Effect.map(findOrderByIdUseCaseImpl, (i) => new FindOrderByIdUseCase(i))
    ).pipe(Layer.provide(repoLayer))
    const testLayer = Layer.effect(
      UpdatePaymentStatusUseCase,
      Effect.map(updatePaymentStatusUseCaseImpl, (i) => new UpdatePaymentStatusUseCase(i))
    ).pipe(Layer.provide(Layer.mergeAll(repoLayer, findByIdLayer)))

    const program = Effect.gen(function* () {
      const useCase = yield* UpdatePaymentStatusUseCase
      return yield* useCase.execute(OrderId.make('order-delivered'), 'unpaid' as PaymentStatus)
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PaymentUpdateNotAllowed)
    }
    expect(updateCalled).toBe(false)
  })
})
