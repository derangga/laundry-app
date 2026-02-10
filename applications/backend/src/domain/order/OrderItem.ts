import { Schema } from "effect"

export class OrderItem extends Schema.Class<OrderItem>("OrderItem")({
  id: Schema.UUID,
  orderId: Schema.UUID,
  serviceId: Schema.UUID,
  quantity: Schema.BigDecimal,
  priceAtOrder: Schema.BigDecimal,
  subtotal: Schema.BigDecimal,
  createdAt: Schema.DateTimeUtc,
}) {}

export class CreateOrderItemInput extends Schema.Class<CreateOrderItemInput>("CreateOrderItemInput")({
  serviceId: Schema.UUID,
  quantity: Schema.BigDecimal,
}) {}
