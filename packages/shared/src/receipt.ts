import { Schema } from 'effect'

import { DateTimeUtcString } from './common/datetime.js'
import { OrderStatus, PaymentStatus } from './order.js'
import { UnitType } from './service.js'

/**
 * Receipt item schema.
 * Represents a single line item on a receipt with service details and pricing.
 */
export class ReceiptItem extends Schema.Class<ReceiptItem>('ReceiptItem')({
  service_name: Schema.String,
  unit_type: UnitType,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
}) {}

/**
 * Complete receipt response schema.
 * Contains all information needed for receipt display or printing including
 * business details, order information, items, and totals.
 */
export class ReceiptResponse extends Schema.Class<ReceiptResponse>('ReceiptResponse')({
  business_name: Schema.String,
  business_address: Schema.NullOr(Schema.String),
  business_phone: Schema.NullOr(Schema.String),
  order_number: Schema.String,
  order_date: DateTimeUtcString,
  order_status: OrderStatus,
  customer_name: Schema.String,
  customer_phone: Schema.String,
  items: Schema.Array(ReceiptItem),
  total_price: Schema.Number,
  payment_status: PaymentStatus,
  staff_name: Schema.String,
}) {}
