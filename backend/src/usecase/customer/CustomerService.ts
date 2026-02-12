import { Effect, Option } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CreateCustomerInput, Customer } from '@domain/Customer'
import { normalizePhoneNumber } from '@domain/PhoneNumber'
import { CustomerNotFound, CustomerAlreadyExists } from '@domain/CustomerErrors'

export class CustomerService extends Effect.Service<CustomerService>()('CustomerService', {
  effect: Effect.gen(function* () {
    const repo = yield* CustomerRepository

    const findByPhone = (phoneInput: string) =>
      Effect.gen(function* () {
        const phone = yield* normalizePhoneNumber(phoneInput)
        const customerOption = yield* repo.findByPhone(phone)

        if (Option.isNone(customerOption)) {
          return yield* Effect.fail(new CustomerNotFound({ phone }))
        }

        return customerOption.value
      })

    const checkExists = (phoneInput: string) =>
      Effect.gen(function* () {
        const phone = yield* normalizePhoneNumber(phoneInput)
        const customerOption = yield* repo.findByPhone(phone)
        return Option.isSome(customerOption)
      })

    const create = (data: CreateCustomerInput) =>
      Effect.gen(function* () {
        const phone = yield* normalizePhoneNumber(data.phone)

        // Check if customer already exists
        const existing = yield* repo.findByPhone(phone)
        if (Option.isSome(existing)) {
          return yield* Effect.fail(new CustomerAlreadyExists({ phone }))
        }

        // Create customer
        return yield* repo.insert(
          Customer.insert.make({
            name: data.name,
            phone: phone as string,
            address: data.address || null,
          })
        )
      })

    return {
      findByPhone,
      checkExists,
      create,
    }
  }),
  dependencies: [CustomerRepository.Default],
}) {}
