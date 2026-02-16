import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { CustomerId } from './Customer.js'
import { UserId } from './User.js'
import { ServiceId, UnitType } from './LaundryService.js'
import { DecimalNumber } from './common/DecimalNumber.js'

export const OrderId = Schema.String.pipe(Schema.brand('OrderId'))
export type OrderId = typeof OrderId.Type

export const OrderItemId = Schema.String.pipe(Schema.brand('OrderItemId'))
export type OrderItemId = typeof OrderItemId.Type

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
  total_price: DecimalNumber,
  created_by: UserId,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}

export class OrderItem extends Model.Class<OrderItem>('OrderItem')({
  id: Model.Generated(OrderItemId),
  order_id: OrderId,
  service_id: ServiceId,
  quantity: DecimalNumber,
  price_at_order: DecimalNumber,
  subtotal: DecimalNumber,
  created_at: Model.DateTimeInsertFromDate,
}) {}

export class CreateOrderItemInput extends Schema.Class<CreateOrderItemInput>(
  'CreateOrderItemInput'
)({
  service_id: ServiceId,
  quantity: Schema.Number,
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
  total_price: DecimalNumber,
  created_by: UserId,
  created_by_name: Schema.String,
  created_at: Schema.DateTimeUtc,
  updated_at: Schema.DateTimeUtc,
}) {}

export class OrderSummary extends Schema.Class<OrderSummary>('OrderSummary')({
  id: OrderId,
  order_number: Schema.String,
  total_price: DecimalNumber,
  payment_status: PaymentStatus,
  created_at: Schema.DateTimeUtc,
}) {}

export class OrderItemWithService extends Schema.Class<OrderItemWithService>(
  'OrderItemWithService'
)({
  id: OrderItemId,
  order_id: OrderId,
  service_id: ServiceId,
  service_name: Schema.String,
  unit_type: UnitType,
  quantity: DecimalNumber,
  price_at_order: DecimalNumber,
  subtotal: DecimalNumber,
  created_at: Schema.DateTimeUtc,
}) {}

// HTTP Response Models
export class OrderResponse extends Schema.Class<OrderResponse>('OrderResponse')({
  id: Schema.String,
  order_number: Schema.String,
  customer_id: Schema.String,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: Schema.Number,
  created_by: Schema.String,
  created_at: Schema.DateTimeUtc,
  updated_at: Schema.DateTimeUtc,
}) {}

export class OrderItemResponse extends Schema.Class<OrderItemResponse>('OrderItemResponse')({
  id: Schema.String,
  service_id: Schema.String,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
}) {}

export class OrderWithItemsResponse extends Schema.Class<OrderWithItemsResponse>(
  'OrderWithItemsResponse'
)({
  id: Schema.String,
  order_number: Schema.String,
  customer_id: Schema.String,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: Schema.Number,
  created_by: Schema.String,
  created_at: Schema.DateTimeUtc,
  updated_at: Schema.DateTimeUtc,
  items: Schema.Array(OrderItemResponse),
}) {}

export class OrderFilterOptions extends Schema.Class<OrderFilterOptions>('OrderFilterOptions')({
  customer_id: Schema.Option(CustomerId),
  status: Schema.Option(OrderStatus),
  payment_status: Schema.Option(PaymentStatus),
  start_date: Schema.Option(Schema.Date),
  end_date: Schema.Option(Schema.Date),
  limit: Schema.Option(Schema.Number),
  offset: Schema.Option(Schema.Number),
}) {}
