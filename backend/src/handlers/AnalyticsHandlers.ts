import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { AppApi } from '@api/AppApi'
import { AnalyticsService } from 'src/usecase/analytics/AnalyticsService'
import { AnalyticsPaymentFilter } from '@domain/Analytics'
import { ValidationError, InternalServerError } from '@domain/http/HttpErrors'

/**
 * Compute start/end dates from a predefined range name.
 */
const computeDateRange = (range: string): { start: Date; end: Date } => {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 1) // exclusive end

  switch (range) {
    case 'last_4_weeks': {
      const start = new Date(now)
      start.setDate(start.getDate() - 28)
      return { start, end }
    }
    case 'last_12_weeks': {
      const start = new Date(now)
      start.setDate(start.getDate() - 84)
      return { start, end }
    }
    case 'last_6_months': {
      const start = new Date(now)
      start.setMonth(start.getMonth() - 6)
      return { start, end }
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end }
    }
    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1)
      const yearEnd = new Date(now.getFullYear(), 0, 1)
      return { start, end: yearEnd }
    }
    default: {
      // Default: last 12 weeks
      const start = new Date(now)
      start.setDate(start.getDate() - 84)
      return { start, end }
    }
  }
}

export const AnalyticsHandlersLive = HttpApiBuilder.group(AppApi, 'Analytics', (handlers) =>
  handlers
    .handle('weekly', ({ urlParams }) =>
      Effect.gen(function* () {
        const analyticsService = yield* AnalyticsService

        // payment_status already type-safe from schema; undefined → default to 'all'
        const paymentFilter: AnalyticsPaymentFilter = urlParams.payment_status ?? 'all'

        let startDate: Date
        let endDate: Date

        if (urlParams.start_date && urlParams.end_date) {
          startDate = new Date(urlParams.start_date)
          endDate = new Date(urlParams.end_date)

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return yield* Effect.fail(
              new ValidationError({
                message: 'Invalid date format. Use ISO date strings (YYYY-MM-DD).',
                field: 'start_date',
              })
            )
          }
          if (startDate >= endDate) {
            return yield* Effect.fail(
              new ValidationError({
                message: 'end_date must be after start_date.',
                field: 'end_date',
              })
            )
          }
        } else {
          const { start, end } = computeDateRange(urlParams.range ?? 'last_12_weeks')
          startDate = start
          endDate = end
        }

        return yield* analyticsService
          .getWeeklyAnalytics(startDate, endDate, paymentFilter)
          .pipe(
            Effect.catchTag(
              'SqlError',
              () => new InternalServerError({ message: 'Database operation failed' })
            )
          )
      })
    )
    .handle('dashboard', () =>
      Effect.gen(function* () {
        const analyticsService = yield* AnalyticsService
        return yield* analyticsService
          .getDashboardStats()
          .pipe(
            Effect.catchTag(
              'SqlError',
              () => new InternalServerError({ message: 'Database operation failed' })
            )
          )
      })
    )
)
