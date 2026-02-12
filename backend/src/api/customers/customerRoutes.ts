import { HttpRouter, HttpServerResponse, HttpServerRequest } from '@effect/platform'
import { Effect, Option, Schema } from 'effect'
import { CustomerRepository } from '@repositories/CustomerRepository'
import { CustomerService } from '@application/customer/CustomerService'
import { CreateCustomerInput, CustomerId } from '@domain/Customer'
import { requireAuthMiddleware } from '@http/middleware/auth'

/**
 * GET /api/customers?phone={phone}
 * Search customer by phone number
 * Requires authentication, accessible by both staff and admin
 */
const searchByPhoneHandler = Effect.gen(function* () {
  const customerService = yield* CustomerService
  const request = yield* HttpServerRequest.HttpServerRequest

  // Extract phone from query params (request.url is relative, needs base URL)
  const url = new URL(request.url, 'http://localhost')
  const phone = url.searchParams.get('phone')

  if (!phone) {
    return yield* HttpServerResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Phone query parameter is required' } },
      { status: 400 }
    )
  }

  // Service handles normalization and throws CustomerNotFound if not exists
  const customer = yield* customerService.findByPhone(phone)

  return yield* HttpServerResponse.json(customer)
})

/**
 * POST /api/customers
 * Create new customer
 * Requires authentication, accessible by both staff and admin
 */
const createCustomerHandler = Effect.gen(function* () {
  const customerService = yield* CustomerService
  const request = yield* HttpServerRequest.HttpServerRequest
  const body = yield* request.json

  // Validate request body
  const input = yield* Schema.decodeUnknown(CreateCustomerInput)(body)

  // Service handles phone normalization and uniqueness check
  const customer = yield* customerService.create({
    name: input.name,
    phone: input.phone,
    address: input.address || null,
  })

  return yield* HttpServerResponse.json(customer, { status: 201 })
})

/**
 * GET /api/customers/:id
 * Get customer by ID
 * Requires authentication, accessible by both staff and admin
 */
const getByIdHandler = Effect.gen(function* () {
  const repo = yield* CustomerRepository
  const params = yield* HttpRouter.params

  const customerOption = yield* repo.findById(params.id as CustomerId)

  if (Option.isNone(customerOption)) {
    return yield* HttpServerResponse.json(
      { error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } },
      { status: 404 }
    )
  }

  return yield* HttpServerResponse.json(customerOption.value)
})

/**
 * Customer routes router
 * Mounts customer management endpoints:
 * - GET / - Search by phone (query param)
 * - POST / - Create customer
 * - GET /:id - Get by ID
 */
export const customerRoutes = HttpRouter.empty.pipe(
  HttpRouter.get('/', requireAuthMiddleware(searchByPhoneHandler)),
  HttpRouter.post('/', requireAuthMiddleware(createCustomerHandler)),
  HttpRouter.get('/:id', requireAuthMiddleware(getByIdHandler))
)
