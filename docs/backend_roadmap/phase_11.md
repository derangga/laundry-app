## Phase 11: Application Composition

**Goal**: Wire everything together with Effect Layers

**Prerequisites**: Phases 0-10 complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 11.1: Create Main Layer Composition

- [ ] Create `src/main.ts`:

  ```typescript
  import { Effect, Layer } from "effect";
  import { BunRuntime } from "@effect/platform-bun";
  import { SqlLive } from "./infrastructure/database/SqlClient";
  import { HttpServerLive } from "./infrastructure/http/HttpServer";
  import { UserRepository } from "./infrastructure/database/repositories/UserRepository";
  import { CustomerRepository } from "./infrastructure/database/repositories/CustomerRepository";
  // ... import all repositories and services

  // Compose all layers
  const AppLive = Layer.mergeAll(
    SqlLive,
    UserRepository.Default,
    CustomerRepository.Default,
    ServiceRepository.Default,
    OrderRepository.Default,
    OrderItemRepository.Default,
    RefreshTokenRepository.Default,
    PasswordService.Default,
    JwtService.Default,
    CustomerService.Default,
    LaundryServiceService.Default,
    OrderService.Default,
    HttpServerLive,
  );

  // Main program
  const program = Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer;

    yield* Effect.logInfo("Starting server...");
    yield* server.serve(router); // Mount all routes
    yield* Effect.logInfo("Server started successfully");

    // Keep server running
    yield* Effect.never;
  });

  // Run application
  program.pipe(Effect.provide(AppLive), BunRuntime.runMain);
  ```

#### Task 11.2: Mount All Routes

- [ ] Create main router that combines all route handlers
- [ ] Apply middleware (CORS, logging, error handling)
- [ ] Mount router to HTTP server

#### Task 11.3: Add Graceful Shutdown

- [ ] Handle SIGINT and SIGTERM signals
- [ ] Close database connections
- [ ] Stop HTTP server gracefully

#### Task 11.4: Test Application Startup

- [ ] Run application: `bun run dev`
- [ ] Verify server starts without errors
- [ ] Verify database connection works
- [ ] Test sample API calls

### Verification Steps

- [ ] Application starts without errors
- [ ] All layers are composed correctly
- [ ] Database connection is established
- [ ] HTTP server is listening
- [ ] All routes are accessible
- [ ] Middleware is applied correctly
- [ ] Graceful shutdown works

### Deliverable

Fully integrated application with all layers composed and routes mounted
