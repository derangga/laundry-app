## Phase 12: Logging & Graceful Shutdown

**Status**: ✅ Complete

**Goal**: Implement structured logging with configurable levels and graceful shutdown handling

**Prerequisites**: Phases 0-11 complete (application composition already done)

**Complexity**: Medium

### Overview

This phase adds production-ready logging and graceful shutdown to the backend. The application composition (main.ts, Router.ts, layers) was already in place. This phase focused on:

1. **Structured Logging**: JSON-formatted logs with correlation IDs, configurable log levels, and request/response logging
2. **Graceful Shutdown**: SIGTERM signal handling with ordered shutdown log sequence

### Tasks

#### Task 12.1: Add Logging Configuration ✅

- [x] Added `LOG_LEVEL` (debug/info/warning/error, default: info) and `LOG_FORMAT` (json/pretty, default: pretty) to `src/configs/env.ts` inside `ServerConfig`

#### Task 12.2: Create Custom Logger Service ✅

- [x] Created `src/http/Logger.ts` with `AppLogger` Effect.Service
  - Structured JSON logging: `timestamp`, `level`, `message`, `env`, plus spread context
  - Methods: `debug`, `info`, `warn`, `error` (error includes `error` and `stack` fields)
  - `makeLoggerLayer` configures global Effect logger format and minimum log level at startup

#### Task 12.3: Implement Request Logging Middleware ✅

- [x] Created `src/middleware/RequestLoggingMiddleware.ts`
  - Logs method, path, status, duration on every request
  - Generates a UUID correlation ID per request (added to `X-Request-ID` response header)
  - Extracts authenticated user ID from JWT when present

#### Task 12.4: Application Lifecycle Logging ✅

- [x] `src/main.ts` logs `"Starting laundry-app backend..."` on startup
- [x] `HttpServer.withLogAddress` logs the bound address
- [x] SIGTERM handler logs `"Received SIGTERM, initiating graceful shutdown..."`
- [x] Startup errors are logged via `Effect.tapErrorCause`

#### Task 12.5: Implement Graceful Shutdown ✅

- [x] Created `src/http/GracefulShutdown.ts` — logs shutdown lifecycle messages in order
- [x] `setupShutdownHandlers()` in `main.ts` registers `process.on('SIGTERM', ...)` which runs the shutdown Effect then calls `process.exit(0)`
- [x] SIGINT (Ctrl+C) handled automatically by `BunRuntime.runMain` (fiber interruption) — no custom log by design

#### Task 12.6: Add Error Tracking Context ✅

- [x] `AppLogger.error()` includes error message and stack trace
- [x] `RequestLoggingMiddleware` captures and re-throws errors with logged context

### Verification Steps

- [x] Start with `LOG_LEVEL=debug` → debug logs appear
- [x] Start with `LOG_FORMAT=json` → JSON output
- [x] API requests → request/response logged with correlation IDs (`X-Request-ID`)
- [x] Send SIGTERM (`kill -SIGTERM $(lsof -ti tcp:3000)`) → graceful shutdown log sequence, exits 0
- [x] Press Ctrl+C → process exits cleanly (no custom log — handled by BunRuntime)
- [x] Unit tests: 4 new tests covering `gracefulShutdown` Effect and `AppLogger` service

### Deliverable

Production-ready structured logging with configurable format/level, per-request correlation IDs, and SIGTERM graceful shutdown. 301 tests pass.

### Implementation Notes

- `AppLogger` lives in `src/http/Logger.ts` (not `src/infrastructure/`) to keep it co-located with HTTP lifecycle code
- `Logger.json` in Effect 3.x is a `Layer<never, never, never>` — used directly, not as a Logger instance
- `RequestLoggingMiddleware` must be provided `AppLogger.Default` at the `HttpLive` level (not inside `ApiLayer`) because middleware layers are not automatically given inner layer dependencies
- `process.on(...)` is valid in Bun — Bun fully implements the Node.js `process` global
