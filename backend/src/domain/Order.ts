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
import { ServiceId, DecimalNumber } from '@laundry-app/shared'

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

export class OrderFilterOptions extends Schema.Class<OrderFilterOptions>('OrderFilterOptions')({
  customer_id: Schema.Option(CustomerId),
  status: Schema.Option(OrderStatus),
  payment_status: Schema.Option(PaymentStatus),
  start_date: Schema.Option(Schema.Date),
  end_date: Schema.Option(Schema.Date),
  limit: Schema.Option(Schema.Number),
  offset: Schema.Option(Schema.Number),
}) {}
