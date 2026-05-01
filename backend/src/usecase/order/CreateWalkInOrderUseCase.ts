import { Effect } from 'effect'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { CreateOrderUseCase } from './CreateOrderUseCase'
import { CustomerAlreadyExists } from '@domain/CustomerErrors'
import { CreateWalkInOrderInput, CreateOrderInput } from '@domain/Order'
import { CreateCustomerInput } from '@domain/Customer'
import { UserId } from '@domain/User'

export const createWalkInOrderUseCaseImpl = Effect.gen(function* () {
  const customerService = yield* CustomerService
  const createOrderUseCase = yield* CreateOrderUseCase

  const execute = Effect.fn('CreateWalkInOrderUseCase.execute')(function* (
    data: CreateWalkInOrderInput,
    createdBy: UserId
  ) {
    const exists = yield* customerService.checkExists(data.customer_phone)

    if (exists) {
      return yield* Effect.fail(new CustomerAlreadyExists({ phone: data.customer_phone }))
    }

    const customer = yield* customerService.create(
      new CreateCustomerInput({
        name: data.customer_name,
        phone: data.customer_phone,
        address: data.customer_address,
      })
    )

    return yield* createOrderUseCase.execute(
      new CreateOrderInput({
        customer_id: customer.id,
        items: data.items,
        created_by: createdBy,
        payment_status: data.payment_status,
      })
    )
  })

  return { execute } as const
})

export class CreateWalkInOrderUseCase extends Effect.Service<CreateWalkInOrderUseCase>()(
  'CreateWalkInOrderUseCase',
  {
    accessors: true,
    effect: createWalkInOrderUseCaseImpl,
    dependencies: [CustomerService.Default, CreateOrderUseCase.Default],
  }
) {}
