import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { LaundryServiceService } from 'src/usecase/order/LaundryServiceService'
import { ServiceId, SuccessDeleteService } from '@domain/LaundryService'
import {
  ServiceNotFound,
  ValidationError,
  Forbidden,
  RetrieveDataEror,
  UpdateDataEror,
  UnprocessibleEntity,
} from '@domain/http/HttpErrors'
import { CurrentUser } from '@domain/CurrentUser'

export const ServiceHandlersLive = HttpApiBuilder.group(AppApi, 'Services', (handlers) =>
  handlers
    .handle('list', ({ urlParams }) =>
      Effect.gen(function* () {
        const serviceService = yield* LaundryServiceService
        const findFn =
          urlParams.include_inactive === 'true'
            ? serviceService.findAll()
            : serviceService.findActive()
        return yield* findFn.pipe(
          Effect.catchTags({
            SqlError: () => new RetrieveDataEror({ message: 'failed get active laundry service' }),
          })
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
          Effect.catchTags({
            SqlError: (error) => new ValidationError({ message: error.message }),
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

        return yield* serviceService.update(ServiceId.make(id), payload).pipe(
          Effect.catchTags({
            ServiceNotFound: () =>
              new ServiceNotFound({ message: `Service not found with id: ${id}` }),
            SqlError: (cause) => new UnprocessibleEntity({ message: cause.message }),
          })
        )
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
          Effect.map(() => SuccessDeleteService.make({ message: 'Success delete services' })),
          Effect.catchTags({
            ServiceNotFound: () => new UpdateDataEror({ message: 'Failed remove services' }),
            SqlError: () => new UpdateDataEror({ message: 'Failed remove services' }),
          })
        )
      })
    )
)
