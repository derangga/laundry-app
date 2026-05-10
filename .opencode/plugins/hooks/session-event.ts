interface SessionEventInput {
  event: { type: string }
}

interface TuiClient {
  showToast(args: {
    body: { message: string; variant: string; duration: number }
  }): Promise<boolean>
}

export function handleSessionEvent(input: SessionEventInput, _client?: { tui: TuiClient }): void {
  if (input.event.type === 'session.created') {
    return
  }
}
