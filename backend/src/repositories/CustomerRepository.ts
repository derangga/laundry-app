import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { withSpanCount } from '@laundry-app/observability'
import {
  Customer,
  CustomerId,
  CustomerFromDb,
  CustomerSummary,
  UpdateCustomerInput,
} from '../domain/Customer'

export class CustomerRepository extends Effect.Service<CustomerRepository>()('CustomerRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(Customer, {
      tableName: 'customers',
      spanPrefix: 'CustomerRepository',
      idColumn: 'id',
    })

    const decodeCustomer = Schema.decodeUnknown(CustomerFromDb)
    const decodeCustomers = Schema.decodeUnknown(Schema.Array(CustomerFromDb))

    // Custom findById using raw SQL (Model.makeRepository has issues)
    const findById = (
      id: CustomerId
    ): Effect.Effect<Option.Option<typeof CustomerFromDb.Type>, SqlError.SqlError> =>
      sql`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE id = ${id}
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeCustomer(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    // Custom methods with explicit columns
    const findByPhone = (
      phone: string
    ): Effect.Effect<Option.Option<typeof CustomerFromDb.Type>, SqlError.SqlError> =>
      sql`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE phone = ${phone}
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeCustomer(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    const searchByName = (
      name: string
    ): Effect.Effect<readonly (typeof CustomerFromDb.Type)[], SqlError.SqlError> =>
      sql`
        SELECT id, name, phone, address, created_at, updated_at
        FROM customers
        WHERE name ILIKE ${'%' + name + '%'}
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) => decodeCustomers(rows).pipe(Effect.orDie)),
        Effect.map((rows) => Array.from(rows))
      )

    const findSummaries = (): Effect.Effect<readonly CustomerSummary[], SqlError.SqlError> =>
      sql<CustomerSummary>`
        SELECT id, name, phone
        FROM customers
        ORDER BY name ASC
      `.pipe(Effect.map((rows) => rows))

    const update = (
      id: CustomerId,
      data: UpdateCustomerInput
    ): Effect.Effect<Option.Option<typeof CustomerFromDb.Type>, SqlError.SqlError> => {
      const entries = Object.entries(data).filter(
        (entry): entry is [string, string | null] => entry[1] !== undefined
      )

      if (entries.length === 0) {
        return findById(id)
      }

      const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`)
      setClauses.push(`updated_at = NOW()`)

      const params = [...entries.map(([, value]) => value), id]

      const query = `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING id, name, phone, address, created_at, updated_at`

      return sql.unsafe(query, params).pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeCustomer(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )
    }

    return {
      insert: (...args: Parameters<typeof repo.insert>) =>
        withSpanCount('CustomerRepository.insert', repo.insert(...args)),
      delete: (...args: Parameters<typeof repo.delete>) =>
        withSpanCount('CustomerRepository.delete', repo.delete(...args)),
      findById: (...args: Parameters<typeof findById>) =>
        withSpanCount('CustomerRepository.findById', findById(...args)),
      update: (...args: Parameters<typeof update>) =>
        withSpanCount('CustomerRepository.update', update(...args)),
      findByPhone: (...args: Parameters<typeof findByPhone>) =>
        withSpanCount('CustomerRepository.findByPhone', findByPhone(...args)),
      searchByName: (...args: Parameters<typeof searchByName>) =>
        withSpanCount('CustomerRepository.searchByName', searchByName(...args)),
      findSummaries: (...args: Parameters<typeof findSummaries>) =>
        withSpanCount('CustomerRepository.findSummaries', findSummaries(...args)),
    } as const
  }),
}) {}
