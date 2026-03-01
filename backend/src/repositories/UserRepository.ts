import { Effect, Option } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { User, UserId, UserWithoutPassword, UserBasicInfo, UserUpdateData } from '../domain/User'

export class UserRepository extends Effect.Service<UserRepository>()('UserRepository', {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    // Base CRUD from Model.makeRepository
    const repo = yield* Model.makeRepository(User, {
      tableName: 'users',
      spanPrefix: 'UserRepository',
      idColumn: 'id',
    })

    // Custom methods with explicit columns
    const update = (
      id: UserId,
      data: UserUpdateData
    ): Effect.Effect<Option.Option<User>, SqlError.SqlError> => {
      const updates: string[] = []
      const params: Array<string | UserId> = []
      let paramIndex = 1

      if (data.email !== undefined) {
        updates.push(`email = $${paramIndex++}`)
        params.push(data.email)
      }
      if (data.password_hash !== undefined) {
        updates.push(`password_hash = $${paramIndex++}`)
        params.push(data.password_hash)
      }
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.role !== undefined) {
        updates.push(`role = $${paramIndex++}`)
        params.push(data.role)
      }

      if (updates.length === 0) {
        return repo.findById(id)
      }

      updates.push(`updated_at = NOW()`)
      params.push(id)

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`

      return sql.unsafe<User>(query, params).pipe(
        Effect.map((rows) => {
          const first = rows[0]
          return first !== undefined ? Option.some(first) : Option.none()
        })
      )
    }

    const findByEmail = (email: string): Effect.Effect<Option.Option<User>, SqlError.SqlError> =>
      sql<User>`
        SELECT id, email, password_hash, name, role, created_at, updated_at, deleted_at
        FROM users
        WHERE email = ${email}
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))

    const findByIdWithoutPassword = (
      id: UserId
    ): Effect.Effect<Option.Option<UserWithoutPassword>, SqlError.SqlError> =>
      sql<UserWithoutPassword>`
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        WHERE id = ${id}
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))

    const findBasicInfo = (
      id: UserId
    ): Effect.Effect<Option.Option<UserBasicInfo>, SqlError.SqlError> =>
      sql<UserBasicInfo>`
        SELECT id, name, email
        FROM users
        WHERE id = ${id}
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))

    const hasAnyUsers = (): Effect.Effect<boolean, SqlError.SqlError> =>
      sql<{ exists: boolean }>`
        SELECT EXISTS(SELECT 1 FROM users) as exists
      `.pipe(Effect.map((rows) => rows[0]?.exists ?? false))

    const findAll = (): Effect.Effect<UserWithoutPassword[], SqlError.SqlError> =>
      sql<UserWithoutPassword>`
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
      `.pipe(Effect.map((rows) => Array.from(rows)))

    const softDelete = (
      id: UserId
    ): Effect.Effect<Option.Option<UserWithoutPassword>, SqlError.SqlError> =>
      sql<UserWithoutPassword>`
        UPDATE users
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id, email, name, role, created_at, updated_at
      `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))

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
