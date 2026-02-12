import { Config, Effect } from 'effect'
import * as Bun from 'bun'
import { ConfigError } from 'effect/ConfigError'

const DatabaseConfig = Config.all({
  host: Config.string('DATABASE_HOST'),
  port: Config.integer('DATABASE_PORT'),
  username: Config.string('DATABASE_USER'),
  password: Config.string('DATABASE_PASSWORD'),
  database: Config.string('DATABASE_NAME'),
}).pipe(
  Config.withDefault({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'laundry_app',
  })
)

function runMigration(direction: 'up' | 'down'): Effect.Effect<void, ConfigError | Error, never> {
  return Effect.gen(function* () {
    const config = yield* DatabaseConfig
    const databaseUrl = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=disable`
    const migrationsDir = 'migrations/'

    const cmd =
      direction === 'up'
        ? ['migrate', '-path', migrationsDir, '-database', databaseUrl, 'up']
        : ['migrate', '-path', migrationsDir, '-database', databaseUrl, 'down', '1']

    console.log(`Running migration ${direction}...`)
    console.log(cmd)

    const result = Bun.spawnSync({ cmd, stdout: 'inherit', stderr: 'inherit' })

    if (result.exitCode !== 0) {
      yield* Effect.fail(
        new Error(`Migration ${direction} failed with exit code ${result.exitCode}`)
      )
    }

    console.log(`Migration ${direction} completed successfully.`)
  })
}

const args = process.argv.slice(2)
const command = args[0]?.toLowerCase()

const program =
  command === 'up'
    ? runMigration('up')
    : command === 'down'
      ? runMigration('down')
      : Effect.gen(function* () {
          console.log('Usage: bun migrations/index.ts <up|down>')
          yield* Effect.fail(new Error('Invalid command'))
        })

Effect.runPromise(program)
