import { Effect } from 'effect'

interface SessionEventInput {
  event: { type: string }
}

interface TuiClient {
  showToast(args: {
    body: { message: string; variant: string; duration: number }
  }): Promise<boolean>
}

export const handleSessionEvent = async (
  input: SessionEventInput,
  _client?: { tui: TuiClient }
): Promise<void> => {
  const program = Effect.gen(function* () {
    if (input.event.type === 'session.created') {
      yield* Effect.log('Orchestration hooks loaded')
    }
  })

  await Effect.runPromise(program)
}
