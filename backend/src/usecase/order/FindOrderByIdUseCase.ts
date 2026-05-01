import { Effect, Option } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import { OrderNotFound } from '@domain/OrderErrors'
import { OrderId } from '@domain/Order'

export const findOrderByIdUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository

  const execute = Effect.fn('FindOrderByIdUseCase.execute')(function* (id: OrderId) {
    const orderOption = yield* orderRepo.findById(id)

    if (Option.isNone(orderOption)) {
      return yield* Effect.fail(new OrderNotFound({ orderId: id }))
    }

    return orderOption.value
  })

  return { execute } as const
})

export class FindOrderByIdUseCase extends Effect.Service<FindOrderByIdUseCase>()(
  'FindOrderByIdUseCase',
  {
    accessors: true,
    effect: findOrderByIdUseCaseImpl,
    dependencies: [OrderRepository.Default],
  }
) {}
