import { describe, it, expect } from "vitest"
import { Effect, Layer, ConfigProvider, pipe } from "effect"
import { PgClient } from "@effect/sql-pg"
import { SqlClientLive, testConnection } from "@infrastructure/database/SqlClient"

const TestConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["DATABASE_HOST", "localhost"],
    ["DATABASE_PORT", "5432"],
    ["DATABASE_USER", "postgres"],
    ["DATABASE_PASSWORD", "password"],
    ["DATABASE_NAME", "laundry_dev"],
  ])
)

const TestConfig = Layer.setConfigProvider(TestConfigProvider)

describe("Database Connection", () => {
  it("should connect to PostgreSQL successfully", async () => {
    const program = testConnection.pipe(
      Effect.provide(SqlClientLive),
      Effect.provide(TestConfig),
      Effect.scoped
    )

    const result = await Effect.runPromise(program)
    expect(result).toBe(true)
  })

  it("should execute a simple query", async () => {
    const program = pipe(
      PgClient.PgClient,
      Effect.flatMap((sql) => sql.unsafe<{ db_name: string }>("SELECT current_database() as db_name")),
      Effect.map((result) => result[0]?.db_name),
      Effect.provide(SqlClientLive),
      Effect.provide(TestConfig),
      Effect.scoped
    )

    const dbName = await Effect.runPromise(program)
    expect(dbName).toBe("laundry_dev")
  })
})
