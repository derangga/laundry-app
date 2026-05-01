import { Effect } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { FindOrderByIdUseCase } from './FindOrderByIdUseCase'
import { validateStatusTransition } from '@domain/OrderStatusValidator'
import { OrderId, OrderStatus } from '@domain/Order'

export const updateOrderStatusUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository
  const findOrderByIdUseCase = yield* FindOrderByIdUseCase

  const execute = Effect.fn('UpdateOrderStatusUseCase.execute')(function* (
    id: OrderId,
    newStatus: OrderStatus
  ) {
    const order = yield* findOrderByIdUseCase.execute(id)

    yield* validateStatusTransition(order.status, newStatus)

    return yield* orderRepo.updateStatus(id, newStatus)
  })

  return { execute } as const
})

export class UpdateOrderStatusUseCase extends Effect.Service<UpdateOrderStatusUseCase>()(
  'UpdateOrderStatusUseCase',
  {
    accessors: true,
    effect: updateOrderStatusUseCaseImpl,
    dependencies: [OrderRepository.Default, FindOrderByIdUseCase.Default],
  }
) {}
