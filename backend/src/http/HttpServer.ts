import { BunHttpServer } from '@effect/platform-bun'
import { Effect, Layer, Config } from 'effect'

// Create HTTP server layer from config
export const HttpServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const port = yield* Config.number('PORT').pipe(Config.withDefault(3000))
    const host = yield* Config.string('HOST').pipe(Config.withDefault('0.0.0.0'))
    return BunHttpServer.layer({ port, hostname: host })
  })
)
