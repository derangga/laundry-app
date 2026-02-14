import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import {
  Order,
  OrderId,
  OrderStatus,
  PaymentStatus,
  OrderWithDetails,
  OrderSummary,
} from '../domain/Order'
import { CustomerId } from '../domain/Customer'
import { UserId } from '../domain/User'

// Helper to decode SQL results through the schema
const decodeOrders = Schema.decodeUnknown(Schema.Array(Order))
const decodeOrder = Schema.decodeUnknown(Order)
const decodeOrdersWithDetails = Schema.decodeUnknown(Schema.Array(OrderWithDetails))
const decodeOrderSummaries = Schema.decodeUnknown(Schema.Array(OrderSummary))

export interface OrderInsertData {
  order_number: string
  customer_id: CustomerId
  status: OrderStatus
  payment_status: PaymentStatus
  total_price: number
  created_by: UserId
}

export interface OrderFilterOptions {
  status?: OrderStatus
  payment_status?: PaymentStatus
  start_date?: Date
  end_date?: Date
  limit?: number
  offset?: number
}

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
      options: OrderFilterOptions
    ): Effect.Effect<readonly Order[], SqlError.SqlError> => {
      const conditions: string[] = []
      const params: Array<string | number | Date> = []
      let paramIndex = 1

      if (options.status !== undefined) {
        conditions.push(`status = $${paramIndex++}`)
        params.push(options.status)
      }
      if (options.payment_status !== undefined) {
        conditions.push(`payment_status = $${paramIndex++}`)
        params.push(options.payment_status)
      }
      if (options.start_date !== undefined) {
        conditions.push(`created_at >= $${paramIndex++}`)
        params.push(options.start_date)
      }
      if (options.end_date !== undefined) {
        conditions.push(`created_at <= $${paramIndex++}`)
        params.push(options.end_date)
      }

      let query =
        'SELECT id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at FROM orders'
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY created_at DESC'

      if (options.limit !== undefined) {
        query += ` LIMIT $${paramIndex++}`
        params.push(options.limit)
      }
      if (options.offset !== undefined) {
        query += ` OFFSET $${paramIndex++}`
        params.push(options.offset)
      }

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => decodeOrders(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )
    }

    const findWithDetails = (
      options: OrderFilterOptions = {}
    ): Effect.Effect<readonly OrderWithDetails[], SqlError.SqlError> => {
      const conditions: string[] = []
      const params: Array<string | number | Date> = []
      let paramIndex = 1

      if (options.status !== undefined) {
        conditions.push(`o.status = $${paramIndex++}`)
        params.push(options.status)
      }
      if (options.payment_status !== undefined) {
        conditions.push(`o.payment_status = $${paramIndex++}`)
        params.push(options.payment_status)
      }
      if (options.start_date !== undefined) {
        conditions.push(`o.created_at >= $${paramIndex++}`)
        params.push(options.start_date)
      }
      if (options.end_date !== undefined) {
        conditions.push(`o.created_at <= $${paramIndex++}`)
        params.push(options.end_date)
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

      if (options.limit !== undefined) {
        query += ` LIMIT $${paramIndex++}`
        params.push(options.limit)
      }
      if (options.offset !== undefined) {
        query += ` OFFSET $${paramIndex++}`
        params.push(options.offset)
      }

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => decodeOrdersWithDetails(rows)),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )
    }

    const findSummaries = (
      options: Pick<OrderFilterOptions, 'payment_status' | 'start_date' | 'end_date'> = {}
    ): Effect.Effect<readonly OrderSummary[], SqlError.SqlError> => {
      const conditions: string[] = []
      const params: Array<string | Date> = []
      let paramIndex = 1

      if (options.payment_status !== undefined) {
        conditions.push(`payment_status = $${paramIndex++}`)
        params.push(options.payment_status)
      }
      if (options.start_date !== undefined) {
        conditions.push(`created_at >= $${paramIndex++}`)
        params.push(options.start_date)
      }
      if (options.end_date !== undefined) {
        conditions.push(`created_at <= $${paramIndex++}`)
        params.push(options.end_date)
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

    const insert = (data: OrderInsertData): Effect.Effect<Order, SqlError.SqlError> =>
      sql`
        INSERT INTO orders (order_number, customer_id, status, payment_status, total_price, created_by)
        VALUES (${data.order_number}, ${data.customer_id}, ${data.status}, ${data.payment_status}, ${data.total_price}, ${data.created_by})
        RETURNING id, order_number, customer_id, status, payment_status, total_price, created_by, created_at, updated_at
      `.pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? decodeOrder(first)
            : Effect.fail(new Error('Insert failed - no row returned'))
        }),
        Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
      )

    return {
      // Base CRUD from makeRepository
      findById: repo.findById,

      // Custom methods
      insert,
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
