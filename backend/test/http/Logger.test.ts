import { describe, it, expect } from 'vitest'
import { Effect, Layer, Logger, ConfigProvider } from 'effect'
import { AppLogger } from 'src/http/Logger'

const TestConfig = Layer.setConfigProvider(
  ConfigProvider.fromMap(
    new Map([
      ['NODE_ENV', 'test'],
      ['PORT', '3000'],
      ['HOST', '0.0.0.0'],
      ['LOG_LEVEL', 'debug'],
      ['LOG_FORMAT', 'pretty'],
      ['CORS_ORIGIN', 'http://localhost'],
    ])
  )
)

describe('AppLogger', () => {
  const run = <A, E>(effect: Effect.Effect<A, E, AppLogger>) =>
    Effect.runPromise(effect.pipe(Effect.provide(AppLogger.Default), Effect.provide(TestConfig)))

  it('info() logs a valid JSON entry', async () => {
    const captured: string[] = []
    const captureLogger = Logger.make(({ message }) => captured.push(String(message)))

    await run(
      Effect.gen(function* () {
        const logger = yield* AppLogger
        yield* logger.info('hello', { requestId: '123' })
      }).pipe(Effect.provide(Logger.replace(Logger.defaultLogger, captureLogger)))
    )

    const entry = JSON.parse(captured[0] ?? '{}') as Record<string, unknown>
    expect(entry.level).toBe('info')
    expect(entry.message).toBe('hello')
    expect(entry.env).toBe('test')
    expect(entry.requestId).toBe('123')
    expect(typeof entry.timestamp).toBe('string')
  })

  it('error() includes error message in entry', async () => {
    const captured: string[] = []
    const captureLogger = Logger.make(({ message }) => captured.push(String(message)))

    await run(
      Effect.gen(function* () {
        const logger = yield* AppLogger
        yield* logger.error('something failed', new Error('boom'))
      }).pipe(Effect.provide(Logger.replace(Logger.defaultLogger, captureLogger)))
    )

    const entry = JSON.parse(captured[0] ?? '{}') as Record<string, unknown>
    expect(entry.level).toBe('error')
    expect(entry.error).toBe('boom')
  })
})
