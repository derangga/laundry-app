import { Effect } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'

export const findActiveServicesUseCaseImpl = Effect.gen(function* () {
  const repo = yield* ServiceRepository

  const execute = Effect.fn('FindActiveServicesUseCase.execute')(function* () {
    return yield* repo.findActive()
  })

  return { execute } as const
})

export class FindActiveServicesUseCase extends Effect.Service<FindActiveServicesUseCase>()(
  'FindActiveServicesUseCase',
  {
    accessors: true,
    effect: findActiveServicesUseCaseImpl,
    dependencies: [ServiceRepository.Default],
  }
) {}
