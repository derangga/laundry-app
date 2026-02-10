import { Schema } from "effect"

export class Customer extends Schema.Class<Customer>("Customer")({
  id: Schema.UUID,
  name: Schema.String.pipe(Schema.nonEmptyString()),
  phone: Schema.String.pipe(Schema.nonEmptyString()),
  address: Schema.OptionFromNullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export class CreateCustomerInput extends Schema.Class<CreateCustomerInput>("CreateCustomerInput")({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  phone: Schema.String.pipe(Schema.nonEmptyString()),
  address: Schema.OptionFromNullOr(Schema.String),
}) {}

export class UpdateCustomerInput extends Schema.Class<UpdateCustomerInput>("UpdateCustomerInput")({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  phone: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  address: Schema.optional(Schema.OptionFromNullOr(Schema.String)),
}) {}
