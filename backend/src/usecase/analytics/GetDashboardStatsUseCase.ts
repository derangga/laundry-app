import { Effect } from 'effect'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { DashboardStatsResponse } from '@domain/Analytics'

export const getDashboardStatsUseCaseImpl = Effect.gen(function* () {
  const analyticsRepo = yield* AnalyticsRepository

  const execute = Effect.fn('GetDashboardStatsUseCase.execute')(function* () {
    const [todaysOrders, pendingPayments, weeklyRevenue, totalCustomers, cancelledOrders] =
      yield* Effect.all(
        [
          analyticsRepo.getTodaysOrderCount(),
          analyticsRepo.getPendingPaymentCount(),
          analyticsRepo.getWeeklyRevenue(),
          analyticsRepo.getTotalCustomerCount(),
          analyticsRepo.getCancelledOrdersThisWeek(),
        ],
        { concurrency: 5 }
      )

    return DashboardStatsResponse.make({
      todays_orders: todaysOrders,
      pending_payments: pendingPayments,
      weekly_revenue: weeklyRevenue,
      total_customers: totalCustomers,
      cancelled_orders: cancelledOrders,
    })
  })

  return { execute } as const
})

export class GetDashboardStatsUseCase extends Effect.Service<GetDashboardStatsUseCase>()(
  'GetDashboardStatsUseCase',
  {
    accessors: true,
    effect: getDashboardStatsUseCaseImpl,
    dependencies: [AnalyticsRepository.Default],
  }
) {}
