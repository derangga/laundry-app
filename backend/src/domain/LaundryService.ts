export {
  ServiceId,
  UnitType,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
  ActiveServiceInfo,
  LaundryServiceResponse,
  SuccessDeleteService,
} from '@laundry-app/shared'

import { Schema } from 'effect'
import { Model } from '@effect/sql'
import { ServiceId, UnitType, DecimalNumber } from '@laundry-app/shared'

export class LaundryService extends Model.Class<LaundryService>('LaundryService')({
  id: Model.Generated(ServiceId),
  name: Schema.String,
  price: DecimalNumber,
  unit_type: UnitType,
  is_active: Schema.Boolean,
  created_at: Model.DateTimeInsertFromDate,
  updated_at: Model.DateTimeUpdateFromDate,
}) {}
