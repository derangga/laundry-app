import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { withSpanCount } from '@laundry-app/observability'
import type {
  ServiceId,
  CreateLaundryServiceInput,
  UpdateLaundryServiceInput,
} from '../domain/LaundryService'
import { LaundryService, ActiveServiceInfo } from '../domain/LaundryService'

// Helper to decode SQL results through the schema
const decodeServices = Schema.decodeUnknown(Schema.Array(LaundryService))
const decodeService = Schema.decodeUnknown(LaundryService)
const decodeActiveServiceInfos = Schema.decodeUnknown(Schema.Array(ActiveServiceInfo))

export class ServiceRepository extends Effect.Service<ServiceRepository>()('ServiceRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(LaundryService, {
      tableName: 'services',
      spanPrefix: 'ServiceRepository',
      idColumn: 'id',
    })

    // Custom methods with explicit columns
    const findActive = (): Effect.Effect<readonly LaundryService[], SqlError.SqlError> =>
      sql`
        SELECT id, name, price, unit_type, is_active, created_at, updated_at, deleted_at
        FROM services
        WHERE is_active = true AND deleted_at IS NULL
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) =>
          decodeServices(rows).pipe(Effect.mapError((e) => new SqlError.SqlError({ cause: e })))
        )
      )

    const findAll = (): Effect.Effect<readonly LaundryService[], SqlError.SqlError> =>
      sql`
        SELECT id, name, price, unit_type, is_active, created_at, updated_at, deleted_at
        FROM services
        WHERE deleted_at IS NULL
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) =>
          decodeServices(rows).pipe(Effect.mapError((e) => new SqlError.SqlError({ cause: e })))
        )
      )

    const findActiveServiceInfo = (): Effect.Effect<
      readonly ActiveServiceInfo[],
      SqlError.SqlError
    > =>
      sql`
        SELECT id, name, price, unit_type
        FROM services
        WHERE is_active = true AND deleted_at IS NULL
        ORDER BY name ASC
      `.pipe(
        Effect.flatMap((rows) =>
          decodeActiveServiceInfos(rows).pipe(
            Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
          )
        )
      )

    const insert = (
      data: CreateLaundryServiceInput
    ): Effect.Effect<LaundryService, SqlError.SqlError> =>
      sql`
        INSERT INTO services (name, price, unit_type, is_active)
        VALUES (${data.name}, ${data.price}, ${data.unit_type}, true)
        RETURNING id, name, price, unit_type, is_active, created_at, updated_at, deleted_at
      `.pipe(
        Effect.flatMap((rows): Effect.Effect<LaundryService, SqlError.SqlError> => {
          const first = rows[0]
          return first !== undefined
            ? decodeService(first).pipe(Effect.mapError((e) => new SqlError.SqlError({ cause: e })))
            : Effect.fail(
                new SqlError.SqlError({ cause: new Error('Insert failed - no row returned') })
              )
        })
      )

    const update = (
      id: ServiceId,
      data: UpdateLaundryServiceInput
    ): Effect.Effect<Option.Option<LaundryService>, SqlError.SqlError> => {
      const entries = Object.entries(data).filter(
        (entry): entry is [string, string | number | boolean] => entry[1] !== undefined
      )

      if (entries.length === 0) {
        return repo.findById(id)
      }

      const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`)
      setClauses.push(`updated_at = NOW()`)

      const params = [...entries.map(([, value]) => value), id]

      const query = `UPDATE services SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} AND deleted_at IS NULL RETURNING id, name, price, unit_type, is_active, created_at, updated_at, deleted_at`

      return sql.unsafe(query, params).pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? decodeService(first).pipe(
                Effect.map(Option.some),
                Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
              )
            : Effect.succeed(Option.none())
        })
      )
    }

    const findById = (
      id: ServiceId
    ): Effect.Effect<Option.Option<LaundryService>, SqlError.SqlError> =>
      sql`
        SELECT id, name, price, unit_type, is_active, created_at, updated_at, deleted_at
        FROM services
        WHERE id = ${id} AND deleted_at IS NULL
      `.pipe(
        Effect.flatMap((rows) => {
          const first = rows[0]
          return first !== undefined
            ? decodeService(first).pipe(
                Effect.map(Option.some),
                Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
              )
            : Effect.succeed(Option.none())
        })
      )

    const softDelete = (id: ServiceId): Effect.Effect<void, SqlError.SqlError> =>
      sql`
        UPDATE services
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
      `.pipe(Effect.map(() => void 0))

    return {
      findById: (...args: Parameters<typeof findById>) =>
        withSpanCount('ServiceRepository.findById', findById(...args)),
      insert: (...args: Parameters<typeof insert>) =>
        withSpanCount('ServiceRepository.insert', insert(...args)),
      update: (...args: Parameters<typeof update>) =>
        withSpanCount('ServiceRepository.update', update(...args)),
      findActive: (...args: Parameters<typeof findActive>) =>
        withSpanCount('ServiceRepository.findActive', findActive(...args)),
      findAll: (...args: Parameters<typeof findAll>) =>
        withSpanCount('ServiceRepository.findAll', findAll(...args)),
      findActiveServiceInfo: (...args: Parameters<typeof findActiveServiceInfo>) =>
        withSpanCount('ServiceRepository.findActiveServiceInfo', findActiveServiceInfo(...args)),
      softDelete: (...args: Parameters<typeof softDelete>) =>
        withSpanCount('ServiceRepository.softDelete', softDelete(...args)),
    } as const
  }),
}) {}
