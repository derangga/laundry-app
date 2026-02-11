import { Effect, Option } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { OrderItem, OrderItemId } from '../../../domain/OrderItem'
import { OrderId } from '../../../domain/Order'
import { ServiceId } from '../../../domain/LaundryService'

export interface OrderItemInsertData {
  order_id: OrderId
  service_id: ServiceId
  quantity: number
  price_at_order: number
  subtotal: number
}

export class OrderItemRepository extends Effect.Service<OrderItemRepository>()(
  'OrderItemRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findById = (
        id: OrderItemId
      ): Effect.Effect<Option.Option<OrderItem>, SqlError.SqlError> =>
        sql<OrderItem>`SELECT * FROM order_items WHERE id = ${id}`.pipe(
          Effect.map((rows) => {
            const first = rows[0]
            return first !== undefined ? Option.some(first) : Option.none()
          })
        )

      const findByOrderId = (
        orderId: OrderId
      ): Effect.Effect<readonly OrderItem[], SqlError.SqlError> =>
        sql<OrderItem>`
          SELECT * FROM order_items
          WHERE order_id = ${orderId}
          ORDER BY created_at ASC
        `.pipe(Effect.map((rows) => rows))

      const insert = (data: OrderItemInsertData): Effect.Effect<OrderItem, SqlError.SqlError> =>
        sql<OrderItem>`
          INSERT INTO order_items (order_id, service_id, quantity, price_at_order, subtotal)
          VALUES (${data.order_id}, ${data.service_id}, ${data.quantity}, ${data.price_at_order}, ${data.subtotal})
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

      const insertMany = (
        items: readonly OrderItemInsertData[]
      ): Effect.Effect<readonly OrderItem[], SqlError.SqlError> => {
        if (items.length === 0) {
          return Effect.succeed([])
        }

        // Build a multi-row INSERT statement
        const values: string[] = []
        const params: Array<string | number> = []
        let paramIndex = 1

        for (const item of items) {
          values.push(
            `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
          )
          params.push(
            item.order_id,
            item.service_id,
            item.quantity,
            item.price_at_order,
            item.subtotal
          )
        }

        const query = `
          INSERT INTO order_items (order_id, service_id, quantity, price_at_order, subtotal)
          VALUES ${values.join(', ')}
          RETURNING *
        `

        return sql.unsafe<OrderItem>(query, params).pipe(Effect.map((rows) => rows))
      }

      const deleteByOrderId = (orderId: OrderId): Effect.Effect<void, SqlError.SqlError> =>
        sql`DELETE FROM order_items WHERE order_id = ${orderId}`.pipe(Effect.map(() => void 0))

      return {
        findById,
        findByOrderId,
        insert,
        insertMany,
        deleteByOrderId,
      } as const
    }),
  }
) {}
