import { Schema } from 'effect'
import { Model } from '@effect/sql'

export const CustomerId = Schema.String.pipe(Schema.brand('CustomerId'))
export type CustomerId = typeof CustomerId.Type

export class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(CustomerId),
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Model.DateTimeInsert,
  updated_at: Model.DateTimeUpdate,
}) {}

export class CreateCustomerInput extends Schema.Class<CreateCustomerInput>('CreateCustomerInput')({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  phone: Schema.String.pipe(Schema.nonEmptyString()),
  address: Schema.NullOr(Schema.String),
}) {}

export class UpdateCustomerInput extends Schema.Class<UpdateCustomerInput>('UpdateCustomerInput')({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  phone: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  address: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

export class CustomerSummary extends Schema.Class<CustomerSummary>('CustomerSummary')({
  id: CustomerId,
  name: Schema.String,
  phone: Schema.String,
}) {}
