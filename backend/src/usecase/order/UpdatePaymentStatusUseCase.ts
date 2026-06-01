import { Effect } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { FindOrderByIdUseCase } from './FindOrderByIdUseCase'
import { OrderId, PaymentStatus } from '@domain/Order'

import { PaymentUpdateNotAllowed } from '@domain/OrderErrors'

export const updatePaymentStatusUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository
  const findOrderByIdUseCase = yield* FindOrderByIdUseCase

  const execute = Effect.fn('UpdatePaymentStatusUseCase.execute')(function* (
    id: OrderId,
    paymentStatus: PaymentStatus
  ) {
    const order = yield* findOrderByIdUseCase.execute(id)

    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return yield* Effect.fail(
        new PaymentUpdateNotAllowed({
          orderId: id,
          currentStatus: order.status,
          paymentStatus: order.payment_status,
          reason: `Payment cannot be updated: order is in status '${order.status}' with payment '${order.payment_status}'`,
        })
      )
    }

    return yield* orderRepo.updatePaymentStatus(id, paymentStatus)
  })

  return { execute } as const
})

export class UpdatePaymentStatusUseCase extends Effect.Service<UpdatePaymentStatusUseCase>()(
  'UpdatePaymentStatusUseCase',
  {
    accessors: true,
    effect: updatePaymentStatusUseCaseImpl,
    dependencies: [OrderRepository.Default, FindOrderByIdUseCase.Default],
  }
) {}
