import { Effect, Option } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { Order, OrderId, OrderStatus, PaymentStatus } from '../../../domain/Order'
import { CustomerId } from '../../../domain/Customer'
import { UserId } from '../../../domain/User'

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

    const findById = (id: OrderId): Effect.Effect<Option.Option<Order>, SqlError.SqlError> =>
      sql<Order>`SELECT * FROM orders WHERE id = ${id}`.pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )

    const findByOrderNumber = (
      orderNumber: string
    ): Effect.Effect<Option.Option<Order>, SqlError.SqlError> =>
      sql<Order>`SELECT * FROM orders WHERE order_number = ${orderNumber}`.pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )

    const findByCustomerId = (
      customerId: CustomerId
    ): Effect.Effect<readonly Order[], SqlError.SqlError> =>
      sql<Order>`
          SELECT * FROM orders
          WHERE customer_id = ${customerId}
          ORDER BY created_at DESC
        `.pipe(Effect.map((rows) => rows))

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

      let query = 'SELECT * FROM orders'
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

      return sql.unsafe<Order>(query, params).pipe(Effect.map((rows) => rows))
    }

    const insert = (data: OrderInsertData): Effect.Effect<Order, SqlError.SqlError> =>
      sql<Order>`
          INSERT INTO orders (order_number, customer_id, status, payment_status, total_price, created_by)
          VALUES (${data.order_number}, ${data.customer_id}, ${data.status}, ${data.payment_status}, ${data.total_price}, ${data.created_by})
          RETURNING *
        `.pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? Effect.succeed(first)
            : Effect.fail(
                new SqlError.SqlError({
                  cause: new Error('Insert failed - no row returned'),
                })
              )
        })
      )

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
      findById,
      findByOrderNumber,
      findByCustomerId,
      findWithFilters,
      insert,
      updateStatus,
      updatePaymentStatus,
      updateTotalPrice,
    } as const
  }),
}) {}
