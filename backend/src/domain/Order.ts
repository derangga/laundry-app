export {
  OrderId,
  OrderItemId,
  OrderStatus,
  PaymentStatus,
  CreateOrderItemInput,
  CreateOrderInput,
  CreateWalkInOrderInput,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
  OrderWithDetails,
  OrderSummary,
  OrderItemWithService,
  OrderResponse,
  OrderItemResponse,
  OrderWithItemsResponse,
} from '@laundry-app/shared'

import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { OrderId, OrderItemId, OrderStatus, PaymentStatus, CustomerId } from '@laundry-app/shared'
import { UserId } from '@laundry-app/shared'
import { ServiceId, DecimalNumber, UnitType } from '@laundry-app/shared'

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

export class OrderWithDetailsFromDb extends Schema.Class<OrderWithDetailsFromDb>(
  'OrderWithDetailsFromDb'
)({
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
  created_at: Schema.DateTimeUtcFromDate,
  updated_at: Schema.DateTimeUtcFromDate,
}) {}

export class OrderSummaryFromDb extends Schema.Class<OrderSummaryFromDb>('OrderSummaryFromDb')({
  id: OrderId,
  order_number: Schema.String,
  total_price: DecimalNumber,
  payment_status: PaymentStatus,
  created_at: Schema.DateTimeUtcFromDate,
}) {}

export class OrderItemWithServiceFromDb extends Schema.Class<OrderItemWithServiceFromDb>(
  'OrderItemWithServiceFromDb'
)({
  id: OrderItemId,
  order_id: OrderId,
  service_id: ServiceId,
  service_name: Schema.String,
  unit_type: UnitType,
  quantity: DecimalNumber,
  price_at_order: DecimalNumber,
  subtotal: DecimalNumber,
  created_at: Schema.DateTimeUtcFromDate,
}) {}

export class OrderFilterOptions extends Schema.Class<OrderFilterOptions>('OrderFilterOptions')({
  customer_id: Schema.Option(CustomerId),
  status: Schema.Option(OrderStatus),
  payment_status: Schema.Option(PaymentStatus),
  order_number: Schema.Option(Schema.String),
  start_date: Schema.Option(Schema.Date),
  end_date: Schema.Option(Schema.Date),
  limit: Schema.Option(Schema.Number),
  offset: Schema.Option(Schema.Number),
}) {}
