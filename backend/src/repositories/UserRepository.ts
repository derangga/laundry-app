import { Effect, Option, Schema } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import {
  User,
  UserId,
  UserWithoutPassword,
  UserWithoutPasswordFromDb,
  UserFromDb,
  UserBasicInfo,
  UserUpdateData,
} from '../domain/User'

export class UserRepository extends Effect.Service<UserRepository>()('UserRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(User, {
      tableName: 'users',
      spanPrefix: 'UserRepository',
      idColumn: 'id',
    })

    const decodeUser = Schema.decodeUnknown(UserFromDb)
    const decodeUserWithoutPassword = Schema.decodeUnknown(UserWithoutPasswordFromDb)
    const decodeUsersWithoutPassword = Schema.decodeUnknown(Schema.Array(UserWithoutPasswordFromDb))
    const decodeUserBasicInfo = Schema.decodeUnknown(UserBasicInfo)

    // Custom methods with explicit columns
    const update = (
      id: UserId,
      data: UserUpdateData
    ): Effect.Effect<Option.Option<UserWithoutPassword>, SqlError.SqlError> => {
      const entries = Object.entries(data).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )

      if (entries.length === 0) {
        return findByIdWithoutPassword(id)
      }

      const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`)
      setClauses.push(`updated_at = NOW()`)

      const params = [...entries.map(([, value]) => value), id]

      const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} AND deleted_at IS NULL RETURNING id, email, name, role, created_at, updated_at`

      return sql.unsafe(query, params).pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeUserWithoutPassword(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )
    }

    const findByEmail = (email: string): Effect.Effect<Option.Option<UserFromDb>, SqlError.SqlError> =>
      sql`
        SELECT id, email, password_hash, name, role, created_at, updated_at, deleted_at
        FROM users
        WHERE email = ${email}
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeUser(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    const findByIdWithoutPassword = (
      id: UserId
    ): Effect.Effect<Option.Option<UserWithoutPassword>, SqlError.SqlError> =>
      sql`
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        WHERE id = ${id} AND deleted_at IS NULL
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeUserWithoutPassword(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    const findBasicInfo = (
      id: UserId
    ): Effect.Effect<Option.Option<UserBasicInfo>, SqlError.SqlError> =>
      sql`
        SELECT id, name, email
        FROM users
        WHERE id = ${id} AND deleted_at IS NULL
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeUserBasicInfo(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    const hasAnyUsers = (): Effect.Effect<boolean, SqlError.SqlError> =>
      sql`
        SELECT EXISTS(SELECT 1 FROM users WHERE deleted_at IS NULL) as exists
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          Schema.decodeUnknown(Schema.Struct({ exists: Schema.Boolean }))(row).pipe(Effect.orDie)
        ),
        Effect.map((row) => row.exists)
      )

    const findAll = (): Effect.Effect<readonly UserWithoutPassword[], SqlError.SqlError> =>
      sql`
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
      `.pipe(
        Effect.flatMap((rows) => decodeUsersWithoutPassword(rows).pipe(Effect.orDie))
      )

    const softDelete = (
      id: UserId
    ): Effect.Effect<Option.Option<UserWithoutPassword>, SqlError.SqlError> =>
      sql`
        UPDATE users
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id, email, name, role, created_at, updated_at
      `.pipe(
        Effect.map((rows) => rows[0]),
        Effect.flatMap((row) =>
          row
            ? decodeUserWithoutPassword(row).pipe(Effect.map(Option.some), Effect.orDie)
            : Effect.succeed(Option.none())
        )
      )

    return {
      // Base CRUD from makeRepository
      findById: repo.findById,
      insert: repo.insert,
      delete: repo.delete,

      // Custom domain-specific methods
      update,
      findByEmail,
      findByIdWithoutPassword,
      findBasicInfo,
      hasAnyUsers,
      findAll,
      softDelete,
    } as const
  }),
}) {}
