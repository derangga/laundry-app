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

export class Customer extends Model.Class<Customer>('Customer')({
  id: Model.Generated(CustomerId),
  name: Schema.String,
  phone: Schema.String,
  address: Schema.NullOr(Schema.String),
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}
