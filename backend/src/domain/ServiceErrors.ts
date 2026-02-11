import { Data } from 'effect'

export class ServiceNotFound extends Data.TaggedError('ServiceNotFound')<{
  serviceId: string
}> {}

export class ServiceAlreadyExists extends Data.TaggedError('ServiceAlreadyExists')<{
  name: string
}> {}

export class InvalidServiceUnit extends Data.TaggedError('InvalidServiceUnit')<{
  unitType: string
}> {}
