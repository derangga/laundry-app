import { Cause, Effect, Exit } from 'effect'
import type { Hooks, PluginInput } from '@opencode-ai/plugin'
import { ShowToastError } from '../lib/errors'
import type { HooksRuntime } from './tool-before'

type EventFn = NonNullable<Hooks['event']>
type EventInput = Parameters<EventFn>[0]

export const handleSessionEvent = async (
  runtime: HooksRuntime,
  client: PluginInput['client'],
  input: EventInput
): Promise<void> => {
  if (input.event.type !== 'session.created') return

  const program = Effect.gen(function* () {
    yield* Effect.log('Orchestration hooks loaded')
    yield* Effect.tryPromise({
      try: () =>
        client.tui.showToast({
          body: { message: 'Orchestration hooks loaded', variant: 'info', duration: 3000 },
        }),
      catch: (cause) => new ShowToastError({ message: String(cause) }),
    }).pipe(
      Effect.catchTag('ShowToastError', (err) =>
        Effect.logWarning(`showToast failed: ${err.message}`)
      )
    )
  })

  const exit = await runtime.runPromiseExit(program)
  if (Exit.isFailure(exit)) {
    console.error('session-event unexpected failure:', Cause.pretty(exit.cause))
  }
}
