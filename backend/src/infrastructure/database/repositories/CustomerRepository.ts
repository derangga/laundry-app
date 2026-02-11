import { Effect, Option } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import {
  Customer,
  CustomerId,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../../../domain/Customer'

export class CustomerRepository extends Effect.Service<CustomerRepository>()('CustomerRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const findById = (id: CustomerId): Effect.Effect<Option.Option<Customer>, SqlError.SqlError> =>
      sql<Customer>`SELECT * FROM customers WHERE id = ${id}`.pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )

    const findByPhone = (
      phone: string
    ): Effect.Effect<Option.Option<Customer>, SqlError.SqlError> =>
      sql<Customer>`SELECT * FROM customers WHERE phone = ${phone}`.pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )

    const searchByName = (name: string): Effect.Effect<readonly Customer[], SqlError.SqlError> =>
      sql<Customer>`
          SELECT * FROM customers
          WHERE name ILIKE ${'%' + name + '%'}
          ORDER BY name ASC
        `.pipe(Effect.map((rows) => rows))

    const insert = (data: CreateCustomerInput): Effect.Effect<Customer, SqlError.SqlError> =>
      sql<Customer>`
          INSERT INTO customers (name, phone, address)
          VALUES (${data.name}, ${data.phone}, ${data.address})
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

    const update = (
      id: CustomerId,
      data: UpdateCustomerInput
    ): Effect.Effect<Option.Option<Customer>, SqlError.SqlError> => {
      const updates: string[] = []
      const params: Array<string | CustomerId | null> = []
      let paramIndex = 1

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`)
        params.push(data.phone)
      }
      if (data.address !== undefined) {
        updates.push(`address = $${paramIndex++}`)
        params.push(data.address)
      }

      if (updates.length === 0) {
        return findById(id)
      }

      updates.push(`updated_at = NOW()`)
      params.push(id)

      const query = `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`

      return sql.unsafe<Customer>(query, params).pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )
    }

    const deleteById = (id: CustomerId): Effect.Effect<boolean, SqlError.SqlError> =>
      sql`DELETE FROM customers WHERE id = ${id}`.pipe(Effect.map(() => true))

    return {
      findById,
      findByPhone,
      searchByName,
      insert,
      update,
      delete: deleteById,
    } as const
  }),
}) {}
