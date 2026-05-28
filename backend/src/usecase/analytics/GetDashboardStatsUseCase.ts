import { Effect } from 'effect'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { DashboardStatsResponse } from '@domain/Analytics'

export const getDashboardStatsUseCaseImpl = Effect.gen(function* () {
  const analyticsRepo = yield* AnalyticsRepository

  const execute = Effect.fn('GetDashboardStatsUseCase.execute')(function* () {
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
      // TODO(laundry-app-kbs.7): compute cancelled_orders
      cancelled_orders: 0,
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
