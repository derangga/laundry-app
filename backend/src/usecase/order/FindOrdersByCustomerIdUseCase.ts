import { Effect } from 'effect'
import { OrderRepository } from '@repositories/OrderRepository'
import type { CustomerId } from '@domain/Customer'

export const findOrdersByCustomerIdUseCaseImpl = Effect.gen(function* () {
  const orderRepo = yield* OrderRepository

  const execute = Effect.fn('FindOrdersByCustomerIdUseCase.execute')(function* (id: CustomerId) {
    return yield* orderRepo.findByCustomerId(id)
  })

  return { execute } as const
})

export class FindOrdersByCustomerIdUseCase extends Effect.Service<FindOrdersByCustomerIdUseCase>()(
  'FindOrdersByCustomerIdUseCase',
  {
    accessors: true,
    effect: findOrdersByCustomerIdUseCaseImpl,
    dependencies: [OrderRepository.Default],
  }
) {}
