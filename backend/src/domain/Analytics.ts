export {
  AnalyticsPaymentFilter,
  WeeklyDataPoint,
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
} from '@laundry-app/shared'

import { Schema } from 'effect'
import { DecimalNumber } from '@laundry-app/shared'

export class WeeklyRow extends Schema.Class<WeeklyRow>('WeeklyRow')({
  week_start: Schema.DateFromSelf,
  total_revenue: DecimalNumber,
  order_count: DecimalNumber,
}) {}
