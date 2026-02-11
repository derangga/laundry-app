import { Data } from 'effect'

export class OrderNotFound extends Data.TaggedError('OrderNotFound')<{
  orderId: string
}> {}

export class InvalidOrderStatus extends Data.TaggedError('InvalidOrderStatus')<{
  currentStatus: string
  attemptedStatus: string
  reason: string
}> {}

export class InvalidOrderTransition extends Data.TaggedError('InvalidOrderTransition')<{
  from: string
  to: string
}> {}

export class OrderValidationError extends Data.TaggedError('OrderValidationError')<{
  errors: Array<{ field: string; message: string }>
}> {}

export class EmptyOrderError extends Data.TaggedError('EmptyOrderError')<{
  message: string
}> {}
