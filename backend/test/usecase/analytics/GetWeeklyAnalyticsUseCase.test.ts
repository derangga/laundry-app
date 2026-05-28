import { describe, it, expect } from 'vitest'
import { Effect, Layer, Option } from 'effect'
import {
  GetWeeklyAnalyticsUseCase,
  getWeeklyAnalyticsUseCaseImpl,
} from 'src/usecase/analytics/GetWeeklyAnalyticsUseCase'
import { AnalyticsRepository } from '@repositories/AnalyticsRepository'
import { WeeklyRow } from '@domain/Analytics'
import { PaymentStatus } from '@domain/Order'

type AggregationCall = {
  startDate: Date
  endDate: Date
  paymentStatus: Option.Option<PaymentStatus>
}

const createMockRepo = (rows: readonly WeeklyRow[], spy?: (call: AggregationCall) => void) =>
  Layer.succeed(AnalyticsRepository, {
    getWeeklyAggregation: (
      startDate: Date,
      endDate: Date,
      paymentStatus: Option.Option<PaymentStatus>
    ) => {
      spy?.({ startDate, endDate, paymentStatus })
      return Effect.succeed(rows)
    },
  } as unknown as AnalyticsRepository)

const createTestLayer = (rows: readonly WeeklyRow[], spy?: (call: AggregationCall) => void) =>
  Layer.effect(
    GetWeeklyAnalyticsUseCase,
    Effect.map(getWeeklyAnalyticsUseCaseImpl, (impl) => new GetWeeklyAnalyticsUseCase(impl))
  ).pipe(Layer.provide(createMockRepo(rows, spy)))

describe('GetWeeklyAnalyticsUseCase', () => {
  it("passes Option.none() to repo when paymentFilter is 'all'", async () => {
    let captured: AggregationCall | undefined
    const program = Effect.gen(function* () {
      const useCase = yield* GetWeeklyAnalyticsUseCase
      return yield* useCase.execute(new Date('2024-01-01'), new Date('2024-01-15'), 'all')
    })

    const result = await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer([], (call) => {
          captured = call
        })
      )
    )

    expect(captured).toBeDefined()
    expect(Option.isNone(captured!.paymentStatus)).toBe(true)
    expect(result.payment_filter).toBe('all')
    expect(result.start_date).toBe('2024-01-01')
    expect(result.end_date).toBe('2024-01-15')
  })

  it("passes Option.some('paid') to repo when paymentFilter is 'paid'", async () => {
    let captured: AggregationCall | undefined
    const program = Effect.gen(function* () {
      const useCase = yield* GetWeeklyAnalyticsUseCase
      return yield* useCase.execute(new Date('2024-01-01'), new Date('2024-01-15'), 'paid')
    })

    await Effect.runPromise(
      Effect.provide(
        program,
        createTestLayer([], (call) => {
          captured = call
        })
      )
    )

    expect(Option.isSome(captured!.paymentStatus)).toBe(true)
    if (Option.isSome(captured!.paymentStatus)) {
      expect(captured!.paymentStatus.value).toBe('paid')
    }
  })

  it('zero-fills weeks when repo returns no rows', async () => {
    const program = Effect.gen(function* () {
      const useCase = yield* GetWeeklyAnalyticsUseCase
      return yield* useCase.execute(
        new Date('2024-01-01'), // Monday
        new Date('2024-01-22'), // 3 weeks later
        'all'
      )
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer([])))

    expect(result.weeks).toHaveLength(3)
    for (const week of result.weeks) {
      expect(week.total_revenue).toBe(0)
      expect(week.order_count).toBe(0)
    }
  })

  it('merges repo rows into the corresponding weeks', async () => {
    const rows: readonly WeeklyRow[] = [
      WeeklyRow.make({
        week_start: new Date('2024-01-01T00:00:00.000Z'),
        total_revenue: 150,
        order_count: 5,
        cancelled_count: 0,
      }),
    ]

    const program = Effect.gen(function* () {
      const useCase = yield* GetWeeklyAnalyticsUseCase
      return yield* useCase.execute(
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-01-15T00:00:00.000Z'),
        'all'
      )
    })

    const result = await Effect.runPromise(Effect.provide(program, createTestLayer(rows)))

    const filled = result.weeks.find((w) => w.week_start === '2024-01-01')
    expect(filled).toBeDefined()
    expect(filled!.total_revenue).toBe(150)
    expect(filled!.order_count).toBe(5)
  })
})
