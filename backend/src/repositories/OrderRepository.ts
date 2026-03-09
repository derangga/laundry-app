import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { withSpanCount } from '@laundry-app/observability'
import {
  Order,
  OrderFromDb,
  OrderId,
  OrderStatus,
  PaymentStatus,
  OrderWithDetailsFromDb,
  OrderSummaryFromDb,
  OrderFilterOptions,
} from '../domain/Order'
import { CustomerId } from '../domain/Customer'

// Helper to build dynamic WHERE clauses declaratively
type FilterDef = readonly [option: Option.Option<string | number | Date>, clause: string]

const buildWhereClause = (filters: FilterDef[]) => {
  const active = filters.flatMap(([opt, clause]) =>
    Option.isSome(opt) ? [{ clause, value: opt.value }] : []
  )
  const conditions = active.map(({ clause }, i) => `${clause} $${i + 1}`)
  const params = active.map(({ value }) => value)
  return { conditions, params, nextIndex: active.length + 1 }
}

// Helper to decode SQL results through the schema
const decodeOrders = Schema.decodeUnknown(Schema.Array(OrderFromDb))
const decodeOrder = Schema.decodeUnknown(OrderFromDb)
const decodeOrdersWithDetails = Schema.decodeUnknown(Schema.Array(OrderWithDetailsFromDb))
const decodeOrderSummaries = Schema.decodeUnknown(Schema.Array(OrderSummaryFromDb))

// Default filter options with all fields set to none
const defaultOrderFilterOptions = new OrderFilterOptions({
  customer_id: Option.none(),
  status: Option.none(),
  payment_status: Option.none(),
  order_number: Option.none(),
  start_date: Option.none(),
  end_date: Option.none(),
  limit: Option.none(),
  offset: Option.none(),
})

