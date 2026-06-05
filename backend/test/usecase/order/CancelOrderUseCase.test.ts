import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import { CancelOrderUseCase, cancelOrderUseCaseImpl } from 'src/usecase/order/CancelOrderUseCase'
import {
  FindOrderByIdUseCase,
  findOrderByIdUseCaseImpl,
} from 'src/usecase/order/FindOrderByIdUseCase'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderCannotBeCancelled, OrderNotFound } from '@domain/OrderErrors'
import type { Order, OrderFromDb, OrderStatus, PaymentStatus } from '@domain/Order'
import { OrderId } from '@domain/Order'
import type { CustomerId } from '@domain/Customer'
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

type CancelCall = {
  orderId: OrderId
  adminId: UserId
  reason: string
  refund: boolean
}

const createMockRepo = (orders: Order[], spy?: (call: CancelCall) => void) =>
  Layer.succeed(OrderRepository, {
    findById: (id: OrderId) => {
      const ord = orders.find((o) => o.id === id)
      return Effect.succeed(ord ? Option.some(ord) : Option.none())
    },
    cancelOrder: (orderId: OrderId, adminId: UserId, reason: string, refund: boolean) => {
      spy?.({ orderId, adminId, reason, refund })
      const ord = orders.find((o) => o.id === orderId)
      if (!ord) {
        return Effect.die(new Error(`Order ${orderId} not found in mock`))
      }
      const cancelled = {
        ...ord,
        status: 'cancelled' as OrderStatus,
        payment_status: refund ? ('refunded' as PaymentStatus) : ord.payment_status,
        cancelled_at: new Date(),
        cancelled_by: adminId,
        cancellation_reason: reason,
        updated_at: new Date(),
      } as unknown as OrderFromDb
      return Effect.succeed(cancelled)
    },
  } as unknown as OrderRepository)

const createTestLayer = (orders: Order[], spy?: (call: CancelCall) => void) => {
  const repoLayer = createMockRepo(orders, spy)
  const findByIdLayer = Layer.effect(
    FindOrderByIdUseCase,
    Effect.map(findOrderByIdUseCaseImpl, (i) => new FindOrderByIdUseCase(i))
  ).pipe(Layer.provide(repoLayer))
  return Layer.effect(
    CancelOrderUseCase,
    Effect.map(cancelOrderUseCaseImpl, (i) => new CancelOrderUseCase(i))
  ).pipe(Layer.provide(Layer.mergeAll(repoLayer, findByIdLayer)))
}

describe('CancelOrderUseCase', () => {
  it('cancels a received+unpaid order with refund=false', async () => {
    const order = createTestOrder('order-1', {
      status: 'received' as OrderStatus,
      payment_status: 'unpaid' as PaymentStatus,
    })
    let captured: CancelCall | undefined
    const adminId = UserId.make('admin-1')

    const program = Effect.gen(function* () {
      const useCase = yield* CancelOrderUseCase
      return yield* useCase.execute(OrderId.make('order-1'), adminId, '  customer no-show  ')
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer([order], (call) => {
          captured = call
        })
      )
    )

    expect(captured).toBeDefined()
    expect(captured!.refund).toBe(false)
    expect(captured!.reason).toBe('customer no-show')
    expect(captured!.adminId).toBe(adminId)
    expect(result.status).toBe('cancelled')
    expect(result.payment_status).toBe('unpaid')
  })

  it('cancels a received+paid order with refund=true', async () => {
    const order = createTestOrder('order-2', {
      status: 'received' as OrderStatus,
      payment_status: 'paid' as PaymentStatus,
    })
    let captured: CancelCall | undefined

    const program = Effect.gen(function* () {
      const useCase = yield* CancelOrderUseCase
      return yield* useCase.execute(OrderId.make('order-2'), UserId.make('admin-1'), 'oops')
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer([order], (call) => {
          captured = call
        })
      )
    )

    expect(captured!.refund).toBe(true)
    expect(result.status).toBe('cancelled')
    expect(result.payment_status).toBe('refunded')
  })

  it('fails with OrderCannotBeCancelled when status is not received', async () => {
    const order = createTestOrder('order-3', {
      status: 'in_progress' as OrderStatus,
      payment_status: 'paid' as PaymentStatus,
    })

    const program = Effect.gen(function* () {
      const useCase = yield* CancelOrderUseCase
      return yield* useCase.execute(OrderId.make('order-3'), UserId.make('admin-1'), 'reason')
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([order])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(OrderCannotBeCancelled)
      const err = exit.cause.error as OrderCannotBeCancelled
      expect(err.currentStatus).toBe('in_progress')
      expect(err.paymentStatus).toBe('paid')
    }
  })

  it('fails with OrderNotFound when order is missing', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* CancelOrderUseCase
      return yield* useCase.execute(OrderId.make('missing'), UserId.make('admin-1'), 'reason')
    })

    const exit = await Effect.runPromiseExit(Effect.provide(program, createTestLayer([])))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(OrderNotFound)
    }
  })
})
