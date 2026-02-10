# Backend Development Roadmap

**Project**: Laundry Management Application Backend
**Version**: 1.0
**Date**: 2026-02-09
**Status**: Planning

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Reference](#quick-reference)
3. [Technology Stack](#technology-stack)
4. [Database Schema Reference](#database-schema-reference)
5. [Phase Details](#phase-details)
   - [Phase 0: Project Setup & Infrastructure](#phase-0-project-setup--infrastructure)
   - [Phase 1: Database Foundation](#phase-1-database-foundation)
   - [Phase 2: Repository Layer](#phase-2-repository-layer)
   - [Phase 3: Authentication & Authorization](#phase-3-authentication--authorization)
   - [Phase 4: Domain Services](#phase-4-domain-services)
   - [Phase 5: HTTP Server & Middleware](#phase-5-http-server--middleware)
   - [Phase 6: API Routes - Authentication](#phase-6-api-routes---authentication)
   - [Phase 7: API Routes - Customers](#phase-7-api-routes---customers)
   - [Phase 8: API Routes - Services](#phase-8-api-routes---services)
   - [Phase 9: API Routes - Orders](#phase-9-api-routes---orders)
   - [Phase 10: Analytics & Reporting](#phase-10-analytics--reporting)
   - [Phase 11: Application Composition](#phase-11-application-composition)
   - [Phase 12: Testing & Documentation](#phase-12-testing--documentation)
   - [Phase 13: Production Readiness](#phase-13-production-readiness)
6. [Development Workflow](#development-workflow)
7. [Common Patterns](#common-patterns)
8. [Appendix](#appendix)

---

## Introduction

This roadmap provides a structured, step-by-step guide to building the laundry management application backend using Effect-TS, Bun, and PostgreSQL. The backend follows modern Effect patterns with clean architecture principles, ensuring maintainability, testability, and type safety throughout.

### Purpose

This document breaks down the backend implementation into 14 distinct phases, each with:

- Clear goals and deliverables
- Specific tasks with acceptance criteria
- Prerequisites and dependencies
- Verification steps
- Estimated complexity

### How to Use This Roadmap

1. **Follow Phases Sequentially**: Phases 0-5 must be completed in order as they build upon each other
2. **Parallelize Where Possible**: API route phases (6-10) can be built in any order after Phase 5
3. **Complete Verification**: Check all verification steps before moving to the next phase
4. **Reference the ADR**: Consult `/docs/ADR_BACKEND.md` for architectural patterns and decisions
5. **Track Progress**: Update phase status as you complete tasks

### Architectural Principles

All implementation must follow these core principles from the ADR:

1. **Always use `Model.Class`** for database entities (not `Schema.Struct`)
2. **Always use `Effect.Service`** for repositories and services (not manual `Context.Tag`)
3. **Database naming**: All tables and columns use `snake_case`
4. **TypeScript naming**: Application code uses `camelCase`, but Model.Class properties match database columns exactly (`snake_case`)
5. **UUID v7**: All entity IDs use UUID v7 for better indexing performance
6. **Error handling**: Use typed Effect errors throughout
7. **Validation**: Use `@effect/schema` at boundaries (HTTP requests, database queries)
8. **Testing**: Test each layer independently with mock dependencies

### Related Documentation

- **Architecture Decisions**: `/docs/ADR_BACKEND.md` - Detailed rationale for all architectural choices
- **Project Overview**: `/CLAUDE.md` - Business requirements and domain model
- **Database Schema**: See [Database Schema Reference](#database-schema-reference) section below

---

## Quick Reference

### Phase Overview

| Phase  | Name                           | Complexity | Dependencies | Estimated Effort |
| ------ | ------------------------------ | ---------- | ------------ | ---------------- |
| **0**  | Project Setup & Infrastructure | Simple     | None         | 2-4 hours        |
| **1**  | Database Foundation            | Medium     | Phase 0      | 4-6 hours        |
| **2**  | Repository Layer               | Medium     | Phase 1      | 4-6 hours        |
| **3**  | Authentication & Authorization | Complex    | Phase 2      | 6-8 hours        |
| **4**  | Domain Services                | Complex    | Phase 2      | 6-8 hours        |
| **5**  | HTTP Server & Middleware       | Medium     | Phase 0      | 4-6 hours        |
| **6**  | API Routes - Authentication    | Medium     | Phase 3, 5   | 3-4 hours        |
| **7**  | API Routes - Customers         | Simple     | Phase 4, 5   | 2-3 hours        |
| **8**  | API Routes - Services          | Simple     | Phase 4, 5   | 2-3 hours        |
| **9**  | API Routes - Orders            | Complex    | Phase 4, 5   | 6-8 hours        |
| **10** | Analytics & Reporting          | Medium     | Phase 2, 5   | 4-6 hours        |
| **11** | Application Composition        | Simple     | All above    | 2-3 hours        |
| **12** | Testing & Documentation        | Medium     | All above    | 6-8 hours        |
| **13** | Production Readiness           | Medium     | All above    | 4-8 hours        |

**Total Estimated Effort**: 55-79 hours

### Critical Path

```
Phase 0 (Setup)
    ↓
Phase 1 (Database)
    ↓
Phase 2 (Repositories)
    ↓
    ├─→ Phase 3 (Auth) ──→ Phase 6 (Auth API)
    ├─→ Phase 4 (Domain Services) ──→ Phase 7 (Customers API)
    │                              ├─→ Phase 8 (Services API)
    │                              └─→ Phase 9 (Orders API)
    └─→ Phase 5 (HTTP Server) ─────→ Phase 10 (Analytics API)
                    ↓
            Phase 11 (Composition)
                    ↓
            Phase 12 (Testing)
                    ↓
            Phase 13 (Production)
```

### Dependencies Diagram

- **Phase 0**: No dependencies (start here)
- **Phase 1**: Requires Phase 0
- **Phase 2**: Requires Phase 1
- **Phase 3**: Requires Phase 2
- **Phase 4**: Requires Phase 2
- **Phase 5**: Requires Phase 0
- **Phase 6**: Requires Phase 3, 5
- **Phase 7**: Requires Phase 4, 5
- **Phase 8**: Requires Phase 4, 5
- **Phase 9**: Requires Phase 4, 5
- **Phase 10**: Requires Phase 2, 5
- **Phase 11**: Requires Phases 0-10
- **Phase 12**: Can run alongside Phases 6-11
- **Phase 13**: Requires all previous phases

---

## Technology Stack

### Core Technologies

- **Runtime**: Bun (≥1.0) - Fast JavaScript runtime with native TypeScript support
- **Language**: TypeScript (≥5.0) - Type-safe JavaScript
- **Database**: PostgreSQL 18 - Relational database with UUID v7 support
- **Framework**: Effect-TS with @effect/platform-bun - Pure Effect for HTTP handling

### Effect Ecosystem

- `effect` - Core Effect library with `Effect.Service` for DI
- `@effect/platform` - Platform abstractions
- `@effect/platform-bun` - Bun-specific HTTP server
- `@effect/schema` - Validation and serialization
- `@effect/sql` - SQL database layer with `Model.Class` utilities
- `@effect/sql-pg` - PostgreSQL driver

### Authentication & Security

- `jose` - JWT signing and verification
- `@node-rs/bcrypt` - Fast password hashing (Rust-based)

### Development Tools

- `vitest` - Testing framework
- `@effect/vitest` - Effect testing utilities
- `prettier` - Code formatting
- `eslint` - Linting

### Database Tools

- `golang-migrate` or `node-pg-migrate` - Database migrations
- `pg` - PostgreSQL client (peer dependency)

---

## Database Schema Reference

### Complete Schema

All tables use UUID v7 for primary keys, `snake_case` naming, and timestamps for audit trails.

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID v7
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

#### Customers Table

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID v7
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL, -- Format: +62XXXXXXXXX
  address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
```

#### Services Table

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID v7
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  unit_type VARCHAR(10) NOT NULL CHECK (unit_type IN ('kg', 'set')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Soft delete flag
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_is_active ON services(is_active);
```

#### Orders Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID v7
  order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., ORD-20260209-001
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'in_progress', 'ready', 'delivered')),
  payment_status VARCHAR(10) NOT NULL CHECK (payment_status IN ('paid', 'unpaid')),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  created_by UUID NOT NULL REFERENCES users(id), -- Staff who created order
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
```

#### Order Items Table

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID v7
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0), -- kg or count
  price_at_order DECIMAL(10, 2) NOT NULL CHECK (price_at_order >= 0), -- Price snapshot
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0), -- price_at_order × quantity
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_service_id ON order_items(service_id);
```

#### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID v7
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL, -- Hashed refresh token
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP -- NULL if not revoked
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

### Entity Relationships

```
users (1) ─────────< (N) orders
users (1) ─────────< (N) refresh_tokens
customers (1) ─────< (N) orders
orders (1) ────────< (N) order_items
services (1) ──────< (N) order_items
```

### UUID v7 Implementation

**Why UUID v7**:

- Time-ordered UUIDs (sortable by creation time)
- Better database indexing performance vs UUID v4
- Locality in B-tree indexes reduces fragmentation
- Native support in PostgreSQL 18+

**Implementation**:

```sql
-- PostgreSQL 18 native support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Use gen_random_uuid() with v7 algorithm or pg_uuidv7 extension
```

**In Effect-TS**:

```typescript
class Customer extends Model.Class<Customer>("Customer")({
  id: Model.Generated(Schema.String), // PostgreSQL generates UUID v7
  // ... other fields
}) {}
```

### Migration Strategy

1. **Tool**: Use `golang-migrate` for SQL migrations
2. **Location**: `/backend/migrations/`
3. **Naming**: Timestamp-based (e.g., `000001_create_users_table.up.sql`)
4. **Process**: Run migrations during deployment before starting the app

---

## Phase Details

| Phase | Task Document                  |
| ----- | ------------------------------ |
| 0     | [Phase 0 task](./phase_0.md)   |
| 1     | [Phase 1 task](./phase_1.md)   |
| 2     | [Phase 2 task](./phase_2.md)   |
| 3     | [Phase 3 task](./phase_3.md)   |
| 4     | [Phase 4 task](./phase_4.md)   |
| 5     | [Phase 5 task](./phase_5.md)   |
| 6     | [Phase 6 task](./phase_6.md)   |
| 7     | [Phase 7 task](./phase_7.md)   |
| 8     | [Phase 8 task](./phase_8.md)   |
| 9     | [Phase 9 task](./phase_9.md)   |
| 10    | [Phase 10 task](./phase_10.md) |
| 11    | [Phase 11 task](./phase_11.md) |
| 12    | [Phase 12 task](./phase_12.md) |
| 13    | [Phase 13 task](./phase_13.md) |

---

## Development Workflow

### Getting Started

1. **Clone repository and navigate to backend**:

   ```bash
   cd /backend
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start PostgreSQL**:

   ```bash
   # Via Docker
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:18

   # Or use local installation
   ```

5. **Run migrations**:

   ```bash
   bun run migrate:up
   ```

6. **Start development server**:
   ```bash
   bun run dev
   ```

### Daily Development Workflow

1. **Start with tests**: Write tests for the feature you're building
2. **Implement feature**: Follow the patterns from the ADR
3. **Run tests**: Ensure all tests pass
4. **Manual testing**: Test the API endpoints
5. **Code review**: Check adherence to patterns
6. **Commit**: Create meaningful commit messages

### Testing Strategy

**Unit Tests** (Fast, no I/O):

- Test domain services with mocked repositories
- Test business logic and validation
- Test error handling

**Integration Tests** (Database required):

- Test repositories against real database
- Test HTTP routes end-to-end
- Use test database

**E2E Tests** (Full stack):

- Test complete workflows
- Test user journeys
- Verify production-like scenarios

**Run tests**:

```bash
# All tests
bun test

# Watch mode
bun test:watch

# Specific file
bun test src/domain/customer/__tests__/CustomerService.test.ts
```

### Common Commands

```bash
# Development
bun run dev                  # Start dev server with watch mode
bun run build                # Build for production
bun run start                # Start production server

# Testing
bun test                     # Run all tests
bun test:watch               # Run tests in watch mode

# Database
bun run migrate:up           # Run migrations
bun run migrate:down         # Rollback migration
bun run migrate:create name  # Create new migration

# Code quality
bun run format               # Format code with Prettier
bun run lint                 # Lint code with ESLint
```

### Debugging Tips

1. **Use Effect.logDebug**: Add logging throughout Effect chains
2. **Use Effect.tap**: Inspect values without changing the flow
3. **Check error types**: Ensure errors are properly typed
4. **Test in isolation**: Use test layers to isolate components
5. **Check Layer composition**: Ensure all dependencies are provided

---

## Common Patterns

### Pattern 1: Creating a New Repository

```typescript
import { SqlClient, Model } from "@effect/sql";
import { Effect, Option } from "effect";
import { YourEntity } from "@domain/your-entity/YourEntity";

export class YourRepository extends Effect.Service<YourRepository>()(
  "YourRepository",
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const repo = yield* Model.makeRepository(YourEntity, {
        tableName: "your_table",
        spanPrefix: "YourRepository",
        idColumn: "id",
      });

      // Add custom methods
      const findByField = (field: string) =>
        sql<YourEntity>`SELECT * FROM your_table WHERE field = ${field}`;

      return {
        ...repo, // findById, insert, update, delete
        findByField,
      };
    }),
    dependencies: [],
  },
) {}
```

### Pattern 2: Creating a Domain Service

```typescript
import { Effect, Option } from "effect";
import { YourRepository } from "@infrastructure/database/repositories/YourRepository";
import { YourError } from "./YourErrors";

export class YourService extends Effect.Service<YourService>()("YourService", {
  effect: Effect.gen(function* () {
    const repo = yield* YourRepository;

    const businessMethod = (input: string) =>
      Effect.gen(function* () {
        // Business logic here
        const result = yield* repo.findByField(input);

        if (Option.isNone(result)) {
          return yield* Effect.fail(new YourError({ input }));
        }

        return result.value;
      });

    return {
      businessMethod,
    };
  }),
  dependencies: [YourRepository.Default],
}) {}
```

### Pattern 3: Creating an API Route

```typescript
import { HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { parseBody } from "@infrastructure/http/RequestParser";
import { YourService } from "@domain/your-entity/YourService";
import { YourRequestSchema, YourResponseSchema } from "./schemas";

export const yourRoute = Effect.gen(function* () {
  const yourService = yield* YourService;

  // Parse and validate request
  const request = yield* parseBody(YourRequestSchema);

  // Call domain service
  const result = yield* yourService.businessMethod(request.field);

  // Return response
  return yield* HttpServerResponse.json(result);
});
```

### Pattern 4: Error Handling

```typescript
// Define typed errors
export class YourError extends Data.TaggedError("YourError")<{
  field: string;
  reason?: string;
}> {}

// Use errors in service
const service = Effect.gen(function* () {
  const result = yield* someOperation();

  if (!result) {
    return yield* Effect.fail(new YourError({ field: "value" }));
  }

  return result;
});

// Handle errors in HTTP layer
service.pipe(
  Effect.catchTag("YourError", (error) =>
    HttpServerResponse.json(
      { error: { code: "YOUR_ERROR", message: error.reason } },
      { status: 400 },
    ),
  ),
);
```

### Pattern 5: Testing with Mock Layers

```typescript
import { describe, test, expect } from "vitest";
import { Effect, Layer } from "effect";

describe("YourService", () => {
  test("should do something", async () => {
    // Create mock repository
    const MockRepo = Layer.succeed(
      YourRepository,
      YourRepository.of({
        findById: (id) => Effect.succeed(Option.some(mockData)),
        insert: (data) => Effect.succeed(mockData),
        // ... other methods
      }),
    );

    // Test program
    const program = Effect.gen(function* () {
      const service = yield* YourService;
      return yield* service.businessMethod("test");
    }).pipe(Effect.provide(MockRepo), Effect.provide(YourService.Default));

    const result = await Effect.runPromise(program);
    expect(result).toBeDefined();
  });
});
```

---

## Appendix

### A. Common Issues and Solutions

**Issue: "Service not found in context"**

- Solution: Ensure the service layer is provided in the Layer composition
- Check that dependencies are listed in the service definition

**Issue: "Database connection failed"**

- Solution: Verify PostgreSQL is running
- Check environment variables are correct
- Ensure database exists

**Issue: "JWT verification failed"**

- Solution: Check JWT_SECRET is consistent
- Verify token hasn't expired
- Check token format (Bearer prefix)

**Issue: "Migration failed"**

- Solution: Check migration SQL syntax
- Verify database permissions
- Check for conflicting migrations

**Issue: "Tests failing with database errors"**

- Solution: Use test database
- Ensure migrations run before tests
- Clean up test data between tests

### B. Effect-TS Resources

**Official Documentation**:

- Effect Website: https://effect.website
- Effect GitHub: https://github.com/Effect-TS/effect
- Effect Discord: https://discord.gg/effect-ts

**Useful Guides**:

- Effect Style Guide: https://effect.website/docs/style-guide
- Schema Guide: https://effect.website/docs/schema
- SQL Guide: https://effect.website/docs/sql
- Platform Guide: https://effect.website/docs/platform

### C. Database Tools

**GUI Tools**:

- pgAdmin: PostgreSQL administration
- TablePlus: Multi-database GUI
- DBeaver: Universal database tool

**CLI Tools**:

- `psql`: PostgreSQL command line
- `pg_dump`: Database backup
- `pg_restore`: Database restore

### D. Recommended VS Code Extensions

- **Effect TypeScript**: Effect-specific tooling
- **PostgreSQL**: SQL syntax highlighting
- **REST Client**: Test API endpoints
- **Vitest**: Test runner integration
- **Prettier**: Code formatting

### E. Project Checklist

Before moving to next phase:

- [ ] All tasks completed
- [ ] All tests passing
- [ ] Code follows ADR patterns
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Verification steps checked
- [ ] Documentation updated

### F. Glossary

**Terms**:

- **Effect**: Composable, type-safe side effect management
- **Layer**: Dependency injection container
- **Service**: Reusable component with dependencies
- **Repository**: Data access abstraction
- **Use Case**: Application-specific business operation
- **Middleware**: Request/response interceptor
- **Schema**: Type-safe data structure definition
- **Model.Class**: Database entity with CRUD operations
- **UUID v7**: Time-ordered universally unique identifier

---

## Conclusion

This roadmap provides a comprehensive, step-by-step guide to building the laundry management application backend. Follow each phase sequentially, complete all verification steps, and reference the ADR for architectural decisions.

**Key Success Factors**:

1. Follow Effect patterns consistently
2. Write tests alongside implementation
3. Validate at system boundaries
4. Handle errors explicitly with typed errors
5. Document as you go
6. Review code against ADR principles

**Next Steps**:

1. Start with Phase 0: Project Setup & Infrastructure
2. Complete each phase before moving to the next
3. Run verification steps after each phase
4. Update this roadmap with lessons learned

Good luck with the implementation! 🚀
