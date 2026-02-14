import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { DecimalNumber } from './common/DecimalNumber.js'

export const ServiceId = Schema.String.pipe(Schema.brand('ServiceId'))
export type ServiceId = typeof ServiceId.Type

export const UnitType = Schema.Literal('kg', 'set')
export type UnitType = typeof UnitType.Type

export class LaundryService extends Model.Class<LaundryService>('LaundryService')({
  id: Model.Generated(ServiceId),
  name: Schema.String,
  price: DecimalNumber,
  unit_type: UnitType,
  is_active: Schema.Boolean,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}

export class CreateLaundryServiceInput extends Schema.Class<CreateLaundryServiceInput>(
  'CreateLaundryServiceInput'
)({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  price: Schema.Number,
  unit_type: UnitType,
}) {}

export class UpdateLaundryServiceInput extends Schema.Class<UpdateLaundryServiceInput>(
  'UpdateLaundryServiceInput'
)({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  price: Schema.optional(Schema.Number),
  unit_type: Schema.optional(UnitType),
  is_active: Schema.optional(Schema.Boolean),
}) {}

export class ActiveServiceInfo extends Schema.Class<ActiveServiceInfo>('ActiveServiceInfo')({
  id: ServiceId,
  name: Schema.String,
  price: DecimalNumber,
  unit_type: UnitType,
}) {}

export class SuccessDeleteService extends Schema.Class<SuccessDeleteService>(
  'SuccessDeleteService'
)({
  message: Schema.String,
}) {}
