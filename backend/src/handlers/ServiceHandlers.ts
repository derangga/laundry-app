import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { FindActiveServicesUseCase } from 'src/usecase/order/FindActiveServicesUseCase'
import { FindAllServicesUseCase } from 'src/usecase/order/FindAllServicesUseCase'
import { CreateServiceUseCase } from 'src/usecase/order/CreateServiceUseCase'
import { UpdateServiceUseCase } from 'src/usecase/order/UpdateServiceUseCase'
import { SoftDeleteServiceUseCase } from 'src/usecase/order/SoftDeleteServiceUseCase'
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
        const findActive = yield* FindActiveServicesUseCase
        const findAll = yield* FindAllServicesUseCase
        const findFn =
          urlParams.include_inactive === 'true' ? findAll.execute() : findActive.execute()
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

        const createService = yield* CreateServiceUseCase
        return yield* createService.execute(payload).pipe(
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

        const updateService = yield* UpdateServiceUseCase

        return yield* updateService.execute(ServiceId.make(id), payload).pipe(
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

        const softDeleteService = yield* SoftDeleteServiceUseCase
        return yield* softDeleteService.execute(ServiceId.make(id)).pipe(
          Effect.map(() => SuccessDeleteService.make({ message: 'Success delete services' })),
          Effect.catchTags({
            ServiceNotFound: () => new UpdateDataEror({ message: 'Failed remove services' }),
            SqlError: () => new UpdateDataEror({ message: 'Failed remove services' }),
          })
        )
      })
    )
)
