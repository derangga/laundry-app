import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import {
  CreateOrderInput,
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
  ValidationError,
} from '@domain/http/HttpErrors'
import { AuthMiddleware } from '@middleware/AuthMiddleware'

const OrderIdParam = Schema.Struct({ id: Schema.String })

/**
 * Order API Schema Definitions
 *
 * Defines the HTTP contract for order management endpoints:
 * - POST / - Create new order (requires authentication)
 * - GET / - List orders with optional filters (query params: customer_id, status, payment_status)
 * - GET /:id - Get order by ID with items
 * - PUT /:id/status - Update order status
 * - PUT /:id/payment - Update payment status
 *
 * All endpoints except list are protected by authentication middleware.
 */
export class OrderApi extends HttpApi.make('OrderApi').add(
  HttpApiGroup.make('Orders')
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
) {}
