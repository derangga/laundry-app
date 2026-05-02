import { Effect, Option } from 'effect'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { AnalyticsPaymentFilter, WeeklyAnalyticsResponse } from '@domain/Analytics'
import { PaymentStatus } from '@domain/Order'
import { zeroFillWeeks } from './zeroFillWeeks'

export const getWeeklyAnalyticsUseCaseImpl = Effect.gen(function* () {
  const analyticsRepo = yield* AnalyticsRepository

  const execute = Effect.fn('GetWeeklyAnalyticsUseCase.execute')(function* (
    startDate: Date,
    endDate: Date,
    paymentFilter: AnalyticsPaymentFilter
  ) {
    const paymentStatusOption: Option.Option<PaymentStatus> =
      paymentFilter === 'all' ? Option.none() : Option.some(paymentFilter)

    const rows = yield* analyticsRepo.getWeeklyAggregation(startDate, endDate, paymentStatusOption)

    const weeks = zeroFillWeeks(rows, startDate, endDate)

    return WeeklyAnalyticsResponse.make({
      weeks,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      payment_filter: paymentFilter,
    })
  })

  return { execute } as const
})

export class GetWeeklyAnalyticsUseCase extends Effect.Service<GetWeeklyAnalyticsUseCase>()(
  'GetWeeklyAnalyticsUseCase',
  {
    accessors: true,
    effect: getWeeklyAnalyticsUseCaseImpl,
    dependencies: [AnalyticsRepository.Default],
  }
) {}
