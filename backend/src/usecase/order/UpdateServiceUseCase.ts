import { Effect, Option } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { FindServiceByIdUseCase } from './FindServiceByIdUseCase'
import { ServiceId, UpdateLaundryServiceInput } from '@domain/LaundryService'

export const updateServiceUseCaseImpl = Effect.gen(function* () {
  const repo = yield* ServiceRepository
  const findServiceByIdUseCase = yield* FindServiceByIdUseCase

  const execute = Effect.fn('UpdateServiceUseCase.execute')(function* (
    id: ServiceId,
    data: UpdateLaundryServiceInput
  ) {
    // Check if service exists (fails with ServiceNotFound otherwise)
    yield* findServiceByIdUseCase.execute(id)

    const result = yield* repo.update(id, data)
    return Option.getOrThrow(result)
  })

  return { execute } as const
})

export class UpdateServiceUseCase extends Effect.Service<UpdateServiceUseCase>()(
  'UpdateServiceUseCase',
  {
    accessors: true,
    effect: updateServiceUseCaseImpl,
    dependencies: [ServiceRepository.Default, FindServiceByIdUseCase.Default],
  }
) {}
