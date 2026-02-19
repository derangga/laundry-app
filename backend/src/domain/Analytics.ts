import { Schema } from 'effect'
import { DecimalNumber } from './common/DecimalNumber'

// Raw DB row from the weekly aggregation SQL query
export class WeeklyRow extends Schema.Class<WeeklyRow>('WeeklyRow')({
  week_start: Schema.DateFromSelf, // PG ::date → JS Date
  total_revenue: DecimalNumber, // PG DECIMAL → string → number
  order_count: DecimalNumber, // PG BIGINT/COUNT → string → number
}) {}

// Filter enum — 'all' means no payment_status WHERE clause
export const AnalyticsPaymentFilter = Schema.Literal('paid', 'unpaid', 'all')
export type AnalyticsPaymentFilter = typeof AnalyticsPaymentFilter.Type

// Single week data point returned by the weekly endpoint
export class WeeklyDataPoint extends Schema.Class<WeeklyDataPoint>('WeeklyDataPoint')({
  week_start: Schema.String, // ISO date string e.g. "2026-02-02"
  total_revenue: Schema.Number,
  order_count: Schema.Number,
}) {}

// Response for GET /api/analytics/weekly
export class WeeklyAnalyticsResponse extends Schema.Class<WeeklyAnalyticsResponse>(
  'WeeklyAnalyticsResponse'
)({
  weeks: Schema.Array(WeeklyDataPoint),
  start_date: Schema.String,
  end_date: Schema.String,
  payment_filter: AnalyticsPaymentFilter,
}) {}

// Response for GET /api/analytics/dashboard
export class DashboardStatsResponse extends Schema.Class<DashboardStatsResponse>(
  'DashboardStatsResponse'
)({
  todays_orders: Schema.Number,
  pending_payments: Schema.Number,
  weekly_revenue: Schema.Number,
  total_customers: Schema.Number,
}) {}
