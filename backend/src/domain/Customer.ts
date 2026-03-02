export {
  CustomerId,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerResponse,
  CustomerSummary,
} from '@laundry-app/shared'

import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { CustomerId } from '@laundry-app/shared'

// DB-specific decode schema — accepts raw Date objects from PostgreSQL and converts to DateTime.Utc
export const CustomerFromDb = Schema.Struct({
  id: CustomerId,
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Schema.DateTimeUtcFromDate,
  updated_at: Schema.DateTimeUtcFromDate,
})

export class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(CustomerId),
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}
