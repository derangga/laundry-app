import { Effect } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { FindOrderByIdUseCase } from './FindOrderByIdUseCase'
import { OrderId, PaymentStatus } from '@domain/Order'

export const updatePaymentStatusUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository
  const findOrderByIdUseCase = yield* FindOrderByIdUseCase

  const execute = Effect.fn('UpdatePaymentStatusUseCase.execute')(function* (
    id: OrderId,
    paymentStatus: PaymentStatus
  ) {
    yield* findOrderByIdUseCase.execute(id)

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
