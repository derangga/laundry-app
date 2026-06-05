import { Effect } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { FindOrderByIdUseCase } from './FindOrderByIdUseCase'
import type { OrderId } from '@domain/Order'
import type { UserId } from '@domain/User'
import { OrderCannotBeCancelled } from '@domain/OrderErrors'

export const cancelOrderUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository
  const findOrderByIdUseCase = yield* FindOrderByIdUseCase

  const execute = Effect.fn('CancelOrderUseCase.execute')(function* (
    id: OrderId,
    adminId: UserId,
    notes: string
  ) {
    const order = yield* findOrderByIdUseCase.execute(id)

    if (order.status !== 'received') {
      return yield* Effect.fail(
        new OrderCannotBeCancelled({
          orderId: id,
          currentStatus: order.status,
          paymentStatus: order.payment_status,
          reason: `Order in status '${order.status}' cannot be cancelled; only 'received' orders are cancellable`,
        })
      )
    }

    const refund = order.payment_status === 'paid'

    return yield* orderRepo.cancelOrder(id, adminId, notes.trim(), refund)
  })

  return { execute } as const
})

export class CancelOrderUseCase extends Effect.Service<CancelOrderUseCase>()('CancelOrderUseCase', {
  accessors: true,
  effect: cancelOrderUseCaseImpl,
  dependencies: [OrderRepository.Default, FindOrderByIdUseCase.Default],
}) {}
