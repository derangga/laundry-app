import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { CustomerId } from './Customer.js'
import { UserId } from './User.js'
import { CreateOrderItemInput } from './OrderItem.js'

export const OrderId = Schema.String.pipe(Schema.brand('OrderId'))
export type OrderId = typeof OrderId.Type

export const OrderStatus = Schema.Literal('received', 'in_progress', 'ready', 'delivered')
export type OrderStatus = typeof OrderStatus.Type

export const PaymentStatus = Schema.Literal('paid', 'unpaid')
export type PaymentStatus = typeof PaymentStatus.Type

export class Order extends Model.Class<Order>('Order')({
  id: Model.Generated(OrderId),
  order_number: Schema.String,
  customer_id: CustomerId,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: Schema.Number,
  created_by: UserId,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}

export class CreateOrderInput extends Schema.Class<CreateOrderInput>('CreateOrderInput')({
  customer_id: CustomerId,
  items: Schema.Array(CreateOrderItemInput),
  created_by: UserId,
  payment_status: Schema.optionalWith(PaymentStatus, { default: () => 'unpaid' as const }),
}) {}

export class UpdateOrderStatusInput extends Schema.Class<UpdateOrderStatusInput>(
  'UpdateOrderStatusInput'
)({
  status: OrderStatus,
}) {}

export class UpdatePaymentStatusInput extends Schema.Class<UpdatePaymentStatusInput>(
  'UpdatePaymentStatusInput'
)({
  payment_status: PaymentStatus,
}) {}

export class OrderWithDetails extends Schema.Class<OrderWithDetails>('OrderWithDetails')({
  id: OrderId,
  order_number: Schema.String,
  customer_id: CustomerId,
  customer_name: Schema.String,
  customer_phone: Schema.String,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: Schema.Number,
  created_by: UserId,
  created_by_name: Schema.String,
  created_at: Schema.DateTimeUtc,
  updated_at: Schema.DateTimeUtc,
}) {}

export class OrderSummary extends Schema.Class<OrderSummary>('OrderSummary')({
  id: OrderId,
  order_number: Schema.String,
  total_price: Schema.Number,
  payment_status: PaymentStatus,
  created_at: Schema.DateTimeUtc,
}) {}
