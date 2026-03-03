import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect, Option } from 'effect'
import { AppApi } from '@api/AppApi'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerId, CustomerResponse } from '@domain/Customer'
import { CustomerNotFound, CustomerAlreadyExists, ValidationError } from '@domain/http/HttpErrors'

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
            SqlError: () => new ValidationError({ message: 'Failed search customers' }),
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
            SqlError: () => new ValidationError({ message: 'Failed create customers' }),
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
    .handle('getById', () =>
      Effect.gen(function* () {
        const repo = yield* CustomerRepository
        const request = yield* HttpServerRequest.HttpServerRequest

        // Extract ID from path parameter
        const url = new URL(request.url, 'http://localhost')
        const pathParts = url.pathname.split('/').filter(Boolean)
        const id = pathParts[pathParts.length - 1]

        if (!id) {
          return yield* Effect.fail(
            new ValidationError({
              message: 'Customer ID is required',
              field: 'id',
            })
          )
        }

        // Find customer, handle all errors by converting to CustomerNotFound or ValidationError
        const customer = yield* repo.findById(CustomerId.make(id)).pipe(
          Effect.andThen((customerOption) => {
            if (Option.isNone(customerOption)) {
              return Effect.fail(
                new CustomerNotFound({
                  message: `Customer not found with id: ${id}`,
                  customerId: id,
                })
              )
            }
            return Effect.succeed(customerOption.value)
          }),
          Effect.catchTags({
            CustomerNotFound: (cause) => new CustomerNotFound({ message: cause.message }),
            SqlError: () => new ValidationError({ message: 'Failed to retrieve customer' }),
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
