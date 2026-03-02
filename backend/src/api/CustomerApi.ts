import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { CustomerResponse, CreateCustomerInput } from '@domain/Customer'
import { CustomerNotFound, CustomerAlreadyExists, ValidationError } from '@domain/http/HttpErrors'

const SearchByPhoneParams = Schema.Struct({
  phone: Schema.String.pipe(Schema.nonEmptyString()),
})

export const CustomerGroup = HttpApiGroup.make('Customers')
  .add(
    HttpApiEndpoint.get('searchByPhone', '/api/customers/search')
      .setUrlParams(SearchByPhoneParams)
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
