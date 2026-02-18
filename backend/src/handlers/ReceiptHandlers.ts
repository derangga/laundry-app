import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { ReceiptService } from '@usecase/receipt/ReceiptService'
import { OrderId } from '@domain/Order'
import { InternalServerError, OrderNotFound } from '@domain/http/HttpErrors'

export const ReceiptHandlersLive = HttpApiBuilder.group(AppApi, 'Receipts', (handlers) =>
  handlers.handle('getReceipt', ({ path }) =>
    Effect.gen(function* () {
      const receiptService = yield* ReceiptService

      const receipt = yield* receiptService.generateReceipt(OrderId.make(path.orderId)).pipe(
        Effect.catchTags({
          OrderNotFound: () =>
            new OrderNotFound({ message: 'Failed to generate receipt because order not found' }),
          SqlError: () => new InternalServerError({ message: 'Database operation failed' }),
        })
      )

      return receipt
    })
  )
)
