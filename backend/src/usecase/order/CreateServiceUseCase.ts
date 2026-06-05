import { Effect } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import type { CreateLaundryServiceInput } from '@domain/LaundryService'

export const createServiceUseCaseImpl = Effect.gen(function* () {
  const repo = yield* ServiceRepository

  const execute = Effect.fn('CreateServiceUseCase.execute')(function* (
    data: CreateLaundryServiceInput
  ) {
    return yield* repo.insert(data)
  })

  return { execute } as const
})

export class CreateServiceUseCase extends Effect.Service<CreateServiceUseCase>()(
  'CreateServiceUseCase',
  {
    accessors: true,
    effect: createServiceUseCaseImpl,
    dependencies: [ServiceRepository.Default],
  }
) {}
