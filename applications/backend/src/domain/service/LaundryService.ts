import { Schema } from "effect"

export const UnitType = Schema.Literal("kg", "set")
export type UnitType = typeof UnitType.Type

export class LaundryService extends Schema.Class<LaundryService>("LaundryService")({
  id: Schema.UUID,
  name: Schema.String.pipe(Schema.nonEmptyString()),
  price: Schema.BigDecimal,
  unitType: UnitType,
  isActive: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export class CreateLaundryServiceInput extends Schema.Class<CreateLaundryServiceInput>("CreateLaundryServiceInput")({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  price: Schema.BigDecimal,
  unitType: UnitType,
}) {}

export class UpdateLaundryServiceInput extends Schema.Class<UpdateLaundryServiceInput>("UpdateLaundryServiceInput")({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  price: Schema.optional(Schema.BigDecimal),
  unitType: Schema.optional(UnitType),
  isActive: Schema.optional(Schema.Boolean),
}) {}
