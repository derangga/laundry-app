import { Effect, Option } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { ServiceNotFound } from '@domain/ServiceErrors'
import { UnitType, ServiceId } from '@domain/LaundryService'

interface CreateServiceData {
  name: string
  price: number
  unit_type: UnitType
}

interface UpdateServiceData {
  name?: string
  price?: number
  unit_type?: UnitType
}

export class LaundryServiceService extends Effect.Service<LaundryServiceService>()(
  'LaundryServiceService',
  {
    effect: Effect.gen(function* () {
      const repo = yield* ServiceRepository

      const findActive = () => repo.findActive()

      const findById = (id: string) =>
        Effect.gen(function* () {
          const serviceOption = yield* repo.findById(id as ServiceId)

          if (Option.isNone(serviceOption)) {
            return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
          }

          return serviceOption.value
        })

      const create = (data: CreateServiceData) => repo.insert(data)

      const update = (id: string, data: UpdateServiceData) =>
        Effect.gen(function* () {
          // Check if service exists
          yield* findById(id)

          // Update service
          yield* repo.update(id as ServiceId, data)
        })

      const softDelete = (id: string) =>
        Effect.gen(function* () {
          // Check if service exists
          yield* findById(id)

          // Soft delete (set is_active = false)
          yield* repo.softDelete(id as ServiceId)
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
