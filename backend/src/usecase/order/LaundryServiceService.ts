import { Effect, Option } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { ServiceNotFound } from '@domain/ServiceErrors'
import {
  ServiceId,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
} from '@domain/LaundryService'

export class LaundryServiceService extends Effect.Service<LaundryServiceService>()(
  'LaundryServiceService',
  {
    effect: Effect.gen(function* () {
      const repo = yield* ServiceRepository

      const findActive = () => repo.findActive()

      const findById = (id: ServiceId) =>
        Effect.gen(function* () {
          const serviceOption = yield* repo.findById(id)

          if (Option.isNone(serviceOption)) {
            return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
          }

          return serviceOption.value
        })

      const create = (data: CreateLaundryServiceInput) => repo.insert(data)

      const update = (id: ServiceId, data: UpdateLaundryServiceInput) =>
        Effect.gen(function* () {
          // Check if service exists
          yield* findById(id)

          // Update service
          yield* repo.update(id, data)
        })

      const softDelete = (id: ServiceId) =>
        Effect.gen(function* () {
          // Check if service exists
          yield* findById(id)

          // Soft delete (set is_active = false)
          yield* repo.softDelete(id)
        })

      return {
        findActive,
        findById,
        create,
        update,
        softDelete,
      }
    }),
    dependencies: [ServiceRepository.Default],
  }
) {}
