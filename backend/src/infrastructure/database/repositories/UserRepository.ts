import { Effect, Option } from 'effect'
import { SqlClient, SqlError, Model } from '@effect/sql'
import { User, UserId, UserWithoutPassword, UserBasicInfo } from '../../../domain/User'

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
    const findByEmail = (email: string): Effect.Effect<Option.Option<User>, SqlError.SqlError> =>
      sql<User>`
        SELECT id, email, password_hash, name, role, created_at, updated_at
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

    return {
      // Base CRUD from makeRepository
      findById: repo.findById,
      insert: repo.insert,
      update: repo.update,
      delete: repo.delete,

      // Custom domain-specific methods
      findByEmail,
      findByIdWithoutPassword,
      findBasicInfo,
    } as const
  }),
}) {}
