import { Effect } from 'effect'
import { ServiceRepository } from '@repositories/ServiceRepository'
import { FindServiceByIdUseCase } from './FindServiceByIdUseCase'
import type { ServiceId } from '@domain/LaundryService'

export const softDeleteServiceUseCaseImpl = Effect.gen(function* () {
  const repo = yield* ServiceRepository
  const findServiceByIdUseCase = yield* FindServiceByIdUseCase

  const execute = Effect.fn('SoftDeleteServiceUseCase.execute')(function* (id: ServiceId) {
    yield* findServiceByIdUseCase.execute(id)
    yield* repo.softDelete(id)
  })

  return { execute } as const
})

export class SoftDeleteServiceUseCase extends Effect.Service<SoftDeleteServiceUseCase>()(
  'SoftDeleteServiceUseCase',
  {
    accessors: true,
    effect: softDeleteServiceUseCaseImpl,
    dependencies: [ServiceRepository.Default, FindServiceByIdUseCase.Default],
  }
) {}
