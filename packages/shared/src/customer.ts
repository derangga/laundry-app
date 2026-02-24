import { Schema } from 'effect'

import { DateTimeUtcString } from './common/datetime.js'

/**
 * Branded type for Customer IDs.
 * Ensures type safety when working with customer identifiers.
 */
export const CustomerId = Schema.String.pipe(Schema.brand('CustomerId'))
export type CustomerId = typeof CustomerId.Type

/**
 * Input schema for creating a new customer.
 * Address is optional and defaults to null if not provided.
 */
export class CreateCustomerInput extends Schema.Class<CreateCustomerInput>('CreateCustomerInput')({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  phone: Schema.String.pipe(Schema.nonEmptyString()),
  address: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
}) {}

/**
 * Input schema for updating customer information.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateCustomerInput extends Schema.Class<UpdateCustomerInput>('UpdateCustomerInput')({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  phone: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  address: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

/**
 * Full customer data response schema.
 * Contains all customer information including timestamps.
 */
export class CustomerResponse extends Schema.Class<CustomerResponse>('CustomerResponse')({
  id: CustomerId,
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

/**
 * Minimal customer information schema.
 * Used for displaying customer data in lists or dropdowns.
 */
export class CustomerSummary extends Schema.Class<CustomerSummary>('CustomerSummary')({
  id: CustomerId,
  name: Schema.String,
  phone: Schema.String,
}) {}
