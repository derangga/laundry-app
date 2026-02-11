import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { CustomerId } from './Customer.js'
import { UserId } from './User.js'

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
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {}

export class CreateOrderInput extends Schema.Class<CreateOrderInput>('CreateOrderInput')({
  customer_id: CustomerId,
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
