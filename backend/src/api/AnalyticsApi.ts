import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'
import { WeeklyAnalyticsResponse, DashboardStatsResponse, AnalyticsPaymentFilter } from '@domain/Analytics'
import { ValidationError, Forbidden, InternalServerError } from '@domain/http/HttpErrors'
import { AuthAdminMiddleware } from 'src/middleware/AuthMiddleware'

const WeeklyUrlParams = Schema.Struct({
  payment_status: Schema.optional(AnalyticsPaymentFilter),
  range: Schema.optional(Schema.String),
  start_date: Schema.optional(Schema.String),
  end_date: Schema.optional(Schema.String),
})

export const AnalyticsGroup = HttpApiGroup.make('Analytics')
  .add(
    HttpApiEndpoint.get('weekly', '/api/analytics/weekly')
      .setUrlParams(WeeklyUrlParams)
      .addSuccess(WeeklyAnalyticsResponse)
      .addError(ValidationError)
      .addError(Forbidden)
      .addError(InternalServerError)
  )
  .add(
    HttpApiEndpoint.get('dashboard', '/api/analytics/dashboard')
      .addSuccess(DashboardStatsResponse)
      .addError(Forbidden)
      .addError(InternalServerError)
  )
  .middlewareEndpoints(AuthAdminMiddleware)
