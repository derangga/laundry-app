import { Schema } from "effect"
import { Model } from "@effect/sql"

export const UnitType = Schema.Literal("kg", "set")
export type UnitType = typeof UnitType.Type

export class LaundryService extends Model.Class<LaundryService>("LaundryService")({
  id: Model.Generated(Schema.String),
  name: Schema.String,
  price: Schema.Number,
  unit_type: UnitType,
  is_active: Schema.Boolean,
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {}

export class CreateLaundryServiceInput extends Schema.Class<CreateLaundryServiceInput>("CreateLaundryServiceInput")({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  price: Schema.Number,
  unit_type: UnitType,
}) {}

export class UpdateLaundryServiceInput extends Schema.Class<UpdateLaundryServiceInput>("UpdateLaundryServiceInput")({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  price: Schema.optional(Schema.Number),
  unit_type: Schema.optional(UnitType),
  is_active: Schema.optional(Schema.Boolean),
}) {}
