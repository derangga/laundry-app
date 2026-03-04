import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import {
  CreateOrderInput,
  CreateWalkInOrderInput,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
  OrderResponse,
  OrderWithItemsResponse,
  OrderWithDetails,
} from '@domain/Order'
import {
  OrderNotFound,
  InvalidOrderStatus,
  EmptyOrderError,
  CustomerAlreadyExists,
  ValidationError,
  UnprocessibleEntity,
} from '@domain/http/HttpErrors'
import { AuthMiddleware } from '@middleware/AuthMiddleware'

const OrderIdParam = Schema.Struct({ id: Schema.String })

const ListOrdersParams = Schema.Struct({
  customer_id: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  payment_status: Schema.optional(Schema.String),
  order_number: Schema.optional(Schema.String),
  start_date: Schema.optional(Schema.String),
  end_date: Schema.optional(Schema.String),
})

export const OrderGroup = HttpApiGroup.make('Orders')
  .add(
    HttpApiEndpoint.post('createWalkIn', '/api/orders/walk-in')
      .setPayload(CreateWalkInOrderInput)
      .addSuccess(OrderResponse)
      .addError(CustomerAlreadyExists)
      .addError(EmptyOrderError)
      .addError(ValidationError)
      .addError(UnprocessibleEntity)
  )
  .add(
    HttpApiEndpoint.post('create', '/api/orders')
      .setPayload(CreateOrderInput)
      .addSuccess(OrderResponse)
      .addError(ValidationError)
      .addError(EmptyOrderError)
      .addError(UnprocessibleEntity)
  )
  .add(
    HttpApiEndpoint.get('list', '/api/orders')
      .setUrlParams(ListOrdersParams)
      .addSuccess(Schema.Array(OrderWithDetails))
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.get('getById', '/api/orders/:id')
      .setPath(OrderIdParam)
      .addSuccess(OrderWithItemsResponse)
      .addError(OrderNotFound)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.put('updateStatus', '/api/orders/:id/status')
      .setPath(OrderIdParam)
      .setPayload(UpdateOrderStatusInput)
      .addSuccess(OrderResponse)
      .addError(OrderNotFound)
      .addError(InvalidOrderStatus)
      .addError(ValidationError)
      .addError(UnprocessibleEntity)
  )
  .add(
    HttpApiEndpoint.put('updatePayment', '/api/orders/:id/payment')
      .setPath(OrderIdParam)
      .setPayload(UpdatePaymentStatusInput)
      .addSuccess(OrderResponse)
      .addError(OrderNotFound)
      .addError(UnprocessibleEntity)
  )
  .middlewareEndpoints(AuthMiddleware)
