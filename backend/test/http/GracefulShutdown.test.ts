import { describe, it, expect } from 'vitest'
import { Effect, Logger } from 'effect'
import { gracefulShutdown } from 'src/http/GracefulShutdown'

describe('gracefulShutdown', () => {
  it('completes without error', async () => {
    await expect(Effect.runPromise(gracefulShutdown)).resolves.toBeUndefined()
  })

  it('logs shutdown messages in order', async () => {
    const captured: string[] = []
    const captureLogger = Logger.make(({ message }) => captured.push(String(message)))

    await Effect.runPromise(
      gracefulShutdown.pipe(
        Effect.provide(Logger.replace(Logger.defaultLogger, captureLogger))
      )
    )

    expect(captured).toContain('Starting graceful shutdown...')
    expect(captured).toContain('Database connections closed')
    expect(captured).toContain('Graceful shutdown completed')
    expect(captured.indexOf('Starting graceful shutdown...')).toBeLessThan(
      captured.indexOf('Graceful shutdown completed')
    )
  })
})
