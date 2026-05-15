import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { GenerateReceiptUseCase } from '@usecase/receipt/GenerateReceiptUseCase'
import { OrderId } from '@domain/Order'
import { OrderNotFound, UnprocessibleEntity } from '@domain/http/HttpErrors'

export const ReceiptHandlersLive = HttpApiBuilder.group(AppApi, 'Receipts', (handlers) =>
  handlers.handle('getReceipt', ({ path }) =>
    Effect.gen(function* () {
      const receiptService = yield* GenerateReceiptUseCase

      const receipt = yield* receiptService.execute(OrderId.make(path.orderId)).pipe(
        Effect.catchTags({
          OrderNotFound: () =>
            new OrderNotFound({ message: 'Failed to generate receipt because order not found' }),
          SqlError: () => new UnprocessibleEntity({ message: 'Database operation failed' }),
        })
      )

      return receipt
    })
  )
)
