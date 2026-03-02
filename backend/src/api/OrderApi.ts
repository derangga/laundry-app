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
} from '@domain/http/HttpErrors'
import { AuthMiddleware } from '@middleware/AuthMiddleware'

const OrderIdParam = Schema.Struct({ id: Schema.String })

export const OrderGroup = HttpApiGroup.make('Orders')
  .add(
    HttpApiEndpoint.post('createWalkIn', '/api/orders/walk-in')
      .setPayload(CreateWalkInOrderInput)
      .addSuccess(OrderResponse)
      .addError(CustomerAlreadyExists)
      .addError(EmptyOrderError)
      .addError(ValidationError)
  )
  .add(
    HttpApiEndpoint.post('create', '/api/orders')
      .setPayload(CreateOrderInput)
      .addSuccess(OrderResponse)
      .addError(ValidationError)
      .addError(EmptyOrderError)
  )
  .add(
    HttpApiEndpoint.get('list', '/api/orders')
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
  )
  .add(
    HttpApiEndpoint.put('updatePayment', '/api/orders/:id/payment')
      .setPath(OrderIdParam)
      .setPayload(UpdatePaymentStatusInput)
      .addSuccess(OrderResponse)
      .addError(OrderNotFound)
      .addError(ValidationError)
  )
  .middlewareEndpoints(AuthMiddleware)
