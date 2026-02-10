import { Effect, Console } from 'effect'

const program = Effect.gen(function* () {
  yield* Console.log('Laundry App Backend - Phase 0 Setup Complete')
  yield* Console.log('Server will be implemented in Phase 1')
})

Effect.runPromise(program).catch(console.error)
