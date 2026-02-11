import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { OrderId } from './Order.js'
import { ServiceId } from './LaundryService.js'

export const OrderItemId = Schema.String.pipe(Schema.brand('OrderItemId'))
export type OrderItemId = typeof OrderItemId.Type

export class OrderItem extends Model.Class<OrderItem>('OrderItem')({
  id: Model.Generated(OrderItemId),
  order_id: OrderId,
  service_id: ServiceId,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
  created_at: Model.DateTimeInsert,
}) {}

export class CreateOrderItemInput extends Schema.Class<CreateOrderItemInput>(
  'CreateOrderItemInput'
)({
  service_id: ServiceId,
  quantity: Schema.Number,
}) {}
