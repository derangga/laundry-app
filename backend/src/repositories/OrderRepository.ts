import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import {
  Order,
  OrderId,
  OrderStatus,
  PaymentStatus,
  OrderWithDetails,
  OrderSummary,
  OrderFilterOptions,
} from '../domain/Order'
import { CustomerId } from '../domain/Customer'

// Helper to decode SQL results through the schema
const decodeOrders = Schema.decodeUnknown(Schema.Array(Order))
const decodeOrder = Schema.decodeUnknown(Order)
const decodeOrdersWithDetails = Schema.decodeUnknown(Schema.Array(OrderWithDetails))
const decodeOrderSummaries = Schema.decodeUnknown(Schema.Array(OrderSummary))

// Default filter options with all fields set to none
const defaultOrderFilterOptions = new OrderFilterOptions({
  customer_id: Option.none(),
  status: Option.none(),
  payment_status: Option.none(),
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
    ): Effect.Effect<Option.Option<Order>, SqlError.SqlError> =>
      sql`
        SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
        FROM orders
        WHERE order_number = ${orderNumber}
      `.pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? decodeOrder(first).pipe(Effect.map(Option.some))
            : Effect.succeed(Option.none())
        }),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    const findByCustomerId = (
      customerId: CustomerId
    ): Effect.Effect<readonly Order[], SqlError.SqlError> =>
      sql`
        SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
        FROM orders
        WHERE customer_id = ${customerId}
        ORDER BY created_at DESC
      `.pipe(
        Effect.flatMap((rows) => decodeOrders(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    const findWithFilters = (
      options: OrderFilterOptions = defaultOrderFilterOptions
    ): Effect.Effect<readonly Order[], SqlError.SqlError> => {
      const conditions: string[] = []
      const params: Array<string | number | Date> = []
      let paramIndex = 1

      const customerId = Option.getOrUndefined(options.customer_id)
      if (customerId !== undefined) {
        conditions.push(`customer_id = $${paramIndex++}`)
        params.push(customerId)
      }

      const status = Option.getOrUndefined(options.status)
      if (status !== undefined) {
        conditions.push(`status = $${paramIndex++}`)
        params.push(status)
      }

      const paymentStatus = Option.getOrUndefined(options.payment_status)
      if (paymentStatus !== undefined) {
        conditions.push(`payment_status = $${paramIndex++}`)
        params.push(paymentStatus)
      }

      const startDate = Option.getOrUndefined(options.start_date)
      if (startDate !== undefined) {
        conditions.push(`created_at >= $${paramIndex++}`)
        params.push(startDate)
      }

      const endDate = Option.getOrUndefined(options.end_date)
      if (endDate !== undefined) {
        conditions.push(`created_at <= $${paramIndex++}`)
        params.push(endDate)
      }

      let query =
        'SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at FROM orders'
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY created_at DESC'

      const limit = Option.getOrUndefined(options.limit)
      if (limit !== undefined) {
        query += ` LIMIT $${paramIndex++}`
        params.push(limit)
      }

      const offset = Option.getOrUndefined(options.offset)
      if (offset !== undefined) {
        query += ` OFFSET $${paramIndex++}`
        params.push(offset)
      }

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => decodeOrders(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )
    }

    const findWithDetails = (
      options: OrderFilterOptions = defaultOrderFilterOptions
    ): Effect.Effect<readonly OrderWithDetails[], SqlError.SqlError> => {
      const conditions: string[] = []
      const params: Array<string | number | Date> = []
      let paramIndex = 1

      const customerId = Option.getOrUndefined(options.customer_id)
      if (customerId !== undefined) {
        conditions.push(`o.customer_id = $${paramIndex++}`)
        params.push(customerId)
      }

      const status = Option.getOrUndefined(options.status)
      if (status !== undefined) {
        conditions.push(`o.status = $${paramIndex++}`)
        params.push(status)
      }

      const paymentStatus = Option.getOrUndefined(options.payment_status)
      if (paymentStatus !== undefined) {
        conditions.push(`o.payment_status = $${paramIndex++}`)
        params.push(paymentStatus)
      }

      const startDate = Option.getOrUndefined(options.start_date)
      if (startDate !== undefined) {
        conditions.push(`o.created_at >= $${paramIndex++}`)
        params.push(startDate)
      }

      const endDate = Option.getOrUndefined(options.end_date)
      if (endDate !== undefined) {
        conditions.push(`o.created_at <= $${paramIndex++}`)
        params.push(endDate)
      }

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

      const limit = Option.getOrUndefined(options.limit)
      if (limit !== undefined) {
        query += ` LIMIT $${paramIndex++}`
        params.push(limit)
      }

      const offset = Option.getOrUndefined(options.offset)
      if (offset !== undefined) {
        query += ` OFFSET $${paramIndex++}`
        params.push(offset)
      }

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => decodeOrdersWithDetails(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )
    }

    const findSummaries = (
      options: OrderFilterOptions = defaultOrderFilterOptions
    ): Effect.Effect<readonly OrderSummary[], SqlError.SqlError> => {
      const conditions: string[] = []
      const params: Array<string | Date> = []
      let paramIndex = 1

      const paymentStatus = Option.getOrUndefined(options.payment_status)
      if (paymentStatus !== undefined) {
        conditions.push(`payment_status = $${paramIndex++}`)
        params.push(paymentStatus)
      }

      const startDate = Option.getOrUndefined(options.start_date)
      if (startDate !== undefined) {
        conditions.push(`created_at >= $${paramIndex++}`)
        params.push(startDate)
      }

      const endDate = Option.getOrUndefined(options.end_date)
      if (endDate !== undefined) {
        conditions.push(`created_at <= $${paramIndex++}`)
        params.push(endDate)
      }

      let query = 'SELECT id, order_number, total_price, payment_status, created_at FROM orders'
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY created_at DESC'

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => decodeOrderSummaries(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )
    }

    const updateStatus = (
      id: OrderId,
      status: OrderStatus
    ): Effect.Effect<void, SqlError.SqlError> =>
      sql`
        UPDATE orders
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
      `.pipe(Effect.map(() => void 0))

    const updatePaymentStatus = (
      id: OrderId,
      paymentStatus: PaymentStatus
    ): Effect.Effect<void, SqlError.SqlError> =>
      sql`
        UPDATE orders
        SET payment_status = ${paymentStatus}, updated_at = NOW()
        WHERE id = ${id}
      `.pipe(Effect.map(() => void 0))

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
      // Base CRUD from makeRepository
      findById: repo.findById,
      insert: repo.insert,

      // Custom methods
      findByOrderNumber,
      findByCustomerId,
      findWithFilters,
      findWithDetails,
      findSummaries,
      updateStatus,
      updatePaymentStatus,
      updateTotalPrice,
    } as const
  }),
}) {}
