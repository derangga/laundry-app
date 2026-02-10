import { Schema } from "effect"

export const OrderStatus = Schema.Literal("received", "in_progress", "ready", "delivered")
export type OrderStatus = typeof OrderStatus.Type

export const PaymentStatus = Schema.Literal("paid", "unpaid")
export type PaymentStatus = typeof PaymentStatus.Type

export class Order extends Schema.Class<Order>("Order")({
  id: Schema.UUID,
  orderNumber: Schema.String.pipe(Schema.nonEmptyString()),
  customerId: Schema.UUID,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  totalPrice: Schema.BigDecimal,
  createdBy: Schema.UUID,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export class CreateOrderInput extends Schema.Class<CreateOrderInput>("CreateOrderInput")({
  customerId: Schema.UUID,
  paymentStatus: Schema.optionalWith(PaymentStatus, { default: () => "unpaid" as const }),
}) {}

export class UpdateOrderStatusInput extends Schema.Class<UpdateOrderStatusInput>("UpdateOrderStatusInput")({
  status: OrderStatus,
}) {}

export class UpdatePaymentStatusInput extends Schema.Class<UpdatePaymentStatusInput>("UpdatePaymentStatusInput")({
  paymentStatus: PaymentStatus,
}) {}
