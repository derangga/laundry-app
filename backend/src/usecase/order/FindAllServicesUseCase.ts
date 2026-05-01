import { Effect } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'

export const findAllServicesUseCaseImpl = Effect.gen(function* () {
  const repo = yield* ServiceRepository

  const execute = Effect.fn('FindAllServicesUseCase.execute')(function* () {
    return yield* repo.findAll()
  })

  return { execute } as const
})

export class FindAllServicesUseCase extends Effect.Service<FindAllServicesUseCase>()(
  'FindAllServicesUseCase',
  {
    accessors: true,
    effect: findAllServicesUseCaseImpl,
    dependencies: [ServiceRepository.Default],
  }
) {}
