import { Schema } from 'effect'
import { DateTimeUtcString } from './common/DateTimeUtcString.js'
import { UnitType } from './LaundryService.js'
import { OrderStatus, PaymentStatus } from './Order.js'

export class ReceiptItem extends Schema.Class<ReceiptItem>('ReceiptItem')({
  service_name: Schema.String,
  unit_type: UnitType,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
}) {}

export class ReceiptResponse extends Schema.Class<ReceiptResponse>('ReceiptResponse')({
  // Business header
  business_name: Schema.String,
  business_address: Schema.NullOr(Schema.String),
  business_phone: Schema.NullOr(Schema.String),
  // Order info
  order_number: Schema.String,
  order_date: DateTimeUtcString,
  order_status: OrderStatus,
  // Customer info
  customer_name: Schema.String,
  customer_phone: Schema.String,
  // Items
  items: Schema.Array(ReceiptItem),
  // Pricing
  total_price: Schema.Number,
  // Payment
  payment_status: PaymentStatus,
  // Footer
  staff_name: Schema.String,
}) {}
