import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Customer, CreateCustomerInput } from '@domain/Customer'
import { CustomerNotFound, CustomerAlreadyExists, ValidationError } from '@domain/http/HttpErrors'

/**
 * Customer API Schema Definitions
 *
 * Defines the HTTP contract for customer management endpoints:
 * - GET / - Search customer by phone (query parameter)
 * - POST / - Create new customer
 * - GET /:id - Get customer by ID
 *
 * Uses HttpApi.make() for type-safe, automatic validation and error handling.
 * Replaces manual HttpRouter composition with declarative endpoint definitions.
 */

export class CustomerApi extends HttpApi.make('CustomerApi').add(
  HttpApiGroup.make('Customers')
    .add(
      HttpApiEndpoint.get('searchByPhone', '/api/customers')
        .addSuccess(Customer)
        .addError(CustomerNotFound)
        .addError(ValidationError)
    )
    .add(
      HttpApiEndpoint.post('create', '/api/customers')
        .setPayload(CreateCustomerInput)
        .addSuccess(Customer)
        .addError(CustomerAlreadyExists)
        .addError(ValidationError)
    )
    .add(
      HttpApiEndpoint.get('getById', '/api/customers/:id')
        .addSuccess(Customer)
        .addError(CustomerNotFound)
        .addError(ValidationError)
    )
) {}
