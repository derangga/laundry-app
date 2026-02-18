import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { ReceiptResponse } from '@domain/Receipt'
import { InternalServerError, OrderNotFound } from '@domain/http/HttpErrors'
import { AuthMiddleware } from '@middleware/AuthMiddleware'

const OrderIdParam = Schema.Struct({ orderId: Schema.String })

export const ReceiptGroup = HttpApiGroup.make('Receipts')
  .add(
    HttpApiEndpoint.get('getReceipt', '/api/receipts/:orderId')
      .setPath(OrderIdParam)
      .addSuccess(ReceiptResponse)
      .addError(OrderNotFound)
      .addError(InternalServerError)
  )
  .middlewareEndpoints(AuthMiddleware)