export class OrderRepository extends Effect.Service<OrderRepository>()('OrderRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(Order, {
      tableName: 'orders',
      spanPrefix: 'OrderRepository',
      idColumn: 'id',
    })

    // Custom methods with explicit columns
    const findByOrderNumber = (
      orderNumber: string
    ): Effect.Effect<Option.Option<OrderFromDb>, SqlError.SqlError> =>
      sql`
        SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
        FROM orders
        WHERE order_number = ${orderNumber}
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeOrder(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    const findByCustomerId = (
      customerId: CustomerId
    ): Effect.Effect<readonly OrderFromDb[], SqlError.SqlError> =>
      sql`
        SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
        FROM orders
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
      `.pipe(Effect.flatMap((rows) => decodeOrders(rows).pipe(Effect.orDie)))

    const findWithFilters = (
      options: OrderFilterOptions = defaultOrderFilterOptions
    ): Effect.Effect<readonly OrderFromDb[], SqlError.SqlError> => {
      const { conditions, params, nextIndex } = buildWhereClause([
        [options.customer_id, 'customer_id ='],
        [options.status, 'status ='],
        [options.payment_status, 'payment_status ='],
        [options.order_number, 'order_number ='],
        [options.start_date, 'created_at >='],
        [options.end_date, 'created_at <='],
      ])

      let query =
        'SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at FROM orders'
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY created_at DESC'

      let idx = nextIndex
      const allParams = [...params]

      const limit = Option.getOrUndefined(options.limit)
      if (limit !== undefined) {
        query += ` LIMIT $${idx++}`
        allParams.push(limit)
      }

      const offset = Option.getOrUndefined(options.offset)
      if (offset !== undefined) {
        query += ` OFFSET $${idx++}`
        allParams.push(offset)
      }

      return sql
        .unsafe(query, allParams)
        .pipe(Effect.flatMap((rows) => decodeOrders(rows).pipe(Effect.orDie)))
    }

    const findWithDetails = (
      options: OrderFilterOptions = defaultOrderFilterOptions
    ): Effect.Effect<readonly OrderWithDetailsFromDb[], SqlError.SqlError> => {
      const { conditions, params, nextIndex } = buildWhereClause([
        [options.customer_id, 'o.customer_id ='],
        [options.status, 'o.status ='],
        [options.payment_status, 'o.payment_status ='],
        [options.order_number, 'o.order_number ='],
        [options.start_date, 'o.created_at >='],
        [options.end_date, 'o.created_at <='],
      ])

      let query = `
        SELECT
          o.id,
          o.order_number,
          o.customer_id,
          c.name AS customer_name,
          c.phone AS customer_phone,
          o.status,
          o.payment_status,
          o.total_price,
          o.created_by,
          u.name AS created_by_name,
          o.created_at,
          o.updated_at
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN users u ON o.created_by = u.id
      `

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY o.created_at DESC'

      let idx = nextIndex
      const allParams = [...params]

      const limit = Option.getOrUndefined(options.limit)
      if (limit !== undefined) {
        query += ` LIMIT $${idx++}`
        allParams.push(limit)
      }

      const offset = Option.getOrUndefined(options.offset)
      if (offset !== undefined) {
        query += ` OFFSET $${idx++}`
        allParams.push(offset)
      }

      return sql
        .unsafe(query, allParams)
        .pipe(Effect.flatMap((rows) => decodeOrdersWithDetails(rows).pipe(Effect.orDie)))
    }

    const findSummaries = (
      options: OrderFilterOptions = defaultOrderFilterOptions
    ): Effect.Effect<readonly OrderSummaryFromDb[], SqlError.SqlError> => {
      const { conditions, params } = buildWhereClause([
        [options.payment_status, 'payment_status ='],
        [options.start_date, 'created_at >='],
        [options.end_date, 'created_at <='],
      ])

      let query = 'SELECT id, order_number, total_price, payment_status, created_at FROM orders'
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY created_at DESC'

      return sql
        .unsafe(query, params)
        .pipe(Effect.flatMap((rows) => decodeOrderSummaries(rows).pipe(Effect.orDie)))
    }

    const updateStatus = (
      id: OrderId,
      status: OrderStatus
    ): Effect.Effect<OrderFromDb, SqlError.SqlError> =>
      sql`
        UPDATE orders
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) => decodeOrder(row).pipe(Effect.orDie))
      )

    const updatePaymentStatus = (
      id: OrderId,
      paymentStatus: PaymentStatus
    ): Effect.Effect<OrderFromDb, SqlError.SqlError> =>
      sql`
        UPDATE orders
        SET payment_status = ${paymentStatus}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) => decodeOrder(row).pipe(Effect.orDie))
      )

    const updateTotalPrice = (
      id: OrderId,
      totalPrice: number
    ): Effect.Effect<void, SqlError.SqlError> =>
      sql`
        UPDATE orders
        SET total_price = ${totalPrice}, updated_at = NOW()
        WHERE id = ${id}
      `.pipe(Effect.map(() => void 0))

    return {
      findById: (...args: Parameters<typeof repo.findById>) =>
        withSpanCount('OrderRepository.findById', repo.findById(...args)),
      insert: (...args: Parameters<typeof repo.insert>) =>
        withSpanCount('OrderRepository.insert', repo.insert(...args)),
      findByOrderNumber: (...args: Parameters<typeof findByOrderNumber>) =>
        withSpanCount('OrderRepository.findByOrderNumber', findByOrderNumber(...args)),
      findByCustomerId: (...args: Parameters<typeof findByCustomerId>) =>
        withSpanCount('OrderRepository.findByCustomerId', findByCustomerId(...args)),
      findWithFilters: (...args: Parameters<typeof findWithFilters>) =>
        withSpanCount('OrderRepository.findWithFilters', findWithFilters(...args)),
      findWithDetails: (...args: Parameters<typeof findWithDetails>) =>
        withSpanCount('OrderRepository.findWithDetails', findWithDetails(...args)),
      findSummaries: (...args: Parameters<typeof findSummaries>) =>
        withSpanCount('OrderRepository.findSummaries', findSummaries(...args)),
      updateStatus: (...args: Parameters<typeof updateStatus>) =>
        withSpanCount('OrderRepository.updateStatus', updateStatus(...args)),
      updatePaymentStatus: (...args: Parameters<typeof updatePaymentStatus>) =>
        withSpanCount('OrderRepository.updatePaymentStatus', updatePaymentStatus(...args)),
      updateTotalPrice: (...args: Parameters<typeof updateTotalPrice>) =>
        withSpanCount('OrderRepository.updateTotalPrice', updateTotalPrice(...args)),
    } as const
  }),
}) {}
