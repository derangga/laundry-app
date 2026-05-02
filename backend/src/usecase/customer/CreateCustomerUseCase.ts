import { Effect, Option } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CreateCustomerInput, Customer } from '@domain/Customer'
import { normalizePhoneNumber } from '@domain/PhoneNumber'
import { CustomerAlreadyExists } from '@domain/CustomerErrors'

export const createCustomerUseCaseImpl = Effect.gen(function* () {
  const repo = yield* CustomerRepository

  const execute = Effect.fn('CreateCustomerUseCase.execute')(function* (data: CreateCustomerInput) {
    const phone = yield* normalizePhoneNumber(data.phone)

    const existing = yield* repo.findByPhone(phone)
    if (Option.isSome(existing)) {
      return yield* Effect.fail(new CustomerAlreadyExists({ phone }))
    }

    return yield* repo.insert(
      Customer.insert.make({
        name: data.name,
        phone: phone as string,
        address: data.address || null,
      })
    )
  })

  return { execute } as const
})

export class CreateCustomerUseCase extends Effect.Service<CreateCustomerUseCase>()(
  'CreateCustomerUseCase',
  {
    accessors: true,
    effect: createCustomerUseCaseImpl,
    dependencies: [CustomerRepository.Default],
  }
) {}
