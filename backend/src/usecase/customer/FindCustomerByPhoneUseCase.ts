import { Effect, Option } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { normalizePhoneNumber } from '@domain/PhoneNumber'
import { CustomerNotFound } from '@domain/CustomerErrors'

export const findCustomerByPhoneUseCaseImpl = Effect.gen(function* () {
  const repo = yield* CustomerRepository

  const execute = Effect.fn('FindCustomerByPhoneUseCase.execute')(function* (phoneInput: string) {
    const phone = yield* normalizePhoneNumber(phoneInput)
    const customerOption = yield* repo.findByPhone(phone)

    if (Option.isNone(customerOption)) {
      return yield* Effect.fail(new CustomerNotFound({ phone }))
    }

    return customerOption.value
  })

  return { execute } as const
})

export class FindCustomerByPhoneUseCase extends Effect.Service<FindCustomerByPhoneUseCase>()(
  'FindCustomerByPhoneUseCase',
  {
    accessors: true,
    effect: findCustomerByPhoneUseCaseImpl,
    dependencies: [CustomerRepository.Default],
  }
) {}
