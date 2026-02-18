import { Effect, Option } from 'effect'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import {
  AnalyticsPaymentFilter,
  WeeklyDataPoint,
  WeeklyAnalyticsResponse,
  DashboardStatsResponse,
  WeeklyRow,
} from '@domain/Analytics'
import { PaymentStatus } from '@domain/Order'

export class AnalyticsService extends Effect.Service<AnalyticsService>()('AnalyticsService', {
  effect: Effect.gen(function* () {
    const analyticsRepo = yield* AnalyticsRepository

    /**
     * Zero-fill: ensure every Monday between startDate and endDate has a data point.
     * Weeks with no orders show as { total_revenue: 0, order_count: 0 }.
     */
    const zeroFillWeeks = (
      rows: readonly WeeklyRow[],
      startDate: Date,
      endDate: Date
    ): WeeklyDataPoint[] => {
      // Build a map of week_start ISO string → row data
      const dataMap = new Map<string, { total_revenue: number; order_count: number }>()
      for (const row of rows) {
        const key = row.week_start.toISOString().slice(0, 10)
        dataMap.set(key, {
          total_revenue: row.total_revenue,
          order_count: row.order_count,
        })
      }

      // Find the first Monday on or before startDate
      const result: WeeklyDataPoint[] = []
      const current = new Date(startDate)
      // Align to Monday (day 1)
      const day = current.getDay()
      const diff = day === 0 ? -6 : 1 - day
      current.setDate(current.getDate() + diff)

      while (current < endDate) {
        const key = current.toISOString().slice(0, 10)
        const data = dataMap.get(key)
        result.push(
          WeeklyDataPoint.make({
            week_start: key,
            total_revenue: data?.total_revenue ?? 0,
            order_count: data?.order_count ?? 0,
          })
        )
        current.setDate(current.getDate() + 7)
      }

      return result
    }

    const getWeeklyAnalytics = (
      startDate: Date,
      endDate: Date,
      paymentFilter: AnalyticsPaymentFilter
    ) =>
      Effect.gen(function* () {
        // Translate 'all' → Option.none(), 'paid'/'unpaid' → Option.some(value)
        const paymentStatusOption: Option.Option<PaymentStatus> =
          paymentFilter === 'all' ? Option.none() : Option.some(paymentFilter as PaymentStatus)

        const rows = yield* analyticsRepo.getWeeklyAggregation(
          startDate,
          endDate,
          paymentStatusOption
        )

        const weeks = zeroFillWeeks(rows, startDate, endDate)

        return WeeklyAnalyticsResponse.make({
          weeks,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
          payment_filter: paymentFilter,
        })
      })

    const getDashboardStats = () =>
      Effect.gen(function* () {
        const [todaysOrders, pendingPayments, weeklyRevenue, totalCustomers] = yield* Effect.all(
          [
            analyticsRepo.getTodaysOrderCount(),
            analyticsRepo.getPendingPaymentCount(),
            analyticsRepo.getWeeklyRevenue(),
            analyticsRepo.getTotalCustomerCount(),
          ],
          { concurrency: 4 }
        )

        return DashboardStatsResponse.make({
          todays_orders: todaysOrders,
          pending_payments: pendingPayments,
          weekly_revenue: weeklyRevenue,
          total_customers: totalCustomers,
        })
      })

    return {
      getWeeklyAnalytics,
      getDashboardStats,
    }
  }),
  dependencies: [AnalyticsRepository.Default],
}) {}
