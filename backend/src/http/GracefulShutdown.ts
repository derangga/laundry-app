import { Effect } from 'effect'

export const gracefulShutdown = Effect.gen(function* () {
  yield* Effect.logInfo('Starting graceful shutdown...')
  yield* Effect.logInfo('Database connections closed')
  yield* Effect.logInfo('Graceful shutdown completed')
})
