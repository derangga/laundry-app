import { HttpApiBuilder } from '@effect/platform'
import { Effect, Option } from 'effect'
import { AppApi } from '@api/AppApi'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerId, CustomerResponse } from '@domain/Customer'
import {
  CustomerNotFound,
  CustomerAlreadyExists,
  ValidationError,
  UnprocessibleEntity,
} from '@domain/http/HttpErrors'

/**
 * Customer API Handlers
 *
 * Implements handlers for customer management endpoints using HttpApiBuilder.
 * Automatically validates payloads, handles errors, and returns typed responses.
 *
 * Error mapping pattern:
 * - Domain errors (Data.TaggedError) are caught and mapped to HTTP errors
 * - HTTP errors include proper status codes and message formats
 */
export const CustomerHandlersLive = HttpApiBuilder.group(AppApi, 'Customers', (handlers) =>
  handlers
    /**
     * Search customer by phone number (query parameter)
     * GET /api/customers/search?phone={phone}
     * Returns: Customer
     * Errors: 400 (validation), 404 (not found)
     */
    .handle('searchByPhone', ({ urlParams }) =>
      Effect.gen(function* () {
        const customerService = yield* CustomerService

        const customer = yield* customerService.findByPhone(urlParams.phone).pipe(
          Effect.catchTags({
            CustomerNotFound: (cause) =>
              new CustomerNotFound({
                message: `Customer not found with phone: ${cause.phone}`,
                phone: cause.phone,
              }),
            InvalidPhoneNumber: (cause) => new ValidationError({ message: cause.message }),
            SqlError: () => new UnprocessibleEntity({ message: 'Failed search customers' }),
          })
        )

        return CustomerResponse.make({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        })
      })
    )

    /**
     * Create new customer
     * POST /api/customers
     * Payload: CreateCustomerInput (automatically validated by HttpApiBuilder)
     * Returns: Customer (201 Created)
     * Errors: 400 (validation), 409 (already exists)
     */
    .handle('create', ({ payload }) =>
      Effect.gen(function* () {
        const customerService = yield* CustomerService

        // Create customer, map domain errors to HTTP errors
        return yield* customerService.create(payload).pipe(
          Effect.catchTags({
            CustomerAlreadyExists: (cause) =>
              new CustomerAlreadyExists({
                message: `Customer already exists with phone: ${cause.phone}`,
                phone: cause.phone,
              }),
            InvalidPhoneNumber: (cause) =>
              new ValidationError({
                message: cause.message,
                field: 'phone',
                details: { reason: cause.reason },
              }),
            SqlError: () => new UnprocessibleEntity({ message: 'Failed create customers' }),
          })
        )
      })
    )

    /**
     * Get customer by ID
     * GET /api/customers/:id
     * Returns: Customer
     * Errors: 404 (not found), 400 (validation)
     */
    .handle('getById', ({ path }) =>
      Effect.gen(function* () {
        const repo = yield* CustomerRepository

        // Find customer, handle all errors by converting to CustomerNotFound or ValidationError
        const customer = yield* repo.findById(CustomerId.make(path.id)).pipe(
          Effect.andThen((customerOption) => {
            if (Option.isNone(customerOption)) {
              return Effect.fail(
                new CustomerNotFound({
                  message: `Customer not found with id: ${path.id}`,
                  customerId: path.id,
                })
              )
            }
            return Effect.succeed(customerOption.value)
          }),
          Effect.catchTags({
            CustomerNotFound: (cause) => new CustomerNotFound({ message: cause.message }),
            SqlError: () => new UnprocessibleEntity({ message: 'Failed to retrieve customer' }),
          })
        )

        return CustomerResponse.make({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
        })
      })
    )
)
