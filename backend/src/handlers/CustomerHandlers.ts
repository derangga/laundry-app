import { HttpApiBuilder, HttpServerRequest } from '@effect/platform'
import { Effect, Option } from 'effect'
import { CustomerApi } from '@api/CustomerApi'
import { CustomerService } from 'src/usecase/customer/CustomerService'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerId } from '@domain/Customer'
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
export const CustomerHandlersLive = HttpApiBuilder.group(CustomerApi, 'Customers', (handlers) =>
  handlers
    /**
     * Search customer by phone number (query parameter)
     * GET /api/customers?phone={phone}
     * Returns: Customer
     * Errors: 400 (validation), 404 (not found)
     */
    .handle('searchByPhone', () =>
      Effect.gen(function* () {
        const customerService = yield* CustomerService
        const request = yield* HttpServerRequest.HttpServerRequest

        // Extract phone query parameter
        const url = new URL(request.url, 'http://localhost')
        const phone = url.searchParams.get('phone')

        if (!phone) {
          return yield* Effect.fail(
            new ValidationError({
              message: 'Phone query parameter is required',
              field: 'phone',
            })
          )
        }

        // Find customer, map domain error to HTTP error
        return yield* customerService.findByPhone(phone).pipe(
          Effect.mapError((error) => {
            if (error._tag === 'CustomerNotFound') {
              return new CustomerNotFound({
                message: `Customer not found with phone: ${error.phone}`,
                phone: error.phone,
              })
            }
            return new ValidationError({
              message: error.message,
            })
          })
        )
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
          Effect.mapError((error) => {
            if (error._tag === 'CustomerAlreadyExists') {
              return new CustomerAlreadyExists({
                message: `Customer already exists with phone: ${error.phone}`,
                phone: error.phone,
              })
            }
            if (error._tag === 'InvalidPhoneNumber') {
              return new ValidationError({
                message: error.message,
                field: 'phone',
                details: { reason: error.reason },
              })
            }
            return new ValidationError({
              message: error.message,
            })
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
        return yield* repo.findById(CustomerId.make(id)).pipe(
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
          Effect.mapError((error) => {
            // If it's already a CustomerNotFound error, pass it through
            if (error && typeof error === 'object' && '_tag' in error) {
              const tag = (error as any)._tag
              if (tag === 'CustomerNotFound') {
                return error as CustomerNotFound
              }
            }
            // Otherwise convert to validation error
            const message = error instanceof Error ? error.message : 'Failed to retrieve customer'
            return new ValidationError({ message })
          })
        )
      })
    )
)
