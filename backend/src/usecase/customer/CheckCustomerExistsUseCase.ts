import { Effect, Option } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { normalizePhoneNumber } from '@domain/PhoneNumber'

export const checkCustomerExistsUseCaseImpl = Effect.gen(function* () {
  const repo = yield* CustomerRepository

  const execute = Effect.fn('CheckCustomerExistsUseCase.execute')(function* (phoneInput: string) {
    const phone = yield* normalizePhoneNumber(phoneInput)
    const customerOption = yield* repo.findByPhone(phone)
    return Option.isSome(customerOption)
  })

  return { execute } as const
})

export class CheckCustomerExistsUseCase extends Effect.Service<CheckCustomerExistsUseCase>()(
  'CheckCustomerExistsUseCase',
  {
    accessors: true,
    effect: checkCustomerExistsUseCaseImpl,
    dependencies: [CustomerRepository.Default],
  }
) {}
