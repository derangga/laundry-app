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
    const whichResult = Bun.spawnSync({ cmd: ['which', 'migrate'], stdout: 'pipe', stderr: 'pipe' })
    if (whichResult.exitCode !== 0) {
      yield* Effect.fail(new Error('Please install golang-migrate first'))
    }

    const config = yield* DatabaseConfig

    const isReachable = yield* Effect.tryPromise({
      try: () =>
        new Promise<boolean>((resolve) => {
          Bun.connect({
            hostname: config.host,
            port: config.port,
            socket: {
              open(socket) { socket.end(); resolve(true) },
              error() { resolve(false) },
              data() {},
            },
          })
        }),
      catch: () => new Error('Can not connect to PostgreSQL'),
    })
    if (!isReachable) {
      yield* Effect.fail(new Error(`Can not connect to PostgreSQL at ${config.host}:${config.port}`))
    }

    const databaseUrl = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=disable`
    const migrationsDir = 'migrations/'

    const cmd =
      direction === 'up'
        ? ['migrate', '-path', migrationsDir, '-database', databaseUrl, 'up']
        : ['migrate', '-path', migrationsDir, '-database', databaseUrl, 'down', '1']

    yield* Effect.log(`Running migration ${direction}...`)

    const result = Bun.spawnSync({ cmd, stdout: 'inherit', stderr: 'inherit' })

    if (result.exitCode !== 0) {
      yield* Effect.fail(
        new Error(`Migration ${direction} failed with exit code ${result.exitCode}`)
      )
    }

    yield* Effect.log(`Migration ${direction} completed successfully.`)
  })
}

const args = process.argv.slice(2)
const command = args[0]?.toLowerCase()

const program =
  command === 'up'
    ? runMigration('up')
    : command === 'down'
      ? runMigration('down')
      : Effect.fail(new Error('Usage: bun migrations/index.ts <up|down>'))

program.pipe(
  Effect.catchAll((error) =>
    Effect.logError(error.message ?? String(error)).pipe(
      Effect.andThen(Effect.sync(() => process.exit(1)))
    )
  ),
  Effect.runPromise
)
