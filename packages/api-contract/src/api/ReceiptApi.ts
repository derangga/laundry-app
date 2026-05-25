import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { ReceiptResponse } from '@laundry-app/shared'
import { OrderNotFound, UnprocessibleEntity } from '../errors.js'
import { AuthMiddleware } from '../middleware.js'

const OrderIdParam = Schema.Struct({ orderId: Schema.String })

export const ReceiptGroup = HttpApiGroup.make('Receipts')
  .add(
    HttpApiEndpoint.get('getReceipt', '/api/receipts/:orderId')
      .setPath(OrderIdParam)
      .addSuccess(ReceiptResponse)
      .addError(OrderNotFound)
      .addError(UnprocessibleEntity)
  )
  .middlewareEndpoints(AuthMiddleware)
