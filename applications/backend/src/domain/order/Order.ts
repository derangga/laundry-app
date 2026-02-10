import { Schema } from "effect"
import { Model } from "@effect/sql"

export const OrderStatus = Schema.Literal("received", "in_progress", "ready", "delivered")
export type OrderStatus = typeof OrderStatus.Type

export const PaymentStatus = Schema.Literal("paid", "unpaid")
export type PaymentStatus = typeof PaymentStatus.Type

export class Order extends Model.Class<Order>("Order")({
  id: Model.Generated(Schema.String),
  order_number: Schema.String,
  customer_id: Schema.String,
  status: OrderStatus,
  payment_status: PaymentStatus,
  total_price: Schema.Number,
  created_by: Schema.String,
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {}

export class CreateOrderInput extends Schema.Class<CreateOrderInput>("CreateOrderInput")({
  customer_id: Schema.String,
  payment_status: Schema.optionalWith(PaymentStatus, { default: () => "unpaid" as const }),
}) {}

export class UpdateOrderStatusInput extends Schema.Class<UpdateOrderStatusInput>("UpdateOrderStatusInput")({
  status: OrderStatus,
}) {}

export class UpdatePaymentStatusInput extends Schema.Class<UpdatePaymentStatusInput>("UpdatePaymentStatusInput")({
  payment_status: PaymentStatus,
}) {}
