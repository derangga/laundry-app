import { Schema } from 'effect'

import { DecimalNumber } from './common/decimal-number.js'
import { DateTimeUtcString } from './common/datetime.js'

/**
 * Branded type for Laundry Service IDs.
 * Ensures type safety when working with service identifiers.
 */
export const ServiceId = Schema.String.pipe(Schema.brand('ServiceId'))
export type ServiceId = typeof ServiceId.Type

/**
 * Unit type enumeration for laundry services.
 * - `kg`: Weight-based pricing (e.g., per kilogram)
 * - `set`: Item-based pricing (e.g., per piece or set)
 */
export const UnitType = Schema.Literal('kg', 'set')
export type UnitType = typeof UnitType.Type

/**
 * Input schema for creating a new laundry service.
 * Requires service name, price, and unit type.
 */
export class CreateLaundryServiceInput extends Schema.Class<CreateLaundryServiceInput>(
  'CreateLaundryServiceInput'
)({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  price: Schema.Number,
  unit_type: UnitType,
}) {}

/**
 * Input schema for updating laundry service information.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateLaundryServiceInput extends Schema.Class<UpdateLaundryServiceInput>(
  'UpdateLaundryServiceInput'
)({
  name: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  price: Schema.optional(Schema.Number),
  unit_type: Schema.optional(UnitType),
  is_active: Schema.optional(Schema.Boolean),
}) {}

/**
 * Active service information schema.
 * Contains essential service data for active services only.
 */
export class ActiveServiceInfo extends Schema.Class<ActiveServiceInfo>('ActiveServiceInfo')({
  id: ServiceId,
  name: Schema.String,
  price: DecimalNumber,
  unit_type: UnitType,
}) {}

/**
 * Full laundry service response schema.
 * Contains all service information including active status and timestamps.
 */
export class LaundryServiceResponse extends Schema.Class<LaundryServiceResponse>(
  'LaundryServiceResponse'
)({
  id: ServiceId,
  name: Schema.String,
  price: DecimalNumber,
  unit_type: UnitType,
  is_active: Schema.Boolean,
  created_at: DateTimeUtcString,
  updated_at: DateTimeUtcString,
}) {}

/**
 * Service deletion success response schema.
 * Contains a confirmation message after successful deletion.
 */
export class SuccessDeleteService extends Schema.Class<SuccessDeleteService>('SuccessDeleteService')({
  message: Schema.String,
}) {}
