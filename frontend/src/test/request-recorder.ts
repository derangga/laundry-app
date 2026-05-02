import type { SetupServer } from 'msw/node'

export type RecordedRequest = {
  url: string
  method: string
  body: unknown
  headers: Record<string, string>
}

/**
 * Capture every request matching `method` + `urlPattern` (substring match on the
 * pathname). Returns a live array that the server lifecycle pushes into.
 *
 * Usage:
 *   const requests = captureRequests(server, 'POST', '/api/auth/login')
 *   await user.click(submit)
 *   expect(requests[0]?.body).toMatchObject({ email: ... })
 */
export function captureRequests(
  server: SetupServer,
  method: string,
  urlPattern: string,
): RecordedRequest[] {
  const captured: RecordedRequest[] = []
  const expectedMethod = method.toUpperCase()

  server.events.on('request:start', async ({ request }) => {
    if (request.method.toUpperCase() !== expectedMethod) return
    const url = new URL(request.url)
    if (!url.pathname.includes(urlPattern)) return

    const cloned = request.clone()
    let body: unknown = null
    try {
      const text = await cloned.text()
      body = text.length > 0 ? JSON.parse(text) : null
    } catch {
      body = null
    }

    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    captured.push({
      url: request.url,
      method: request.method,
      body,
      headers,
    })
  })

  return captured
}
