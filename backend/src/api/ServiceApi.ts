import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import {
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
  LaundryServiceResponse,
  SuccessDeleteService,
} from '@domain/LaundryService'
import {
  ServiceNotFound,
  ValidationError,
  Forbidden,
  RetrieveDataEror,
  UpdateDataEror,
} from '@domain/http/HttpErrors'
import { AuthAdminMiddleware } from 'src/middleware/AuthMiddleware'

const ServiceIdParam = Schema.Struct({ id: Schema.String })

export const ServiceGroup = HttpApiGroup.make('Services')
  .add(
    HttpApiEndpoint.post('create', '/api/services')
      .setPayload(CreateLaundryServiceInput)
      .addSuccess(LaundryServiceResponse)
      .addError(ValidationError)
      .addError(Forbidden)
  )
  .add(
    HttpApiEndpoint.put('update', '/api/services/:id')
      .setPath(ServiceIdParam)
      .setPayload(UpdateLaundryServiceInput)
      .addSuccess(LaundryServiceResponse)
      .addError(ServiceNotFound)
      .addError(ValidationError)
      .addError(Forbidden)
  )
  .add(
    HttpApiEndpoint.del('delete', '/api/services/:id')
      .setPath(ServiceIdParam)
      .addSuccess(SuccessDeleteService)
      .addError(ServiceNotFound)
      .addError(Forbidden)
      .addError(UpdateDataEror)
  )
  .middlewareEndpoints(AuthAdminMiddleware)
  .add(
    HttpApiEndpoint.get('list', '/api/services')
      .addSuccess(Schema.Array(LaundryServiceResponse))
      .addError(RetrieveDataEror)
  )
