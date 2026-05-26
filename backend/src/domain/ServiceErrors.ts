import { Schema } from 'effect'

export class ServiceNotFound extends Schema.TaggedError<ServiceNotFound>()('ServiceNotFound', {
  serviceId: Schema.String,
}) {}

export class ServiceAlreadyExists extends Schema.TaggedError<ServiceAlreadyExists>()(
  'ServiceAlreadyExists',
  {
    name: Schema.String,
  }
) {}

export class InvalidServiceUnit extends Schema.TaggedError<InvalidServiceUnit>()(
  'InvalidServiceUnit',
  {
    unitType: Schema.String,
  }
) {}
