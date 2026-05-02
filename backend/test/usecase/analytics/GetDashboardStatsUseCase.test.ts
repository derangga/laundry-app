import { describe, it, expect } from 'vitest'
import { Effect, Layer } from 'effect'
import {
  GetDashboardStatsUseCase,
  getDashboardStatsUseCaseImpl,
} from 'src/usecase/analytics/GetDashboardStatsUseCase'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'

const createMockRepo = (values: {
  todaysOrders: number
  pendingPayments: number
  weeklyRevenue: number
  totalCustomers: number
}) =>
  Layer.succeed(AnalyticsRepository, {
    getTodaysOrderCount: () => Effect.succeed(values.todaysOrders),
    getPendingPaymentCount: () => Effect.succeed(values.pendingPayments),
    getWeeklyRevenue: () => Effect.succeed(values.weeklyRevenue),
    getTotalCustomerCount: () => Effect.succeed(values.totalCustomers),
  } as unknown as AnalyticsRepository)

const createTestLayer = (values: {
  todaysOrders: number
  pendingPayments: number
  weeklyRevenue: number
  totalCustomers: number
}) =>
  Layer.effect(
    GetDashboardStatsUseCase,
    Effect.map(
      getDashboardStatsUseCaseImpl,
      (impl) => new GetDashboardStatsUseCase(impl)
    )
  ).pipe(Layer.provide(createMockRepo(values)))

describe('GetDashboardStatsUseCase', () => {
  it('wires repo values into the response fields', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* GetDashboardStatsUseCase
      return yield* useCase.execute()
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer({
          todaysOrders: 12,
          pendingPayments: 3,
          weeklyRevenue: 4500,
          totalCustomers: 87,
        })
      )
    )

    expect(result.todays_orders).toBe(12)
    expect(result.pending_payments).toBe(3)
    expect(result.weekly_revenue).toBe(4500)
    expect(result.total_customers).toBe(87)
  })

  it('handles zero values', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* GetDashboardStatsUseCase
      return yield* useCase.execute()
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer({
          todaysOrders: 0,
          pendingPayments: 0,
          weeklyRevenue: 0,
          totalCustomers: 0,
        })
      )
    )

    expect(result.todays_orders).toBe(0)
    expect(result.pending_payments).toBe(0)
    expect(result.weekly_revenue).toBe(0)
    expect(result.total_customers).toBe(0)
  })

  it('invokes all four repo methods', async () => {
    const calls: string[] = []
    const repo = Layer.succeed(AnalyticsRepository, {
      getTodaysOrderCount: () => {
        calls.push('todays')
        return Effect.succeed(1)
      },
      getPendingPaymentCount: () => {
        calls.push('pending')
        return Effect.succeed(2)
      },
      getWeeklyRevenue: () => {
        calls.push('revenue')
        return Effect.succeed(3)
      },
      getTotalCustomerCount: () => {
        calls.push('customers')
        return Effect.succeed(4)
      },
    } as unknown as AnalyticsRepository)

    const layer = Layer.effect(
      GetDashboardStatsUseCase,
      Effect.map(
        getDashboardStatsUseCaseImpl,
        (impl) => new GetDashboardStatsUseCase(impl)
      )
    ).pipe(Layer.provide(repo))

    const program = Effect.gen(function* () {
      const useCase = yield* GetDashboardStatsUseCase
      return yield* useCase.execute()
    })

    await Effect.runPromise(Effect.provide(program, layer))

    expect(calls).toContain('todays')
    expect(calls).toContain('pending')
    expect(calls).toContain('revenue')
    expect(calls).toContain('customers')
  })
})
