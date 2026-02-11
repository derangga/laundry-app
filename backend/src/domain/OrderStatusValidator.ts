import { Effect } from 'effect'
import { OrderStatus } from './Order.js'
import { InvalidOrderTransition } from './OrderErrors.js'

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  received: ['in_progress'],
  in_progress: ['ready'],
  ready: ['delivered'],
  delivered: [], // Terminal state
}

export const validateStatusTransition = (
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): Effect.Effect<void, InvalidOrderTransition> => {
  const allowedStatuses = validTransitions[currentStatus]

  if (!allowedStatuses.includes(newStatus)) {
    return Effect.fail(
      new InvalidOrderTransition({
        from: currentStatus,
        to: newStatus,
      })
    )
  }

  return Effect.void
}
