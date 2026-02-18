import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { PaymentStatus } from '../domain/Order'
import { WeeklyRow } from '@domain/Analytics'

const decodeWeeklyRows = Schema.decodeUnknown(Schema.Array(WeeklyRow))

export class AnalyticsRepository extends Effect.Service<AnalyticsRepository>()(
  'AnalyticsRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const getWeeklyAggregation = (
        startDate: Date,
        endDate: Date,
        paymentStatus: Option.Option<PaymentStatus>
      ): Effect.Effect<readonly WeeklyRow[], SqlError.SqlError> => {
        // Payment filter handled at app level — if Option.none(), no WHERE clause for payment_status
        if (Option.isSome(paymentStatus)) {
          return sql`
            SELECT
              DATE_TRUNC('week', created_at)::date AS week_start,
              COALESCE(SUM(total_price), 0) AS total_revenue,
              COUNT(*) AS order_count
            FROM orders
            WHERE created_at >= ${startDate}
              AND created_at < ${endDate}
              AND payment_status = ${paymentStatus.value}
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week_start ASC
          `.pipe(
            Effect.flatMap((rows) => decodeWeeklyRows(rows)),
            Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
          )
        }

        return sql`
          SELECT
            DATE_TRUNC('week', created_at)::date AS week_start,
            COALESCE(SUM(total_price), 0) AS total_revenue,
            COUNT(*) AS order_count
          FROM orders
          WHERE created_at >= ${startDate}
            AND created_at < ${endDate}
          GROUP BY DATE_TRUNC('week', created_at)
          ORDER BY week_start ASC
        `.pipe(
          Effect.flatMap((rows) => decodeWeeklyRows(rows)),
          Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
        )
      }

      const getTodaysOrderCount = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ count: string }>`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE created_at >= CURRENT_DATE
        `.pipe(Effect.map((rows) => parseInt(rows[0]?.count ?? '0', 10)))

      const getPendingPaymentCount = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ count: string }>`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE payment_status = 'unpaid'
        `.pipe(Effect.map((rows) => parseInt(rows[0]?.count ?? '0', 10)))

      const getWeeklyRevenue = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ total: string }>`
          SELECT COALESCE(SUM(total_price), 0) AS total
          FROM orders
          WHERE payment_status = 'paid'
            AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        `.pipe(Effect.map((rows) => parseFloat(rows[0]?.total ?? '0')))

      const getTotalCustomerCount = (): Effect.Effect<number, SqlError.SqlError> =>
        sql<{ count: string }>`
          SELECT COUNT(*) AS count
          FROM customers
        `.pipe(Effect.map((rows) => parseInt(rows[0]?.count ?? '0', 10)))

      return {
        getWeeklyAggregation,
        getTodaysOrderCount,
        getPendingPaymentCount,
        getWeeklyRevenue,
        getTotalCustomerCount,
      } as const
    }),
  }
) {}
