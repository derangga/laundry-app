import { Effect } from 'effect'
import { CheckCustomerExistsUseCase } from 'src/usecase/customer/CheckCustomerExistsUseCase'
import { CreateCustomerUseCase } from 'src/usecase/customer/CreateCustomerUseCase'
import { CreateOrderUseCase } from './CreateOrderUseCase'
import { CustomerAlreadyExists } from '@domain/CustomerErrors'
import { CreateWalkInOrderInput, CreateOrderInput } from '@domain/Order'
import { CreateCustomerInput } from '@domain/Customer'
import { UserId } from '@domain/User'

export const createWalkInOrderUseCaseImpl = Effect.gen(function* () {
  const checkCustomerExists = yield* CheckCustomerExistsUseCase
  const createCustomer = yield* CreateCustomerUseCase
  const createOrderUseCase = yield* CreateOrderUseCase

  const execute = Effect.fn('CreateWalkInOrderUseCase.execute')(function* (
    data: CreateWalkInOrderInput,
    createdBy: UserId
  ) {
    const exists = yield* checkCustomerExists.execute(data.customer_phone)

    if (exists) {
      return yield* Effect.fail(new CustomerAlreadyExists({ phone: data.customer_phone }))
    }

    const customer = yield* createCustomer.execute(
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
    dependencies: [
      CheckCustomerExistsUseCase.Default,
      CreateCustomerUseCase.Default,
      CreateOrderUseCase.Default,
    ],
  }
) {}
