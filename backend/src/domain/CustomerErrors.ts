import { Data } from 'effect'

export class CustomerNotFound extends Data.TaggedError('CustomerNotFound')<{
  phone: string
}> {}

export class CustomerAlreadyExists extends Data.TaggedError('CustomerAlreadyExists')<{
  phone: string
}> {}

export class InvalidPhoneNumber extends Data.TaggedError('InvalidPhoneNumber')<{
  phone: string
  reason: string
}> {}
