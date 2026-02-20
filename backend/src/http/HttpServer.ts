import { ServerConfig } from '@configs/env'
import { BunHttpServer } from '@effect/platform-bun'
import { Effect, Layer } from 'effect'

// Create HTTP server layer from config
export const HttpServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const server = yield* ServerConfig
    yield* Effect.logInfo(`Server configured on ${server.host}:${server.port}`)
    return BunHttpServer.layer({ hostname: server.host, port: server.port })
  })
)
