import { Schema } from 'effect'

/**
 * Analytics payment filter enumeration.
 * - `paid`: Show only paid orders
 * - `unpaid`: Show only unpaid orders
 * - `all`: Show all orders regardless of payment status
 */
export const AnalyticsPaymentFilter = Schema.Literal('paid', 'unpaid', 'all')
export type AnalyticsPaymentFilter = typeof AnalyticsPaymentFilter.Type

/**
 * Single week data point for analytics.
 * Contains revenue and order count for a specific week.
 */
export class WeeklyDataPoint extends Schema.Class<WeeklyDataPoint>('WeeklyDataPoint')({
  week_start: Schema.String,
  total_revenue: Schema.Number,
  order_count: Schema.Number,
}) {}

/**
 * Weekly analytics response schema.
 * Contains data points for multiple weeks with date range and filter information.
 */
export class WeeklyAnalyticsResponse extends Schema.Class<WeeklyAnalyticsResponse>(
  'WeeklyAnalyticsResponse'
)({
  weeks: Schema.Array(WeeklyDataPoint),
  start_date: Schema.String,
  end_date: Schema.String,
  payment_filter: AnalyticsPaymentFilter,
}) {}

/**
 * Dashboard statistics response schema.
 * Provides key metrics for the dashboard overview.
 */
export class DashboardStatsResponse extends Schema.Class<DashboardStatsResponse>(
  'DashboardStatsResponse'
)({
  todays_orders: Schema.Number,
  pending_payments: Schema.Number,
  weekly_revenue: Schema.Number,
  total_customers: Schema.Number,
}) {}
