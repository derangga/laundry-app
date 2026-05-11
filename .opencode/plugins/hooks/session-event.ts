import { Effect } from 'effect'

interface SessionEventInput {
  event: { type: string }
}

export const handleSessionEvent = async (
  input: SessionEventInput,
  client?: unknown
): Promise<void> => {
  const program = Effect.gen(function* () {
    if (input.event.type === 'session.created') {
      yield* Effect.log('Orchestration hooks loaded')
    }
  })

  await Effect.runPromise(program)

  const tui = (
    client as {
      tui?: {
        showToast: (args: {
          body: { message: string; variant: string; duration: number }
        }) => Promise<unknown>
      }
    }
  )?.tui
  if (input.event.type === 'session.created' && tui) {
    await tui.showToast({
      body: { message: 'Orchestration hooks loaded', variant: 'info', duration: 3000 },
    })
  }
}
