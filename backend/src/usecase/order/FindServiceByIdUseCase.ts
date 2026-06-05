import { Effect, Option } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { ServiceNotFound } from '@domain/ServiceErrors'
import type { ServiceId } from '@domain/LaundryService'

export const findServiceByIdUseCaseImpl = Effect.gen(function* () {
  const repo = yield* ServiceRepository

  const execute = Effect.fn('FindServiceByIdUseCase.execute')(function* (id: ServiceId) {
    const serviceOption = yield* repo.findById(id)

    if (Option.isNone(serviceOption)) {
      return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
    }

    return serviceOption.value
  })

  return { execute } as const
})

export class FindServiceByIdUseCase extends Effect.Service<FindServiceByIdUseCase>()(
  'FindServiceByIdUseCase',
  {
    accessors: true,
    effect: findServiceByIdUseCaseImpl,
    dependencies: [ServiceRepository.Default],
  }
) {}
