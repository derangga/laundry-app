import { Schema } from 'effect'

import { DecimalNumber } from './common/decimal-number.js'
import { DateTimeUtcString } from './common/datetime.js'
import { CustomerId } from './customer.js'
import { ServiceId, UnitType } from './service.js'
import { UserId } from './user.js'

/**
 * Branded type for Order IDs.
 * Ensures type safety when working with order identifiers.
 */
export const OrderId = Schema.String.pipe(Schema.brand('OrderId'))
export type OrderId = typeof OrderId.Type

/**
 * Branded type for Order Item IDs.
 * Ensures type safety when working with order item identifiers.
 */
export const OrderItemId = Schema.String.pipe(Schema.brand('OrderItemId'))
export type OrderItemId = typeof OrderItemId.Type

/**
 * Order status enumeration.
 * - `received`: Order has been received but not started
 * - `in_progress`: Order is being processed
 * - `ready`: Order is complete and ready for pickup/delivery
 * - `delivered`: Order has been delivered to customer
 */
export const OrderStatus = Schema.Literal('received', 'in_progress', 'ready', 'delivered')
export type OrderStatus = typeof OrderStatus.Type

/**
 * Payment status enumeration.
 * - `paid`: Payment has been received
 * - `unpaid`: Payment is pending
 */
export const PaymentStatus = Schema.Literal('paid', 'unpaid')
export type PaymentStatus = typeof PaymentStatus.Type

/**
 * Input schema for creating an order item.
 * Represents a single service within an order.
 */
export class CreateOrderItemInput extends Schema.Class<CreateOrderItemInput>('CreateOrderItemInput')({
  service_id: ServiceId,
  quantity: Schema.Number,
}) {}

/**
 * Input schema for creating a walk-in order.
 * Creates a new customer and order in one step.
 * If the phone already exists, the caller should use the regular POST /api/orders instead.
 */
export class CreateWalkInOrderInput extends Schema.Class<CreateWalkInOrderInput>(
  'CreateWalkInOrderInput'
)({
  customer_name: Schema.String.pipe(Schema.nonEmptyString()),
  customer_phone: Schema.String.pipe(Schema.nonEmptyString()),
  customer_address: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  items: Schema.Array(CreateOrderItemInput),
  payment_status: Schema.optionalWith(PaymentStatus, { default: () => 'unpaid' as const }),
}) {}

/**
 * Input schema for creating a new order.
 * Contains customer, items, creator, and optional payment status.
 */
export class CreateOrderInput extends Schema.Class<CreateOrderInput>('CreateOrderInput')({
  customer_id: CustomerId,
  items: Schema.Array(CreateOrderItemInput),
  created_by: UserId,
  payment_status: Schema.optionalWith(PaymentStatus, { default: () => 'unpaid' as const }),
}) {}

/**
 * Input schema for updating order status.
 * Used to move order through workflow stages.
 */
export class UpdateOrderStatusInput extends Schema.Class<UpdateOrderStatusInput>(
  'UpdateOrderStatusInput'
)({
  status: OrderStatus,
}) {}

/**
 * Input schema for updating payment status.
 * Used to mark orders as paid or unpaid.
 */
export class UpdatePaymentStatusInput extends Schema.Class<UpdatePaymentStatusInput>(
  'UpdatePaymentStatusInput'
)({
  payment_status: PaymentStatus,
}) {}

/**
 * Order with complete details schema.
 * Includes customer and creator information along with order data.
 */
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
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

/**
 * Minimal order information schema.
 * Used for displaying order data in lists or summaries.
 */
export class OrderSummary extends Schema.Class<OrderSummary>('OrderSummary')({
  id: OrderId,
  order_number: Schema.String,
  total_price: DecimalNumber,
  payment_status: PaymentStatus,
  created_at: DateTimeUtcString,
}) {}

/**
 * Order item with service details schema.
 * Includes service information and pricing for each line item.
 */
export class OrderItemWithService extends Schema.Class<OrderItemWithService>('OrderItemWithService')({
  id: OrderItemId,
  order_id: OrderId,
  service_id: ServiceId,
  service_name: Schema.String,
  unit_type: UnitType,
  quantity: DecimalNumber,
  price_at_order: DecimalNumber,
  subtotal: DecimalNumber,
  created_at: DateTimeUtcString,
}) {}

/**
 * Basic order response schema.
 * Contains core order information without item details.
 */
export class OrderResponse extends Schema.Class<OrderResponse>('OrderResponse')({
  id: Schema.String,
  order_number: Schema.String,
  customer_id: Schema.String,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: Schema.Number,
  created_by: Schema.String,
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

/**
 * Order item response schema.
 * Contains item-level pricing and quantity information.
 */
export class OrderItemResponse extends Schema.Class<OrderItemResponse>('OrderItemResponse')({
  id: Schema.String,
  service_id: Schema.String,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
}) {}

/**
 * Complete order response with items schema.
 * Includes full order data with all order items.
 */
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
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
  items: Schema.Array(OrderItemResponse),
}) {}
