import { HttpApiBuilder } from '@effect/platform'
import { Effect, Option } from 'effect'
import { ServiceApi } from '@api/ServiceApi'
import { LaundryServiceService } from 'src/usecase/order/LaundryServiceService'
import { ServiceId, SuccessDeleteService } from '@domain/LaundryService'
import {
  ServiceNotFound,
  ValidationError,
  Forbidden,
  RetrieveDataEror,
  UpdateDataEror,
} from '@domain/http/HttpErrors'
import { CurrentUser } from '@domain/CurrentUser'

export const ServiceHandlersLive = HttpApiBuilder.group(ServiceApi, 'Services', (handlers) =>
  handlers
    .handle('list', () =>
      Effect.gen(function* () {
        const serviceService = yield* LaundryServiceService
        return yield* serviceService
          .findActive()
          .pipe(
            Effect.mapError(
              () => new RetrieveDataEror({ message: 'failed get active laundry service' })
            )
          )
      })
    )

    .handle('create', ({ payload }) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser.getOption

        if (currentUser._tag === 'None' || currentUser.value.role !== 'admin') {
          return yield* Effect.fail(
            new Forbidden({
              message: 'Only admins can create services',
              requiredRole: 'admin',
            })
          )
        }

        const serviceService = yield* LaundryServiceService
        return yield* serviceService.create(payload).pipe(
          Effect.mapError((error) => {
            return new ValidationError({
              message: error.message,
            })
          })
        )
      })
    )

    .handle('update', ({ path, payload }) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser.getOption

        if (currentUser._tag === 'None' || currentUser.value.role !== 'admin') {
          return yield* Effect.fail(
            new Forbidden({
              message: 'Only admins can update services',
              requiredRole: 'admin',
            })
          )
        }

        const id = path.id

        const serviceService = yield* LaundryServiceService

        const result = yield* serviceService.update(ServiceId.make(id), payload).pipe(
          Effect.mapError((error) => {
            if (error._tag === 'ServiceNotFound') {
              return new ServiceNotFound({
                message: `Service not found with id: ${id}`,
                serviceId: id,
              })
            }
            return new ValidationError({
              message: error.message,
            })
          })
        )

        if (Option.isNone(result)) {
          return yield* Effect.fail(
            new ServiceNotFound({
              message: `Service not found with id: ${id}`,
              serviceId: id,
            })
          )
        }

        return result.value
      })
    )

    .handle('delete', ({ path }) =>
      Effect.gen(function* () {
        const currentUser = yield* CurrentUser.getOption

        if (currentUser._tag === 'None' || currentUser.value.role !== 'admin') {
          return yield* Effect.fail(
            new Forbidden({
              message: 'Only admins can delete services',
              requiredRole: 'admin',
            })
          )
        }

        const id = path.id

        const serviceService = yield* LaundryServiceService
        return yield* serviceService.softDelete(ServiceId.make(id)).pipe(
          Effect.flatMap(() =>
            Effect.succeed(SuccessDeleteService.make({ message: 'Success delete services' }))
          ),
          Effect.mapError(() => new UpdateDataEror({ message: 'Failed remove services' }))
        )
      })
    )
)
