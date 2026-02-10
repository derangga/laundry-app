import { Config, Effect, pipe } from "effect"
import { PgClient } from "@effect/sql-pg"

export const DatabaseConfig = Config.all({
  host: Config.string("DATABASE_HOST").pipe(Config.withDefault("localhost")),
  port: Config.integer("DATABASE_PORT").pipe(Config.withDefault(5432)),
  username: Config.string("DATABASE_USER").pipe(Config.withDefault("postgres")),
  password: Config.redacted("DATABASE_PASSWORD"),
  database: Config.string("DATABASE_NAME").pipe(Config.withDefault("laundry_dev")),
})

export const SqlClientLive = PgClient.layerConfig({
  host: DatabaseConfig.pipe(Config.map((c) => c.host)),
  port: DatabaseConfig.pipe(Config.map((c) => c.port)),
  username: DatabaseConfig.pipe(Config.map((c) => c.username)),
  password: DatabaseConfig.pipe(Config.map((c) => c.password)),
  database: DatabaseConfig.pipe(Config.map((c) => c.database)),
})

export const testConnection = pipe(
  PgClient.PgClient,
  Effect.flatMap((sql) => sql.unsafe<{ connected: number }>("SELECT 1 as connected")),
  Effect.map((result) => result[0]?.connected === 1)
)
