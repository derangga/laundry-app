import { Schema } from "effect"
import { Model } from "@effect/sql"

export class OrderItem extends Model.Class<OrderItem>("OrderItem")({
  id: Model.Generated(Schema.String),
  order_id: Schema.String,
  service_id: Schema.String,
  quantity: Schema.Number,
  price_at_order: Schema.Number,
  subtotal: Schema.Number,
  created_at: Model.DateTimeInsert,
}) {}

export class CreateOrderItemInput extends Schema.Class<CreateOrderItemInput>("CreateOrderItemInput")({
  service_id: Schema.String,
  quantity: Schema.Number,
}) {}
