## Phase 12: Logging & Graceful Shutdown

**Goal**: Implement structured logging with configurable levels and graceful shutdown handling

**Prerequisites**: Phases 0-11 complete (application composition already done)

**Complexity**: Medium

**Estimated Time**: 3-4 hours

### Overview

This phase enhances the application with production-ready logging and graceful shutdown capabilities. The application composition (main.ts, Router.ts, layers) is already implemented. This phase focuses on:

1. **Structured Logging**: JSON-formatted logs with correlation IDs, configurable log levels, and request/response logging
2. **Graceful Shutdown**: Proper signal handling to close database connections and finish in-flight requests

### Tasks

#### Task 12.1: Add Logging Configuration

- [ ] Add log level configuration to `src/configs/env.ts`:
  - `LOG_LEVEL`: Log level (debug, info, warning, error) - default to 'info' in production, 'debug' in development
  - `LOG_FORMAT`: Output format (json, pretty) - default to 'json' in production

- [ ] Update `ServerConfig` to include logging options:
  ```typescript
  export const ServerConfig = Config.all({
    port: Config.integer('PORT').pipe(Config.withDefault(3000)),
    host: Config.string('HOST').pipe(Config.withDefault('0.0.0.0')),
    nodeEnv: Config.string('NODE_ENV').pipe(Config.withDefault('development')),
    logLevel: Config.literal('debug', 'info', 'warning', 'error')('LOG_LEVEL')
      .pipe(Config.withDefault('info')),
    logFormat: Config.literal('json', 'pretty')('LOG_FORMAT')
      .pipe(Config.withDefault('pretty')),
  })
  ```

#### Task 12.2: Create Custom Logger Service

- [ ] Create `src/infrastructure/logging/Logger.ts`:
  - Custom `Effect.Service` for application logging
  - Structured JSON logging with timestamp, level, message, context
  - Methods: `debug`, `info`, `warn`, `error`
  - Support for correlation IDs and contextual logging
  - Integration with Effect's built-in Logger

- [ ] Example implementation:
  ```typescript
  export class AppLogger extends Effect.Service<AppLogger>()('AppLogger', {
    effect: Effect.gen(function* () {
      const config = yield* ServerConfig
      
      const createLogEntry = (level: string, message: string, context?: object) => ({
        timestamp: new Date().toISOString(),
        level,
        message,
        env: config.nodeEnv,
        ...context,
      })
      
      return {
        debug: (msg: string, ctx?: object) => Effect.logDebug(JSON.stringify(createLogEntry('debug', msg, ctx))),
        info: (msg: string, ctx?: object) => Effect.logInfo(JSON.stringify(createLogEntry('info', msg, ctx))),
        warn: (msg: string, ctx?: object) => Effect.logWarning(JSON.stringify(createLogEntry('warn', msg, ctx))),
        error: (msg: string, error?: Error, ctx?: object) => 
          Effect.logError(JSON.stringify(createLogEntry('error', msg, { ...ctx, error: error?.message, stack: error?.stack }))),
      }
    }),
    dependencies: [ServerConfig],
  }) {}
  ```

#### Task 12.3: Implement Request Logging Middleware

- [ ] Create `src/middleware/RequestLoggingMiddleware.ts`:
  - Log all incoming requests with method, path, query params, user agent
  - Log response status and duration
  - Add correlation ID to each request (X-Request-ID header or generated UUID)
  - Skip logging for health check endpoints (if any)
  - Include authenticated user ID when available

- [ ] Integrate with existing `AuthMiddleware` to extract user context

#### Task 12.4: Add Application Lifecycle Logging

- [ ] Update `src/main.ts` with startup/shutdown logging:
  - Log server startup with configuration details
  - Log database connection status
  - Log successful startup completion
  - Log shutdown initiation and completion

- [ ] Add error logging in error handlers with proper context

#### Task 12.5: Implement Graceful Shutdown

- [ ] Create `src/infrastructure/shutdown/GracefulShutdown.ts`:
  ```typescript
  export const gracefulShutdown = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    
    yield* Effect.logInfo('Received shutdown signal, starting graceful shutdown...')
    
    // Close database connection pool
    yield* sql.close.pipe(
      Effect.tap(() => Effect.logInfo('Database connections closed')),
      Effect.tapError((error) => Effect.logError('Failed to close database connections', error))
    )
    
    yield* Effect.logInfo('Graceful shutdown completed')
  })
  ```

- [ ] Create signal handler in `src/main.ts`:
  ```typescript
  const setupShutdownHandlers = (program: Effect.Effect<void>) => 
    Effect.sync(() => {
      const shutdown = (signal: string) => 
        Effect.runFork(
          Effect.gen(function* () {
            yield* Effect.logInfo(`Received ${signal}, initiating graceful shutdown...`)
            yield* gracefulShutdown
            yield* Effect.sync(() => process.exit(0))
          })
        )
      
      process.on('SIGINT', () => shutdown('SIGINT'))
      process.on('SIGTERM', () => shutdown('SIGTERM'))
    })
  ```

#### Task 12.6: Add Error Tracking Context

- [ ] Enhance error logging in handlers to include:
  - Request context (path, method, user ID)
  - Error stack traces (in development)
  - Error categorization (validation, auth, database, etc.)

- [ ] Create utility function for consistent error logging across handlers

### Verification Steps

- [ ] Start application with `LOG_LEVEL=debug` and verify debug logs appear
- [ ] Start application with `LOG_FORMAT=json` and verify JSON output
- [ ] Make API requests and verify request/response logging with correlation IDs
- [ ] Send SIGINT (Ctrl+C) and verify graceful shutdown sequence
- [ ] Send SIGTERM and verify graceful shutdown sequence
- [ ] Verify database connections are closed during shutdown
- [ ] Check logs include proper timestamps and structured format
- [ ] Verify user context appears in logs for authenticated requests

### Deliverable

Production-ready logging with structured JSON output, configurable levels, request tracing with correlation IDs, and proper graceful shutdown handling for SIGINT/SIGTERM signals.

### Notes

- The existing `HttpMiddleware.logger` provides basic request logging; this phase adds structured, contextual logging
- Consider using Effect's built-in `Logger` with custom `Logger.replace` for global logger configuration
- Ensure no sensitive data (passwords, tokens) is logged
- Correlation IDs help trace requests across logs in distributed systems
