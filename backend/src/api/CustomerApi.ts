import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { CustomerResponse, CreateCustomerInput } from '@domain/Customer'
import { CustomerNotFound, CustomerAlreadyExists, ValidationError } from '@domain/http/HttpErrors'

export const CustomerGroup = HttpApiGroup.make('Customers')
  .add(
    HttpApiEndpoint.get('searchByPhone', '/api/customers')
      .addSuccess(CustomerResponse)
      .addError(CustomerNotFound)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.post('create', '/api/customers')
      .setPayload(CreateCustomerInput)
      .addSuccess(CustomerResponse)
      .addError(CustomerAlreadyExists)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.get('getById', '/api/customers/:id')
      .addSuccess(CustomerResponse)
      .addError(CustomerNotFound)
      .addError(ValidationError)
  )
