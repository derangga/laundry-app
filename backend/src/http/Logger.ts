import { Effect, Layer, Logger, LogLevel } from 'effect'
import { ServerConfig } from '@configs/env'

export class AppLogger extends Effect.Service<AppLogger>()('AppLogger', {
  effect: Effect.gen(function* () {
    const config = yield* ServerConfig

    const makeEntry = (level: string, message: string, ctx?: object) => ({
      timestamp: new Date().toISOString(),
      level,
      message,
      env: config.nodeEnv,
      ...ctx,
    })

    return {
      debug: (msg: string, ctx?: object) =>
        Effect.logDebug(JSON.stringify(makeEntry('debug', msg, ctx))),
      info: (msg: string, ctx?: object) =>
        Effect.logInfo(JSON.stringify(makeEntry('info', msg, ctx))),
      warn: (msg: string, ctx?: object) =>
        Effect.logWarning(JSON.stringify(makeEntry('warn', msg, ctx))),
      error: (msg: string, err?: unknown, ctx?: object) =>
        Effect.logError(
          JSON.stringify(
            makeEntry('error', msg, {
              ...ctx,
              error: err instanceof Error ? err.message : String(err ?? ''),
              stack: err instanceof Error ? err.stack : undefined,
            })
          )
        ),
    }
  }),
}) {}

// Layer that configures the global Effect logger format and minimum level
export const makeLoggerLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { logLevel, logFormat } = yield* ServerConfig

    const level =
      logLevel === 'debug'
        ? LogLevel.Debug
        : logLevel === 'warning'
          ? LogLevel.Warning
          : logLevel === 'error'
            ? LogLevel.Error
            : LogLevel.Info

    // Logger.json is a Layer<never, never, never> that replaces the default logger with JSON output
    // For 'pretty' format, we keep the default logger (no replacement needed)
    const logFormatLayer = logFormat === 'json' ? Logger.json : Layer.empty

    return Layer.mergeAll(logFormatLayer, Logger.minimumLogLevel(level))
  })
)
