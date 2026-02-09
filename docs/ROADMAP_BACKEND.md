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

| Phase | Name | Complexity | Dependencies | Estimated Effort |
|-------|------|------------|--------------|------------------|
| **0** | Project Setup & Infrastructure | Simple | None | 2-4 hours |
| **1** | Database Foundation | Medium | Phase 0 | 4-6 hours |
| **2** | Repository Layer | Medium | Phase 1 | 4-6 hours |
| **3** | Authentication & Authorization | Complex | Phase 2 | 6-8 hours |
| **4** | Domain Services | Complex | Phase 2 | 6-8 hours |
| **5** | HTTP Server & Middleware | Medium | Phase 0 | 4-6 hours |
| **6** | API Routes - Authentication | Medium | Phase 3, 5 | 3-4 hours |
| **7** | API Routes - Customers | Simple | Phase 4, 5 | 2-3 hours |
| **8** | API Routes - Services | Simple | Phase 4, 5 | 2-3 hours |
| **9** | API Routes - Orders | Complex | Phase 4, 5 | 6-8 hours |
| **10** | Analytics & Reporting | Medium | Phase 2, 5 | 4-6 hours |
| **11** | Application Composition | Simple | All above | 2-3 hours |
| **12** | Testing & Documentation | Medium | All above | 6-8 hours |
| **13** | Production Readiness | Medium | All above | 4-8 hours |

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
2. **Location**: `/applications/backend/migrations/`
3. **Naming**: Timestamp-based (e.g., `000001_create_users_table.up.sql`)
4. **Process**: Run migrations during deployment before starting the app

---

## Phase Details

## Phase 0: Project Setup & Infrastructure

**Goal**: Set up the development environment and project structure

**Prerequisites**: None (starting point)

**Complexity**: Simple

**Estimated Time**: 2-4 hours

### Tasks

#### Task 0.1: Initialize Bun Workspace
- [ ] Create `/applications/backend` directory
- [ ] Initialize Bun package: `bun init`
- [ ] Set up workspace in root `package.json`:
  ```json
  {
    "workspaces": ["applications/*", "packages/*"]
  }
  ```

#### Task 0.2: Install Core Dependencies
- [ ] Install Effect ecosystem:
  ```bash
  bun add effect @effect/platform @effect/platform-bun @effect/schema @effect/sql @effect/sql-pg
  ```
- [ ] Install database client: `bun add pg`
- [ ] Install authentication: `bun add jose @node-rs/bcrypt`
- [ ] Install dev dependencies:
  ```bash
  bun add -d typescript @types/node @types/pg vitest @effect/vitest prettier eslint
  ```

#### Task 0.3: Configure TypeScript
- [ ] Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "lib": ["ES2022"],
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "outDir": "./dist",
      "rootDir": "./src",
      "baseUrl": "./src",
      "paths": {
        "@domain/*": ["domain/*"],
        "@application/*": ["application/*"],
        "@infrastructure/*": ["infrastructure/*"],
        "@api/*": ["api/*"],
        "@shared/*": ["shared/*"]
      }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test"]
  }
  ```

#### Task 0.4: Create Project Structure
- [ ] Create directory structure:
  ```
  /applications/backend/
  ├── src/
  │   ├── domain/
  │   │   ├── customer/
  │   │   ├── order/
  │   │   ├── service/
  │   │   └── user/
  │   ├── application/
  │   │   ├── auth/
  │   │   ├── customer/
  │   │   ├── order/
  │   │   ├── analytics/
  │   │   └── receipt/
  │   ├── infrastructure/
  │   │   ├── database/
  │   │   │   └── repositories/
  │   │   ├── http/
  │   │   │   └── middleware/
  │   │   └── config/
  │   ├── api/
  │   │   ├── auth/
  │   │   ├── customers/
  │   │   ├── orders/
  │   │   ├── services/
  │   │   ├── analytics/
  │   │   └── receipts/
  │   ├── shared/
  │   │   ├── errors/
  │   │   └── schemas/
  │   └── main.ts
  ├── test/
  ├── migrations/
  ├── package.json
  ├── tsconfig.json
  └── vitest.config.ts
  ```

#### Task 0.5: Configure Vitest
- [ ] Create `vitest.config.ts`:
  ```typescript
  import { defineConfig } from 'vitest/config'
  import path from 'path'

  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
    },
    resolve: {
      alias: {
        '@domain': path.resolve(__dirname, './src/domain'),
        '@application': path.resolve(__dirname, './src/application'),
        '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        '@api': path.resolve(__dirname, './src/api'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
  })
  ```

#### Task 0.6: Set Up Environment Variables
- [ ] Create `.env.example`:
  ```env
  # Database
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_NAME=laundry_dev
  DATABASE_USER=postgres
  DATABASE_PASSWORD=postgres

  # JWT
  JWT_SECRET=your-super-secret-jwt-key-min-32-chars
  JWT_ACCESS_EXPIRY=15m
  JWT_REFRESH_EXPIRY=7d

  # Server
  PORT=3000
  CORS_ORIGIN=http://localhost:5173
  NODE_ENV=development
  ```
- [ ] Create `.env` file (gitignored)
- [ ] Add `.env` to `.gitignore`

#### Task 0.7: Configure Development Tools
- [ ] Create `.prettierrc`:
  ```json
  {
    "semi": false,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100
  }
  ```
- [ ] Create `.prettierignore`:
  ```
  node_modules
  dist
  coverage
  ```

#### Task 0.8: Add Package Scripts
- [ ] Update `package.json`:
  ```json
  {
    "scripts": {
      "dev": "bun --watch src/main.ts",
      "build": "bun build src/main.ts --outdir dist --target bun",
      "start": "bun dist/main.js",
      "test": "vitest",
      "test:watch": "vitest --watch",
      "format": "prettier --write \"src/**/*.ts\"",
      "lint": "eslint src --ext .ts",
      "migrate:up": "migrate -path ./migrations -database $DATABASE_URL up",
      "migrate:down": "migrate -path ./migrations -database $DATABASE_URL down",
      "migrate:create": "migrate create -ext sql -dir migrations -seq"
    }
  }
  ```

### Key Files to Create

- `/applications/backend/package.json`
- `/applications/backend/tsconfig.json`
- `/applications/backend/vitest.config.ts`
- `/applications/backend/.env.example`
- `/applications/backend/.prettierrc`
- `/applications/backend/.gitignore`

### Verification Steps

- [ ] `bun install` completes without errors
- [ ] TypeScript compiler runs: `bun tsc --noEmit`
- [ ] Project structure matches the layout above
- [ ] Environment variables can be loaded
- [ ] Test runner works: `bun test` (should find 0 tests)
- [ ] Prettier formats code: `bun run format`

### Deliverable

Working development environment with:
- Bun workspace configured
- All dependencies installed
- TypeScript configured with path aliases
- Project directory structure created
- Development tools configured (Vitest, Prettier)
- Environment variable setup complete

### Next Phase

Proceed to **Phase 1: Database Foundation**

---

## Phase 1: Database Foundation

**Goal**: Establish database schema and migration system

**Prerequisites**: Phase 0 complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 1.1: Install PostgreSQL 18
- [ ] Install PostgreSQL 18 locally (via Homebrew, apt, or Docker)
- [ ] Create development database:
  ```bash
  createdb laundry_dev
  ```
- [ ] Enable UUID v7 support:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  -- Or install pg_uuidv7 extension for UUID v7 support
  ```

#### Task 1.2: Install Migration Tool
- [ ] Install golang-migrate:
  ```bash
  # macOS
  brew install golang-migrate

  # Or download binary from GitHub releases
  ```
- [ ] Verify installation: `migrate -version`

#### Task 1.3: Create Users Table Migration
- [ ] Create migration:
  ```bash
  migrate create -ext sql -dir migrations -seq create_users_table
  ```
- [ ] Edit `000001_create_users_table.up.sql`:
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_users_email ON users(email);
  ```
- [ ] Edit `000001_create_users_table.down.sql`:
  ```sql
  DROP TABLE IF EXISTS users;
  ```

#### Task 1.4: Create Customers Table Migration
- [ ] Create migration:
  ```bash
  migrate create -ext sql -dir migrations -seq create_customers_table
  ```
- [ ] Edit `000002_create_customers_table.up.sql`:
  ```sql
  CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_customers_phone ON customers(phone);
  ```
- [ ] Edit `000002_create_customers_table.down.sql`:
  ```sql
  DROP TABLE IF EXISTS customers;
  ```

#### Task 1.5: Create Services Table Migration
- [ ] Create migration:
  ```bash
  migrate create -ext sql -dir migrations -seq create_services_table
  ```
- [ ] Edit `000003_create_services_table.up.sql`:
  ```sql
  CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    unit_type VARCHAR(10) NOT NULL CHECK (unit_type IN ('kg', 'set')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_services_is_active ON services(is_active);
  ```
- [ ] Edit `000003_create_services_table.down.sql`:
  ```sql
  DROP TABLE IF EXISTS services;
  ```

#### Task 1.6: Create Orders Table Migration
- [ ] Create migration:
  ```bash
  migrate create -ext sql -dir migrations -seq create_orders_table
  ```
- [ ] Edit `000004_create_orders_table.up.sql`:
  ```sql
  CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'in_progress', 'ready', 'delivered')),
    payment_status VARCHAR(10) NOT NULL CHECK (payment_status IN ('paid', 'unpaid')),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_orders_customer_id ON orders(customer_id);
  CREATE INDEX idx_orders_status ON orders(status);
  CREATE INDEX idx_orders_payment_status ON orders(payment_status);
  CREATE INDEX idx_orders_created_at ON orders(created_at);
  CREATE INDEX idx_orders_order_number ON orders(order_number);
  ```
- [ ] Edit `000004_create_orders_table.down.sql`:
  ```sql
  DROP TABLE IF EXISTS orders;
  ```

#### Task 1.7: Create Order Items Table Migration
- [ ] Create migration:
  ```bash
  migrate create -ext sql -dir migrations -seq create_order_items_table
  ```
- [ ] Edit `000005_create_order_items_table.up.sql`:
  ```sql
  CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    price_at_order DECIMAL(10, 2) NOT NULL CHECK (price_at_order >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX idx_order_items_service_id ON order_items(service_id);
  ```
- [ ] Edit `000005_create_order_items_table.down.sql`:
  ```sql
  DROP TABLE IF EXISTS order_items;
  ```

#### Task 1.8: Create Refresh Tokens Table Migration
- [ ] Create migration:
  ```bash
  migrate create -ext sql -dir migrations -seq create_refresh_tokens_table
  ```
- [ ] Edit `000006_create_refresh_tokens_table.up.sql`:
  ```sql
  CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP
  );

  CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
  CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
  ```
- [ ] Edit `000006_create_refresh_tokens_table.down.sql`:
  ```sql
  DROP TABLE IF EXISTS refresh_tokens;
  ```

#### Task 1.9: Run Migrations
- [ ] Set database URL:
  ```bash
  export DATABASE_URL="postgres://postgres:postgres@localhost:5432/laundry_dev?sslmode=disable"
  ```
- [ ] Run migrations:
  ```bash
  migrate -path ./migrations -database $DATABASE_URL up
  ```
- [ ] Verify tables created:
  ```bash
  psql laundry_dev -c "\dt"
  ```

#### Task 1.10: Define Database Entities with Model.Class
- [ ] Create `src/domain/user/User.ts`:
  ```typescript
  import { Schema } from '@effect/schema'
  import { Model } from '@effect/sql'

  export class User extends Model.Class<User>('User')({
    id: Model.Generated(Schema.String),
    email: Schema.String,
    password_hash: Schema.String,
    role: Schema.Literal('admin', 'staff'),
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}

  export type UserRole = 'admin' | 'staff'
  ```

- [ ] Create `src/domain/customer/Customer.ts`:
  ```typescript
  import { Schema } from '@effect/schema'
  import { Model } from '@effect/sql'

  export class Customer extends Model.Class<Customer>('Customer')({
    id: Model.Generated(Schema.String),
    name: Schema.String,
    phone: Schema.String,
    address: Schema.NullOr(Schema.String),
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}
  ```

- [ ] Create `src/domain/service/LaundryService.ts`:
  ```typescript
  import { Schema } from '@effect/schema'
  import { Model } from '@effect/sql'

  export class LaundryService extends Model.Class<LaundryService>('LaundryService')({
    id: Model.Generated(Schema.String),
    name: Schema.String,
    price: Schema.Number,
    unit_type: Schema.Literal('kg', 'set'),
    is_active: Schema.Boolean,
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}

  export type UnitType = 'kg' | 'set'
  ```

- [ ] Create `src/domain/order/Order.ts`:
  ```typescript
  import { Schema } from '@effect/schema'
  import { Model } from '@effect/sql'

  export class Order extends Model.Class<Order>('Order')({
    id: Model.Generated(Schema.String),
    order_number: Schema.String,
    customer_id: Schema.String,
    status: Schema.Literal('received', 'in_progress', 'ready', 'delivered'),
    payment_status: Schema.Literal('paid', 'unpaid'),
    total_price: Schema.Number,
    created_by: Schema.String,
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}

  export type OrderStatus = 'received' | 'in_progress' | 'ready' | 'delivered'
  export type PaymentStatus = 'paid' | 'unpaid'
  ```

- [ ] Create `src/domain/order/OrderItem.ts`:
  ```typescript
  import { Schema } from '@effect/schema'
  import { Model } from '@effect/sql'

  export class OrderItem extends Model.Class<OrderItem>('OrderItem')({
    id: Model.Generated(Schema.String),
    order_id: Schema.String,
    service_id: Schema.String,
    quantity: Schema.Number,
    price_at_order: Schema.Number,
    subtotal: Schema.Number,
    created_at: Model.DateTimeInsert,
  }) {}
  ```

#### Task 1.11: Create SqlClient Layer
- [ ] Create `src/infrastructure/database/SqlClient.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { PgClient } from '@effect/sql-pg'
  import { Config, Layer } from 'effect'

  export const SqlLive = PgClient.layer({
    host: Config.string('DATABASE_HOST'),
    port: Config.number('DATABASE_PORT'),
    database: Config.string('DATABASE_NAME'),
    username: Config.string('DATABASE_USER'),
    password: Config.secret('DATABASE_PASSWORD'),
  })
  ```

#### Task 1.12: Test Database Connection
- [ ] Create `src/infrastructure/database/__tests__/connection.test.ts`:
  ```typescript
  import { describe, test, expect } from 'vitest'
  import { Effect } from 'effect'
  import { SqlClient } from '@effect/sql'
  import { SqlLive } from '../SqlClient'

  describe('Database Connection', () => {
    test('should connect to database', async () => {
      const program = Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const result = yield* sql`SELECT 1 as result`
        return result[0].result
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SqlLive))
      )

      expect(result).toBe(1)
    })
  })
  ```
- [ ] Run test: `bun test`

### Key Files to Create

- Migration files in `/applications/backend/migrations/`
- Entity models in `/applications/backend/src/domain/`
- SqlClient configuration in `/applications/backend/src/infrastructure/database/`

### Verification Steps

- [ ] All migrations run successfully
- [ ] Database tables exist with correct schema
- [ ] All constraints and indexes are created
- [ ] Foreign keys are properly set up
- [ ] Model.Class entities are defined for all tables
- [ ] SqlClient Layer connects to database
- [ ] Connection test passes

### Deliverable

Working database with:
- Complete schema (6 tables)
- All migrations created and executed
- Database entities defined using Model.Class
- SqlClient Layer configured
- Database connection verified with test

### Next Phase

Proceed to **Phase 2: Repository Layer**

---

## Phase 2: Repository Layer

**Goal**: Implement data access layer using Effect.Service pattern

**Prerequisites**: Phase 1 complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 2.1: Create UserRepository
- [ ] Create `src/infrastructure/database/repositories/UserRepository.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { Model } from '@effect/sql'
  import { Effect, Option } from 'effect'
  import { User } from '@domain/user/User'

  export class UserRepository extends Effect.Service<UserRepository>()(
    'UserRepository',
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const repo = yield* Model.makeRepository(User, {
          tableName: 'users',
          spanPrefix: 'UserRepository',
          idColumn: 'id',
        })

        const findByEmail = (email: string) =>
          sql<User>`SELECT * FROM users WHERE email = ${email}`.pipe(
            Effect.map((rows) => rows.length > 0 ? Option.some(rows[0]) : Option.none())
          )

        return {
          ...repo, // findById, insert, update, delete
          findByEmail,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 2.2: Create CustomerRepository
- [ ] Create `src/infrastructure/database/repositories/CustomerRepository.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { Model } from '@effect/sql'
  import { Effect, Option } from 'effect'
  import { Customer } from '@domain/customer/Customer'

  export class CustomerRepository extends Effect.Service<CustomerRepository>()(
    'CustomerRepository',
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const repo = yield* Model.makeRepository(Customer, {
          tableName: 'customers',
          spanPrefix: 'CustomerRepository',
          idColumn: 'id',
        })

        const findByPhone = (phone: string) =>
          sql<Customer>`SELECT * FROM customers WHERE phone = ${phone}`.pipe(
            Effect.map((rows) => rows.length > 0 ? Option.some(rows[0]) : Option.none())
          )

        const searchByName = (name: string) =>
          sql<Customer>`SELECT * FROM customers WHERE name ILIKE ${'%' + name + '%'}`

        return {
          ...repo,
          findByPhone,
          searchByName,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 2.3: Create ServiceRepository
- [ ] Create `src/infrastructure/database/repositories/ServiceRepository.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { Model } from '@effect/sql'
  import { Effect } from 'effect'
  import { LaundryService } from '@domain/service/LaundryService'

  export class ServiceRepository extends Effect.Service<ServiceRepository>()(
    'ServiceRepository',
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const repo = yield* Model.makeRepository(LaundryService, {
          tableName: 'services',
          spanPrefix: 'ServiceRepository',
          idColumn: 'id',
        })

        const findActive = () =>
          sql<LaundryService>`SELECT * FROM services WHERE is_active = true ORDER BY name`

        const softDelete = (id: string) =>
          sql`UPDATE services SET is_active = false, updated_at = NOW() WHERE id = ${id}`

        return {
          ...repo,
          findActive,
          softDelete,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 2.4: Create OrderRepository
- [ ] Create `src/infrastructure/database/repositories/OrderRepository.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { Model } from '@effect/sql'
  import { Effect } from 'effect'
  import { Order, OrderStatus, PaymentStatus } from '@domain/order/Order'

  export class OrderRepository extends Effect.Service<OrderRepository>()(
    'OrderRepository',
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const repo = yield* Model.makeRepository(Order, {
          tableName: 'orders',
          spanPrefix: 'OrderRepository',
          idColumn: 'id',
        })

        const findByCustomerId = (customerId: string) =>
          sql<Order>`SELECT * FROM orders WHERE customer_id = ${customerId} ORDER BY created_at DESC`

        const findByOrderNumber = (orderNumber: string) =>
          sql<Order>`SELECT * FROM orders WHERE order_number = ${orderNumber}`.pipe(
            Effect.map((rows) => rows.length > 0 ? Option.some(rows[0]) : Option.none())
          )

        const updateStatus = (id: string, status: OrderStatus) =>
          sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${id}`

        const updatePaymentStatus = (id: string, paymentStatus: PaymentStatus) =>
          sql`UPDATE orders SET payment_status = ${paymentStatus}, updated_at = NOW() WHERE id = ${id}`

        return {
          ...repo,
          findByCustomerId,
          findByOrderNumber,
          updateStatus,
          updatePaymentStatus,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 2.5: Create OrderItemRepository
- [ ] Create `src/infrastructure/database/repositories/OrderItemRepository.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { Model } from '@effect/sql'
  import { Effect } from 'effect'
  import { OrderItem } from '@domain/order/OrderItem'

  export class OrderItemRepository extends Effect.Service<OrderItemRepository>()(
    'OrderItemRepository',
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const repo = yield* Model.makeRepository(OrderItem, {
          tableName: 'order_items',
          spanPrefix: 'OrderItemRepository',
          idColumn: 'id',
        })

        const findByOrderId = (orderId: string) =>
          sql<OrderItem>`SELECT * FROM order_items WHERE order_id = ${orderId}`

        const insertMany = (items: Array<Omit<OrderItem, 'id' | 'created_at'>>) =>
          Effect.forEach(items, (item) => repo.insert(item), { concurrency: 'unbounded' })

        return {
          ...repo,
          findByOrderId,
          insertMany,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 2.6: Create RefreshTokenRepository
- [ ] Create `src/infrastructure/database/repositories/RefreshTokenRepository.ts`:
  ```typescript
  import { SqlClient } from '@effect/sql'
  import { Model } from '@effect/sql'
  import { Effect, Option } from 'effect'
  import { Schema } from '@effect/schema'

  class RefreshToken extends Model.Class<RefreshToken>('RefreshToken')({
    id: Model.Generated(Schema.String),
    user_id: Schema.String,
    token_hash: Schema.String,
    expires_at: Schema.Date,
    created_at: Model.DateTimeInsert,
    revoked_at: Schema.NullOr(Schema.Date),
  }) {}

  export class RefreshTokenRepository extends Effect.Service<RefreshTokenRepository>()(
    'RefreshTokenRepository',
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const repo = yield* Model.makeRepository(RefreshToken, {
          tableName: 'refresh_tokens',
          spanPrefix: 'RefreshTokenRepository',
          idColumn: 'id',
        })

        const findByTokenHash = (tokenHash: string) =>
          sql<RefreshToken>`
            SELECT * FROM refresh_tokens
            WHERE token_hash = ${tokenHash}
            AND revoked_at IS NULL
            AND expires_at > NOW()
          `.pipe(
            Effect.map((rows) => rows.length > 0 ? Option.some(rows[0]) : Option.none())
          )

        const revoke = (id: string) =>
          sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${id}`

        const revokeAllForUser = (userId: string) =>
          sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${userId} AND revoked_at IS NULL`

        const deleteExpired = () =>
          sql`DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`

        return {
          ...repo,
          findByTokenHash,
          revoke,
          revokeAllForUser,
          deleteExpired,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 2.7: Write Repository Tests
- [ ] Create test file for each repository in `test/infrastructure/database/repositories/`
- [ ] Test CRUD operations for each repository
- [ ] Test custom methods (findByPhone, findByEmail, etc.)
- [ ] Use test database or mocks

Example test structure:
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { Effect, Layer } from 'effect'
import { CustomerRepository } from '@infrastructure/database/repositories/CustomerRepository'
import { SqlLive } from '@infrastructure/database/SqlClient'

describe('CustomerRepository', () => {
  const TestLayer = Layer.mergeAll(SqlLive, CustomerRepository.Default)

  test('should insert and find customer by phone', async () => {
    const program = Effect.gen(function* () {
      const repo = yield* CustomerRepository

      const newCustomer = {
        name: 'John Doe',
        phone: '+628123456789',
        address: 'Jakarta',
      }

      const created = yield* repo.insert(newCustomer)
      const found = yield* repo.findByPhone(newCustomer.phone)

      return { created, found }
    })

    const { created, found } = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    )

    expect(Option.isSome(found)).toBe(true)
    expect(Option.getOrThrow(found).phone).toBe('+628123456789')
  })
})
```

### Key Files to Create

- Repository implementations in `src/infrastructure/database/repositories/`
- Repository tests in `test/infrastructure/database/repositories/`

### Verification Steps

- [ ] All repositories compile without errors
- [ ] Each repository extends Effect.Service
- [ ] Model.makeRepository is used for CRUD operations
- [ ] Custom query methods are implemented
- [ ] Repository tests pass
- [ ] All repositories follow the same pattern

### Deliverable

Complete repository layer with:
- UserRepository with email lookup
- CustomerRepository with phone lookup
- ServiceRepository with soft delete
- OrderRepository with status updates
- OrderItemRepository with batch insert
- RefreshTokenRepository with revocation
- Unit tests for all repositories

### Next Phase

Proceed to **Phase 3: Authentication & Authorization** and **Phase 4: Domain Services** (can be done in parallel)

---

## Phase 3: Authentication & Authorization

**Goal**: Implement JWT-based authentication with refresh tokens

**Prerequisites**: Phase 2 complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

### Tasks

#### Task 3.1: Define Authentication Errors
- [ ] Create `src/domain/user/UserErrors.ts`:
  ```typescript
  import { Data } from 'effect'

  export class InvalidCredentials extends Data.TaggedError('InvalidCredentials')<{
    email: string
  }> {}

  export class UserNotFound extends Data.TaggedError('UserNotFound')<{
    userId: string
  }> {}

  export class UserAlreadyExists extends Data.TaggedError('UserAlreadyExists')<{
    email: string
  }> {}

  export class InvalidToken extends Data.TaggedError('InvalidToken')<{
    tokenType: 'access' | 'refresh'
    reason: string
  }> {}

  export class TokenExpired extends Data.TaggedError('TokenExpired')<{
    tokenType: 'access' | 'refresh'
  }> {}

  export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
    reason: string
  }> {}

  export class ForbiddenError extends Data.TaggedError('ForbiddenError')<{
    requiredRole?: string
  }> {}
  ```

#### Task 3.2: Create Password Hashing Service
- [ ] Create `src/infrastructure/crypto/PasswordService.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { hash, compare } from '@node-rs/bcrypt'

  export class PasswordService extends Effect.Service<PasswordService>()(
    'PasswordService',
    {
      effect: Effect.succeed({
        hash: (password: string) =>
          Effect.promise(() => hash(password, 10)),

        verify: (password: string, hash: string) =>
          Effect.promise(() => compare(password, hash)),
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 3.3: Create JWT Service
- [ ] Create `src/infrastructure/crypto/JwtService.ts`:
  ```typescript
  import { Effect, Config } from 'effect'
  import { SignJWT, jwtVerify } from 'jose'
  import { InvalidToken, TokenExpired } from '@domain/user/UserErrors'

  interface AccessTokenPayload {
    sub: string // user ID
    role: 'admin' | 'staff'
    iat: number
    exp: number
  }

  export class JwtService extends Effect.Service<JwtService>()(
    'JwtService',
    {
      effect: Effect.gen(function* () {
        const secret = yield* Config.secret('JWT_SECRET')
        const accessExpiry = yield* Config.string('JWT_ACCESS_EXPIRY')
        const refreshExpiry = yield* Config.string('JWT_REFRESH_EXPIRY')

        const secretKey = new TextEncoder().encode(secret.value)

        const signAccessToken = (userId: string, role: 'admin' | 'staff') =>
          Effect.promise(() =>
            new SignJWT({ sub: userId, role })
              .setProtectedHeader({ alg: 'HS256' })
              .setIssuedAt()
              .setExpirationTime(accessExpiry)
              .sign(secretKey)
          )

        const verifyAccessToken = (token: string) =>
          Effect.tryPromise({
            try: () => jwtVerify(token, secretKey),
            catch: (error) => {
              if (error instanceof Error && error.message.includes('expired')) {
                return new TokenExpired({ tokenType: 'access' })
              }
              return new InvalidToken({ tokenType: 'access', reason: String(error) })
            },
          }).pipe(
            Effect.map((result) => result.payload as AccessTokenPayload)
          )

        return {
          signAccessToken,
          verifyAccessToken,
        }
      }),
      dependencies: [],
    }
  ) {}
  ```

#### Task 3.4: Create Token Generation Utilities
- [ ] Create `src/infrastructure/crypto/TokenGenerator.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { randomBytes } from 'crypto'
  import { hash } from '@node-rs/bcrypt'

  export const generateRefreshToken = () =>
    Effect.sync(() => randomBytes(32).toString('hex'))

  export const hashToken = (token: string) =>
    Effect.promise(() => hash(token, 10))
  ```

#### Task 3.5: Create CurrentUser Context
- [ ] Create `src/domain/user/CurrentUser.ts`:
  ```typescript
  import { Context } from 'effect'

  export interface CurrentUser {
    id: string
    role: 'admin' | 'staff'
  }

  export const CurrentUser = Context.GenericTag<CurrentUser>('CurrentUser')
  ```

#### Task 3.6: Create Authorization Guards
- [ ] Create `src/application/auth/AuthorizationGuards.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { CurrentUser } from '@domain/user/CurrentUser'
  import { ForbiddenError, UnauthorizedError } from '@domain/user/UserErrors'

  export const requireAuth = Effect.gen(function* () {
    const user = yield* Effect.serviceOption(CurrentUser)
    if (user._tag === 'None') {
      return yield* Effect.fail(new UnauthorizedError({ reason: 'Authentication required' }))
    }
    return user.value
  })

  export const requireAdmin = Effect.gen(function* () {
    const user = yield* requireAuth
    if (user.role !== 'admin') {
      return yield* Effect.fail(new ForbiddenError({ requiredRole: 'admin' }))
    }
    return user
  })

  export const requireStaffOrAdmin = Effect.gen(function* () {
    const user = yield* requireAuth
    if (user.role !== 'admin' && user.role !== 'staff') {
      return yield* Effect.fail(new ForbiddenError())
    }
    return user
  })
  ```

#### Task 3.7: Create Login Use Case
- [ ] Create `src/application/auth/LoginUseCase.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
  import { RefreshTokenRepository } from '@infrastructure/database/repositories/RefreshTokenRepository'
  import { PasswordService } from '@infrastructure/crypto/PasswordService'
  import { JwtService } from '@infrastructure/crypto/JwtService'
  import { generateRefreshToken, hashToken } from '@infrastructure/crypto/TokenGenerator'
  import { InvalidCredentials } from '@domain/user/UserErrors'

  interface LoginRequest {
    email: string
    password: string
  }

  interface LoginResponse {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      email: string
      role: string
    }
  }

  export const login = (request: LoginRequest) =>
    Effect.gen(function* () {
      const userRepo = yield* UserRepository
      const refreshTokenRepo = yield* RefreshTokenRepository
      const passwordService = yield* PasswordService
      const jwtService = yield* JwtService

      // Find user by email
      const userOption = yield* userRepo.findByEmail(request.email)
      if (Option.isNone(userOption)) {
        return yield* Effect.fail(new InvalidCredentials({ email: request.email }))
      }
      const user = userOption.value

      // Verify password
      const isValid = yield* passwordService.verify(request.password, user.password_hash)
      if (!isValid) {
        return yield* Effect.fail(new InvalidCredentials({ email: request.email }))
      }

      // Generate access token
      const accessToken = yield* jwtService.signAccessToken(user.id, user.role)

      // Generate refresh token
      const refreshToken = yield* generateRefreshToken()
      const refreshTokenHash = yield* hashToken(refreshToken)

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      yield* refreshTokenRepo.insert({
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt,
      })

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      } satisfies LoginResponse
    })
  ```

#### Task 3.8: Create Logout Use Case
- [ ] Create `src/application/auth/LogoutUseCase.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { RefreshTokenRepository } from '@infrastructure/database/repositories/RefreshTokenRepository'
  import { hashToken } from '@infrastructure/crypto/TokenGenerator'

  export const logout = (refreshToken: string) =>
    Effect.gen(function* () {
      const repo = yield* RefreshTokenRepository
      const tokenHash = yield* hashToken(refreshToken)

      const tokenOption = yield* repo.findByTokenHash(tokenHash)
      if (Option.isSome(tokenOption)) {
        yield* repo.revoke(tokenOption.value.id)
      }
    })
  ```

#### Task 3.9: Create Refresh Token Use Case
- [ ] Create `src/application/auth/RefreshTokenUseCase.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { RefreshTokenRepository } from '@infrastructure/database/repositories/RefreshTokenRepository'
  import { UserRepository } from '@infrastructure/database/repositories/UserRepository'
  import { JwtService } from '@infrastructure/crypto/JwtService'
  import { generateRefreshToken, hashToken } from '@infrastructure/crypto/TokenGenerator'
  import { InvalidToken, UserNotFound } from '@domain/user/UserErrors'

  export const refreshAccessToken = (oldRefreshToken: string) =>
    Effect.gen(function* () {
      const refreshTokenRepo = yield* RefreshTokenRepository
      const userRepo = yield* UserRepository
      const jwtService = yield* JwtService

      // Hash and find refresh token
      const tokenHash = yield* hashToken(oldRefreshToken)
      const tokenOption = yield* refreshTokenRepo.findByTokenHash(tokenHash)

      if (Option.isNone(tokenOption)) {
        return yield* Effect.fail(new InvalidToken({
          tokenType: 'refresh',
          reason: 'Token not found or expired'
        }))
      }
      const token = tokenOption.value

      // Get user
      const userOption = yield* userRepo.findById(token.user_id)
      if (Option.isNone(userOption)) {
        return yield* Effect.fail(new UserNotFound({ userId: token.user_id }))
      }
      const user = userOption.value

      // Revoke old refresh token
      yield* refreshTokenRepo.revoke(token.id)

      // Generate new tokens
      const accessToken = yield* jwtService.signAccessToken(user.id, user.role)
      const newRefreshToken = yield* generateRefreshToken()
      const newTokenHash = yield* hashToken(newRefreshToken)

      // Store new refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      yield* refreshTokenRepo.insert({
        user_id: user.id,
        token_hash: newTokenHash,
        expires_at: expiresAt,
      })

      return {
        accessToken,
        refreshToken: newRefreshToken,
      }
    })
  ```

#### Task 3.10: Create Authentication Middleware
- [ ] Create `src/infrastructure/http/middleware/auth.ts`:
  ```typescript
  import { Effect, Option } from 'effect'
  import { JwtService } from '@infrastructure/crypto/JwtService'
  import { CurrentUser } from '@domain/user/CurrentUser'
  import { UnauthorizedError } from '@domain/user/UserErrors'

  export const extractAccessToken = (authHeader: string | undefined) =>
    Effect.gen(function* () {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return yield* Effect.fail(new UnauthorizedError({ reason: 'Missing or invalid authorization header' }))
      }
      return authHeader.slice(7) // Remove 'Bearer ' prefix
    })

  export const authMiddleware = <R, E, A>(
    effect: Effect.Effect<A, E, R | CurrentUser>
  ): Effect.Effect<A, E | UnauthorizedError, R | JwtService> =>
    Effect.gen(function* () {
      const jwtService = yield* JwtService

      // Extract token from request (implementation depends on HTTP setup)
      const token = yield* extractAccessToken(/* get from request */)

      // Verify token
      const payload = yield* jwtService.verifyAccessToken(token)

      // Inject CurrentUser into context
      const currentUser: CurrentUser = {
        id: payload.sub,
        role: payload.role,
      }

      return yield* effect.pipe(Effect.provideService(CurrentUser, currentUser))
    })
  ```

#### Task 3.11: Write Authentication Tests
- [ ] Test password hashing and verification
- [ ] Test JWT signing and verification
- [ ] Test login use case (success and failure)
- [ ] Test logout use case
- [ ] Test refresh token use case
- [ ] Test authorization guards

### Key Files to Create

- Error definitions in `src/domain/user/UserErrors.ts`
- Crypto services in `src/infrastructure/crypto/`
- Auth use cases in `src/application/auth/`
- Authorization guards in `src/application/auth/AuthorizationGuards.ts`
- Auth middleware in `src/infrastructure/http/middleware/auth.ts`
- Tests in `test/application/auth/`

### Verification Steps

- [ ] Password hashing works correctly
- [ ] JWT tokens can be signed and verified
- [ ] Login returns valid tokens
- [ ] Refresh token rotation works
- [ ] Logout revokes tokens
- [ ] Authorization guards enforce role requirements
- [ ] All auth tests pass

### Deliverable

Working authentication system with:
- Password hashing service
- JWT service with token generation
- Login use case with token generation
- Logout use case with token revocation
- Refresh token use case with rotation
- Authorization guards (requireAuth, requireAdmin)
- Authentication middleware for HTTP requests
- Comprehensive test coverage

### Next Phase

Proceed to **Phase 4: Domain Services** (can be done in parallel with Phase 3) or **Phase 5: HTTP Server & Middleware**

---

## Phase 4: Domain Services

**Goal**: Implement business logic layer

**Prerequisites**: Phase 2 complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

### Tasks

#### Task 4.1: Define Domain Errors

**Customer Errors** - Create `src/domain/customer/CustomerErrors.ts`:
```typescript
import { Data } from 'effect'

export class CustomerNotFound extends Data.TaggedError('CustomerNotFound')<{
  phone: string
}> {}

export class CustomerAlreadyExists extends Data.TaggedError('CustomerAlreadyExists')<{
  phone: string
}> {}

export class InvalidPhoneNumber extends Data.TaggedError('InvalidPhoneNumber')<{
  phone: string
  reason: string
}> {}
```

**Service Errors** - Create `src/domain/service/ServiceErrors.ts`:
```typescript
import { Data } from 'effect'

export class ServiceNotFound extends Data.TaggedError('ServiceNotFound')<{
  serviceId: string
}> {}

export class ServiceAlreadyExists extends Data.TaggedError('ServiceAlreadyExists')<{
  name: string
}> {}

export class InvalidServiceUnit extends Data.TaggedError('InvalidServiceUnit')<{
  unitType: string
}> {}
```

**Order Errors** - Create `src/domain/order/OrderErrors.ts`:
```typescript
import { Data } from 'effect'

export class OrderNotFound extends Data.TaggedError('OrderNotFound')<{
  orderId: string
}> {}

export class InvalidOrderStatus extends Data.TaggedError('InvalidOrderStatus')<{
  currentStatus: string
  attemptedStatus: string
  reason: string
}> {}

export class InvalidOrderTransition extends Data.TaggedError('InvalidOrderTransition')<{
  from: string
  to: string
}> {}

export class OrderValidationError extends Data.TaggedError('OrderValidationError')<{
  errors: Array<{ field: string; message: string }>
}> {}

export class EmptyOrderError extends Data.TaggedError('EmptyOrderError')<{
  message: string
}> {}
```

#### Task 4.2: Create Phone Number Validation
- [ ] Create `src/domain/customer/PhoneNumber.ts`:
  ```typescript
  import { Schema } from '@effect/schema'
  import { Effect } from 'effect'
  import { InvalidPhoneNumber } from './CustomerErrors'

  // Indonesian phone number format: +62XXXXXXXXX (9-13 digits after +62)
  export const PhoneNumberSchema = Schema.String.pipe(
    Schema.pattern(/^\+62\d{9,13}$/),
    Schema.brand('PhoneNumber')
  )

  export type PhoneNumber = Schema.Schema.Type<typeof PhoneNumberSchema>

  export const normalizePhoneNumber = (phone: string): Effect.Effect<PhoneNumber, InvalidPhoneNumber> => {
    // Remove spaces, dashes, parentheses
    const cleaned = phone.replace(/[\s\-()]/g, '')

    // Convert 08... to +628...
    const withPrefix = cleaned.startsWith('0')
      ? '+62' + cleaned.slice(1)
      : cleaned.startsWith('+62')
      ? cleaned
      : '+62' + cleaned

    return Schema.decode(PhoneNumberSchema)(withPrefix).pipe(
      Effect.mapError((parseError) =>
        new InvalidPhoneNumber({
          phone,
          reason: 'Invalid Indonesian phone number format. Expected +62XXXXXXXXX',
        })
      )
    )
  }
  ```

#### Task 4.3: Create Order Number Generator
- [ ] Create `src/domain/order/OrderNumberGenerator.ts`:
  ```typescript
  import { Effect } from 'effect'

  export const generateOrderNumber = (): Effect.Effect<string> =>
    Effect.sync(() => {
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const timestamp = Date.now().toString().slice(-6)

      return `ORD-${year}${month}${day}-${timestamp}`
    })
  ```

#### Task 4.4: Create Order Status Validator
- [ ] Create `src/domain/order/OrderStatusValidator.ts`:
  ```typescript
  import { Effect } from 'effect'
  import { OrderStatus } from './Order'
  import { InvalidOrderTransition } from './OrderErrors'

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    received: ['in_progress'],
    in_progress: ['ready'],
    ready: ['delivered'],
    delivered: [], // Terminal state
  }

  export const validateStatusTransition = (
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): Effect.Effect<void, InvalidOrderTransition> => {
    const allowedStatuses = validTransitions[currentStatus]

    if (!allowedStatuses.includes(newStatus)) {
      return Effect.fail(
        new InvalidOrderTransition({
          from: currentStatus,
          to: newStatus,
        })
      )
    }

    return Effect.void
  }
  ```

#### Task 4.5: Create CustomerService
- [ ] Create `src/domain/customer/CustomerService.ts`:
  ```typescript
  import { Effect, Option } from 'effect'
  import { CustomerRepository } from '@infrastructure/database/repositories/CustomerRepository'
  import { normalizePhoneNumber, PhoneNumber } from './PhoneNumber'
  import { CustomerNotFound, CustomerAlreadyExists } from './CustomerErrors'

  interface CreateCustomerData {
    name: string
    phone: string
    address?: string
  }

  export class CustomerService extends Effect.Service<CustomerService>()(
    'CustomerService',
    {
      effect: Effect.gen(function* () {
        const repo = yield* CustomerRepository

        const findByPhone = (phoneInput: string) =>
          Effect.gen(function* () {
            const phone = yield* normalizePhoneNumber(phoneInput)
            const customerOption = yield* repo.findByPhone(phone)

            if (Option.isNone(customerOption)) {
              return yield* Effect.fail(new CustomerNotFound({ phone }))
            }

            return customerOption.value
          })

        const checkExists = (phoneInput: string) =>
          Effect.gen(function* () {
            const phone = yield* normalizePhoneNumber(phoneInput)
            const customerOption = yield* repo.findByPhone(phone)
            return Option.isSome(customerOption)
          })

        const create = (data: CreateCustomerData) =>
          Effect.gen(function* () {
            const phone = yield* normalizePhoneNumber(data.phone)

            // Check if customer already exists
            const existing = yield* repo.findByPhone(phone)
            if (Option.isSome(existing)) {
              return yield* Effect.fail(new CustomerAlreadyExists({ phone }))
            }

            // Create customer
            return yield* repo.insert({
              name: data.name,
              phone,
              address: data.address || null,
            })
          })

        return {
          findByPhone,
          checkExists,
          create,
        }
      }),
      dependencies: [CustomerRepository.Default],
    }
  ) {}
  ```

#### Task 4.6: Create LaundryServiceService
- [ ] Create `src/domain/service/LaundryServiceService.ts`:
  ```typescript
  import { Effect, Option } from 'effect'
  import { ServiceRepository } from '@infrastructure/database/repositories/ServiceRepository'
  import { ServiceNotFound, ServiceAlreadyExists } from './ServiceErrors'
  import { UnitType } from './LaundryService'

  interface CreateServiceData {
    name: string
    price: number
    unit_type: UnitType
  }

  interface UpdateServiceData {
    name?: string
    price?: number
    unit_type?: UnitType
  }

  export class LaundryServiceService extends Effect.Service<LaundryServiceService>()(
    'LaundryServiceService',
    {
      effect: Effect.gen(function* () {
        const repo = yield* ServiceRepository

        const findActive = () => repo.findActive()

        const findById = (id: string) =>
          Effect.gen(function* () {
            const serviceOption = yield* repo.findById(id)

            if (Option.isNone(serviceOption)) {
              return yield* Effect.fail(new ServiceNotFound({ serviceId: id }))
            }

            return serviceOption.value
          })

        const create = (data: CreateServiceData) =>
          repo.insert({
            ...data,
            is_active: true,
          })

        const update = (id: string, data: UpdateServiceData) =>
          Effect.gen(function* () {
            // Check if service exists
            yield* findById(id)

            // Update service
            yield* repo.update(id, {
              ...data,
              updated_at: new Date(),
            })
          })

        const softDelete = (id: string) =>
          Effect.gen(function* () {
            // Check if service exists
            yield* findById(id)

            // Soft delete (set is_active = false)
            yield* repo.softDelete(id)
          })

        return {
          findActive,
          findById,
          create,
          update,
          softDelete,
        }
      }),
      dependencies: [ServiceRepository.Default],
    }
  ) {}
  ```

#### Task 4.7: Create OrderService
- [ ] Create `src/domain/order/OrderService.ts`:
  ```typescript
  import { Effect, Option } from 'effect'
  import { OrderRepository } from '@infrastructure/database/repositories/OrderRepository'
  import { OrderItemRepository } from '@infrastructure/database/repositories/OrderItemRepository'
  import { ServiceRepository } from '@infrastructure/database/repositories/ServiceRepository'
  import { generateOrderNumber } from './OrderNumberGenerator'
  import { validateStatusTransition } from './OrderStatusValidator'
  import { OrderNotFound, EmptyOrderError, InvalidOrderStatus } from './OrderErrors'
  import { ServiceNotFound } from '@domain/service/ServiceErrors'
  import { OrderStatus, PaymentStatus } from './Order'

  interface CreateOrderItem {
    serviceId: string
    quantity: number
  }

  interface CreateOrderData {
    customerId: string
    items: CreateOrderItem[]
    createdBy: string
    paymentStatus?: PaymentStatus
  }

  export class OrderService extends Effect.Service<OrderService>()(
    'OrderService',
    {
      effect: Effect.gen(function* () {
        const orderRepo = yield* OrderRepository
        const orderItemRepo = yield* OrderItemRepository
        const serviceRepo = yield* ServiceRepository

        const calculateTotal = (
          items: Array<{ quantity: number; priceAtOrder: number }>
        ): number => {
          return items.reduce((total, item) => total + item.quantity * item.priceAtOrder, 0)
        }

        const create = (data: CreateOrderData) =>
          Effect.gen(function* () {
            // Validate: must have at least one item
            if (data.items.length === 0) {
              return yield* Effect.fail(
                new EmptyOrderError({ message: 'Order must contain at least one item' })
              )
            }

            // Generate order number
            const orderNumber = yield* generateOrderNumber()

            // Fetch service prices and prepare order items
            const itemsWithPrices = yield* Effect.forEach(
              data.items,
              (item) =>
                Effect.gen(function* () {
                  const serviceOption = yield* serviceRepo.findById(item.serviceId)

                  if (Option.isNone(serviceOption)) {
                    return yield* Effect.fail(
                      new ServiceNotFound({ serviceId: item.serviceId })
                    )
                  }

                  const service = serviceOption.value
                  const priceAtOrder = service.price
                  const subtotal = item.quantity * priceAtOrder

                  return {
                    serviceId: item.serviceId,
                    quantity: item.quantity,
                    priceAtOrder,
                    subtotal,
                  }
                }),
              { concurrency: 'unbounded' }
            )

            // Calculate total
            const totalPrice = calculateTotal(itemsWithPrices)

            // Create order (wrap in transaction if needed)
            const order = yield* orderRepo.insert({
              order_number: orderNumber,
              customer_id: data.customerId,
              status: 'received',
              payment_status: data.paymentStatus || 'unpaid',
              total_price: totalPrice,
              created_by: data.createdBy,
            })

            // Create order items
            yield* orderItemRepo.insertMany(
              itemsWithPrices.map((item) => ({
                order_id: order.id,
                service_id: item.serviceId,
                quantity: item.quantity,
                price_at_order: item.priceAtOrder,
                subtotal: item.subtotal,
              }))
            )

            return order
          })

        const findById = (id: string) =>
          Effect.gen(function* () {
            const orderOption = yield* orderRepo.findById(id)

            if (Option.isNone(orderOption)) {
              return yield* Effect.fail(new OrderNotFound({ orderId: id }))
            }

            return orderOption.value
          })

        const updateStatus = (id: string, newStatus: OrderStatus) =>
          Effect.gen(function* () {
            const order = yield* findById(id)

            // Validate status transition
            yield* validateStatusTransition(order.status, newStatus)

            // Update status
            yield* orderRepo.updateStatus(id, newStatus)
          })

        const updatePaymentStatus = (id: string, paymentStatus: PaymentStatus) =>
          Effect.gen(function* () {
            // Check if order exists
            yield* findById(id)

            // Update payment status
            yield* orderRepo.updatePaymentStatus(id, paymentStatus)
          })

        const findByCustomerId = (customerId: string) =>
          orderRepo.findByCustomerId(customerId)

        return {
          create,
          findById,
          updateStatus,
          updatePaymentStatus,
          findByCustomerId,
        }
      }),
      dependencies: [
        OrderRepository.Default,
        OrderItemRepository.Default,
        ServiceRepository.Default,
      ],
    }
  ) {}
  ```

#### Task 4.8: Write Domain Service Tests
- [ ] Test CustomerService:
  - Phone number normalization and validation
  - Customer creation with duplicate check
  - Find customer by phone
- [ ] Test LaundryServiceService:
  - Service creation
  - Service soft delete
  - Find active services
- [ ] Test OrderService:
  - Order creation with price calculation
  - Order status transitions
  - Payment status updates
  - Empty order validation

### Key Files to Create

- Domain errors in `src/domain/{entity}/{Entity}Errors.ts`
- Phone number validation in `src/domain/customer/PhoneNumber.ts`
- Order number generator in `src/domain/order/OrderNumberGenerator.ts`
- Order status validator in `src/domain/order/OrderStatusValidator.ts`
- Domain services in `src/domain/{entity}/{Entity}Service.ts`
- Tests in `test/domain/`

### Verification Steps

- [ ] All domain errors are defined
- [ ] Phone number validation works for Indonesian numbers
- [ ] Order number generation is unique and formatted correctly
- [ ] Order status transitions are validated
- [ ] CustomerService enforces business rules
- [ ] LaundryServiceService implements soft delete
- [ ] OrderService calculates prices correctly
- [ ] OrderService validates order workflow
- [ ] All domain service tests pass

### Deliverable

Complete domain services layer with:
- CustomerService with phone validation
- LaundryServiceService with soft delete
- OrderService with price calculation and workflow validation
- Comprehensive error types
- Business rule enforcement
- Test coverage for all services

### Next Phase

Proceed to **Phase 5: HTTP Server & Middleware**

---

## Phase 5: HTTP Server & Middleware

**Goal**: Set up HTTP server with @effect/platform-bun

**Prerequisites**: Phase 0 complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 5.1: Create HTTP Server Setup
- [ ] Create `src/infrastructure/http/HttpServer.ts`:
  ```typescript
  import { HttpServer, HttpRouter, HttpServerResponse } from '@effect/platform'
  import { BunHttpServer, BunRuntime } from '@effect/platform-bun'
  import { Effect, Layer, Config } from 'effect'

  export const HttpServerLive = Layer.unwrapEffect(
    Effect.gen(function* () {
      const port = yield* Config.number('PORT').pipe(Config.withDefault(3000))

      return BunHttpServer.layer({ port })
    })
  )
  ```

#### Task 5.2: Create CORS Middleware
- [ ] Create `src/infrastructure/http/middleware/cors.ts`:
  ```typescript
  import { HttpServerResponse, HttpServerRequest } from '@effect/platform'
  import { Effect, Config } from 'effect'

  export const corsMiddleware = <R, E, A>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, E, R> =>
    Effect.gen(function* () {
      const corsOrigin = yield* Config.string('CORS_ORIGIN').pipe(
        Config.withDefault('http://localhost:5173')
      )

      const request = yield* HttpServerRequest.HttpServerRequest
      const method = request.method

      // Handle preflight
      if (method === 'OPTIONS') {
        return yield* HttpServerResponse.empty({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          },
        })
      }

      // Handle actual request
      const response = yield* handler

      return response.pipe(
        Effect.map((res) =>
          HttpServerResponse.setHeaders(res, {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Credentials': 'true',
          })
        )
      )
    })
  ```

#### Task 5.3: Create Request Logging Middleware
- [ ] Create `src/infrastructure/http/middleware/logger.ts`:
  ```typescript
  import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
  import { Effect } from 'effect'

  export const loggingMiddleware = <R, E, A>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, E, R> =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const startTime = Date.now()

      yield* Effect.logInfo(`→ ${request.method} ${request.url}`)

      const response = yield* handler

      const duration = Date.now() - startTime
      yield* Effect.logInfo(`← ${request.method} ${request.url} ${response.status} (${duration}ms)`)

      return response
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const duration = Date.now() - startTime
          yield* Effect.logError(`← ${request.method} ${request.url} ERROR (${duration}ms)`, error)
          return yield* Effect.fail(error)
        })
      )
    )
  ```

#### Task 5.4: Create Error Handler Middleware
- [ ] Create `src/infrastructure/http/middleware/errorHandler.ts`:
  ```typescript
  import { HttpServerResponse } from '@effect/platform'
  import { Effect } from 'effect'
  import { CustomerNotFound, CustomerAlreadyExists } from '@domain/customer/CustomerErrors'
  import { ServiceNotFound } from '@domain/service/ServiceErrors'
  import { OrderNotFound, InvalidOrderTransition } from '@domain/order/OrderErrors'
  import { UnauthorizedError, ForbiddenError, InvalidCredentials } from '@domain/user/UserErrors'

  interface ErrorResponse {
    error: {
      code: string
      message: string
      details?: unknown
    }
  }

  export const errorHandlerMiddleware = <R, E, A>(
    handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
    handler.pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // Customer errors
          if (error instanceof CustomerNotFound) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'CUSTOMER_NOT_FOUND',
                  message: `Customer with phone ${error.phone} not found`,
                },
              } satisfies ErrorResponse,
              { status: 404 }
            )
          }

          if (error instanceof CustomerAlreadyExists) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'CUSTOMER_ALREADY_EXISTS',
                  message: `Customer with phone ${error.phone} already exists`,
                },
              } satisfies ErrorResponse,
              { status: 409 }
            )
          }

          // Service errors
          if (error instanceof ServiceNotFound) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'SERVICE_NOT_FOUND',
                  message: `Service not found`,
                },
              } satisfies ErrorResponse,
              { status: 404 }
            )
          }

          // Order errors
          if (error instanceof OrderNotFound) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'ORDER_NOT_FOUND',
                  message: `Order not found`,
                },
              } satisfies ErrorResponse,
              { status: 404 }
            )
          }

          if (error instanceof InvalidOrderTransition) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'INVALID_ORDER_TRANSITION',
                  message: `Cannot transition order from ${error.from} to ${error.to}`,
                },
              } satisfies ErrorResponse,
              { status: 400 }
            )
          }

          // Auth errors
          if (error instanceof UnauthorizedError) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'UNAUTHORIZED',
                  message: error.reason,
                },
              } satisfies ErrorResponse,
              { status: 401 }
            )
          }

          if (error instanceof ForbiddenError) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
              } satisfies ErrorResponse,
              { status: 403 }
            )
          }

          if (error instanceof InvalidCredentials) {
            return yield* HttpServerResponse.json(
              {
                error: {
                  code: 'INVALID_CREDENTIALS',
                  message: 'Invalid email or password',
                },
              } satisfies ErrorResponse,
              { status: 401 }
            )
          }

          // Unexpected errors
          yield* Effect.logError('Unexpected error:', error)
          return yield* HttpServerResponse.json(
            {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
              },
            } satisfies ErrorResponse,
            { status: 500 }
          )
        })
      )
    )
  ```

#### Task 5.5: Create Request Body Parser
- [ ] Create `src/infrastructure/http/RequestParser.ts`:
  ```typescript
  import { HttpServerRequest } from '@effect/platform'
  import { Schema } from '@effect/schema'
  import { Effect } from 'effect'

  export class ValidationError extends Data.TaggedError('ValidationError')<{
    errors: Array<{ field: string; message: string }>
  }> {}

  export const parseBody = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const body = yield* request.json

      return yield* Schema.decode(schema)(body).pipe(
        Effect.mapError((parseError) =>
          new ValidationError({
            errors: parseError.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          })
        )
      )
    })

  export const parseQuery = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const query = Object.fromEntries(new URL(request.url).searchParams)

      return yield* Schema.decode(schema)(query).pipe(
        Effect.mapError((parseError) =>
          new ValidationError({
            errors: parseError.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          })
        )
      )
    })
  ```

#### Task 5.6: Create Router Utility
- [ ] Create `src/infrastructure/http/Router.ts`:
  ```typescript
  import { HttpRouter, HttpServerRequest, HttpServerResponse } from '@effect/platform'
  import { Effect } from 'effect'

  type RouteHandler<R, E> = Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>

  interface Route<R, E> {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    handler: RouteHandler<R, E>
  }

  export const createRouter = <R, E>(routes: Route<R, E>[]) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest

      for (const route of routes) {
        if (request.method === route.method && matchPath(request.url, route.path)) {
          return yield* route.handler
        }
      }

      return yield* HttpServerResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Route not found' } },
        { status: 404 }
      )
    })

  const matchPath = (url: string, pattern: string): boolean => {
    // Simple path matching (enhance with path-to-regexp if needed)
    const urlPath = new URL(url).pathname
    return urlPath === pattern || urlPath.startsWith(pattern + '/')
  }
  ```

### Key Files to Create

- HTTP server setup in `src/infrastructure/http/HttpServer.ts`
- Middleware in `src/infrastructure/http/middleware/`
- Request parser in `src/infrastructure/http/RequestParser.ts`
- Router utility in `src/infrastructure/http/Router.ts`

### Verification Steps

- [ ] HTTP server can start without errors
- [ ] CORS middleware adds correct headers
- [ ] Logging middleware logs requests and responses
- [ ] Error handler maps domain errors to HTTP responses
- [ ] Request body parser validates with @effect/schema
- [ ] Router matches paths correctly

### Deliverable

Working HTTP server infrastructure with:
- Bun HTTP server setup
- CORS middleware
- Request logging middleware
- Error handling middleware
- Request body and query parsing
- Basic router implementation

### Next Phase

Proceed to **Phase 6: API Routes - Authentication** through **Phase 10: Analytics & Reporting** (these can be done in any order)

---

## Phase 6: API Routes - Authentication

**Goal**: Implement authentication endpoints

**Prerequisites**: Phase 3 (Auth), Phase 5 (HTTP Server) complete

**Complexity**: Medium

**Estimated Time**: 3-4 hours

### Tasks

#### Task 6.1: Define Authentication Request/Response Schemas
- [ ] Create `src/api/auth/schemas.ts`:
  ```typescript
  import { Schema } from '@effect/schema'

  export const LoginRequest = Schema.Struct({
    email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    password: Schema.String.pipe(Schema.minLength(8)),
  })

  export const LoginResponse = Schema.Struct({
    accessToken: Schema.String,
    refreshToken: Schema.String,
    user: Schema.Struct({
      id: Schema.String,
      email: Schema.String,
      role: Schema.Literal('admin', 'staff'),
    }),
  })

  export const RefreshTokenRequest = Schema.Struct({
    refreshToken: Schema.String,
  })

  export const RefreshTokenResponse = Schema.Struct({
    accessToken: Schema.String,
    refreshToken: Schema.String,
  })
  ```

#### Task 6.2: Implement Login Route
- [ ] Create `src/api/auth/authRoutes.ts` with POST `/api/auth/login`
- [ ] Parse and validate request body using `LoginRequest` schema
- [ ] Call `login` use case
- [ ] Set httpOnly cookies for tokens
- [ ] Return user data and tokens

#### Task 6.3: Implement Logout Route
- [ ] Add POST `/api/auth/logout` to `authRoutes.ts`
- [ ] Extract refresh token from cookie
- [ ] Call `logout` use case
- [ ] Clear auth cookies
- [ ] Return success response

#### Task 6.4: Implement Refresh Token Route
- [ ] Add POST `/api/auth/refresh` to `authRoutes.ts`
- [ ] Extract refresh token from cookie or body
- [ ] Call `refreshAccessToken` use case
- [ ] Set new httpOnly cookies
- [ ] Return new tokens

#### Task 6.5: Write API Integration Tests
- [ ] Test successful login flow
- [ ] Test login with invalid credentials
- [ ] Test logout clears tokens
- [ ] Test token refresh works correctly
- [ ] Test token refresh with invalid token

### Verification Steps

- [ ] POST `/api/auth/login` returns tokens on valid credentials
- [ ] POST `/api/auth/login` returns 401 on invalid credentials
- [ ] POST `/api/auth/logout` revokes refresh token
- [ ] POST `/api/auth/refresh` returns new tokens
- [ ] Tokens are set in httpOnly cookies
- [ ] All auth integration tests pass

### Deliverable

Working authentication API with login, logout, and token refresh endpoints

---

## Phase 7: API Routes - Customers

**Goal**: Implement customer management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 7.1: Define Customer Schemas
- [ ] Create `src/api/customers/schemas.ts`:
  ```typescript
  import { Schema } from '@effect/schema'

  export const CreateCustomerRequest = Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)),
    phone: Schema.String,
    address: Schema.optional(Schema.String),
  })

  export const CustomerResponse = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    phone: Schema.String,
    address: Schema.NullOr(Schema.String),
    created_at: Schema.Date,
    updated_at: Schema.Date,
  })

  export const SearchCustomerQuery = Schema.Struct({
    phone: Schema.String,
  })
  ```

#### Task 7.2: Implement Customer Routes
- [ ] Create `src/api/customers/customerRoutes.ts`
- [ ] GET `/api/customers?phone={phone}` - Search customer by phone
- [ ] POST `/api/customers` - Create new customer
- [ ] GET `/api/customers/:id` - Get customer details

#### Task 7.3: Write Integration Tests
- [ ] Test customer search by phone
- [ ] Test customer creation
- [ ] Test duplicate phone number rejection
- [ ] Test invalid phone number format

### Verification Steps

- [ ] GET `/api/customers?phone=+628123456789` returns customer if exists
- [ ] POST `/api/customers` creates new customer
- [ ] POST `/api/customers` returns 409 if phone exists
- [ ] Phone number validation works correctly
- [ ] All customer tests pass

### Deliverable

Working customer management API with search and creation endpoints

---

## Phase 8: API Routes - Services

**Goal**: Implement laundry service management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 8.1: Define Service Schemas
- [ ] Create `src/api/services/schemas.ts`:
  ```typescript
  import { Schema } from '@effect/schema'

  export const CreateServiceRequest = Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)),
    price: Schema.Number.pipe(Schema.positive()),
    unit_type: Schema.Literal('kg', 'set'),
  })

  export const UpdateServiceRequest = Schema.Struct({
    name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
    price: Schema.optional(Schema.Number.pipe(Schema.positive())),
    unit_type: Schema.optional(Schema.Literal('kg', 'set')),
  })

  export const ServiceResponse = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    price: Schema.Number,
    unit_type: Schema.Literal('kg', 'set'),
    is_active: Schema.Boolean,
    created_at: Schema.Date,
    updated_at: Schema.Date,
  })
  ```

#### Task 8.2: Implement Service Routes
- [ ] Create `src/api/services/serviceRoutes.ts`
- [ ] GET `/api/services` - List all active services (public)
- [ ] POST `/api/services` - Create service (Admin only)
- [ ] PUT `/api/services/:id` - Update service (Admin only)
- [ ] DELETE `/api/services/:id` - Soft delete service (Admin only)

#### Task 8.3: Add Admin Authorization
- [ ] Protect POST, PUT, DELETE routes with `requireAdmin` guard
- [ ] Allow public access to GET route

#### Task 8.4: Write Integration Tests
- [ ] Test service list retrieval
- [ ] Test service creation (as admin)
- [ ] Test service update (as admin)
- [ ] Test service deletion (soft delete)
- [ ] Test authorization (non-admin cannot create/update/delete)

### Verification Steps

- [ ] GET `/api/services` returns active services (no auth required)
- [ ] POST `/api/services` creates service (admin only)
- [ ] PUT `/api/services/:id` updates service (admin only)
- [ ] DELETE `/api/services/:id` soft deletes service (admin only)
- [ ] Non-admin users receive 403 on protected routes
- [ ] All service tests pass

### Deliverable

Working service management API with admin-only CRUD operations

---

## Phase 9: API Routes - Orders

**Goal**: Implement order management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Complex

**Estimated Time**: 6-8 hours

### Tasks

#### Task 9.1: Define Order Schemas
- [ ] Create `src/api/orders/schemas.ts`:
  ```typescript
  import { Schema } from '@effect/schema'

  export const CreateOrderItemRequest = Schema.Struct({
    serviceId: Schema.String.pipe(Schema.uuid()),
    quantity: Schema.Number.pipe(Schema.positive()),
  })

  export const CreateOrderRequest = Schema.Struct({
    customerId: Schema.String.pipe(Schema.uuid()),
    items: Schema.Array(CreateOrderItemRequest).pipe(Schema.minItems(1)),
    paymentStatus: Schema.optional(Schema.Literal('paid', 'unpaid')),
  })

  export const UpdateOrderStatusRequest = Schema.Struct({
    status: Schema.Literal('received', 'in_progress', 'ready', 'delivered'),
  })

  export const UpdatePaymentStatusRequest = Schema.Struct({
    paymentStatus: Schema.Literal('paid', 'unpaid'),
  })

  export const OrderResponse = Schema.Struct({
    id: Schema.String,
    order_number: Schema.String,
    customer_id: Schema.String,
    status: Schema.Literal('received', 'in_progress', 'ready', 'delivered'),
    payment_status: Schema.Literal('paid', 'unpaid'),
    total_price: Schema.Number,
    created_by: Schema.String,
    created_at: Schema.Date,
    updated_at: Schema.Date,
  })

  export const OrderWithItemsResponse = Schema.Struct({
    ...OrderResponse.fields,
    items: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        service_id: Schema.String,
        quantity: Schema.Number,
        price_at_order: Schema.Number,
        subtotal: Schema.Number,
      })
    ),
  })
  ```

#### Task 9.2: Implement Order Routes
- [ ] Create `src/api/orders/orderRoutes.ts`
- [ ] POST `/api/orders` - Create new order
- [ ] GET `/api/orders` - List orders (with filters)
- [ ] GET `/api/orders/:id` - Get order details with items
- [ ] PUT `/api/orders/:id/status` - Update order status
- [ ] PUT `/api/orders/:id/payment` - Update payment status

#### Task 9.3: Implement Order Creation Logic
- [ ] Parse and validate request body
- [ ] Extract current user from context (created_by)
- [ ] Call OrderService.create()
- [ ] Handle validation errors (empty items, invalid service IDs)
- [ ] Return created order

#### Task 9.4: Implement Order Status Updates
- [ ] Validate status transitions
- [ ] Update order status
- [ ] Return updated order

#### Task 9.5: Implement Order Retrieval
- [ ] List orders with pagination
- [ ] Filter by customer_id, status, payment_status
- [ ] Get order details including order items

#### Task 9.6: Write Integration Tests
- [ ] Test order creation with valid data
- [ ] Test order creation with empty items (should fail)
- [ ] Test order creation with invalid service ID
- [ ] Test price calculation accuracy
- [ ] Test order status transitions
- [ ] Test invalid status transitions
- [ ] Test payment status updates
- [ ] Test order retrieval with filters

### Verification Steps

- [ ] POST `/api/orders` creates order with correct total price
- [ ] POST `/api/orders` validates order items
- [ ] GET `/api/orders` returns orders with filters
- [ ] GET `/api/orders/:id` returns order with items
- [ ] PUT `/api/orders/:id/status` validates transitions
- [ ] PUT `/api/orders/:id/payment` updates payment status
- [ ] Order number is unique and well-formatted
- [ ] All order tests pass

### Deliverable

Working order management API with creation, retrieval, and status updates

---

## Phase 10: Analytics & Reporting

**Goal**: Implement analytics and receipt generation

**Prerequisites**: Phase 2 (Repositories), Phase 5 (HTTP Server) complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 10.1: Create Analytics Repository Methods
- [ ] Add analytics queries to OrderRepository or create AnalyticsRepository
- [ ] Implement weekly revenue query:
  ```sql
  SELECT
    DATE_TRUNC('week', created_at) as week_start,
    COUNT(*) as order_count,
    SUM(total_price) as total_revenue
  FROM orders
  WHERE created_at >= $1 AND created_at < $2
    AND (payment_status = $3 OR $3 = 'all')
  GROUP BY week_start
  ORDER BY week_start
  ```

#### Task 10.2: Define Analytics Schemas
- [ ] Create `src/api/analytics/schemas.ts`:
  ```typescript
  import { Schema } from '@effect/schema'

  export const WeeklyAnalyticsQuery = Schema.Struct({
    startDate: Schema.String, // ISO date string
    status: Schema.optional(Schema.Literal('paid', 'unpaid', 'all')),
  })

  export const WeeklyAnalyticsResponse = Schema.Struct({
    weeks: Schema.Array(
      Schema.Struct({
        week_start: Schema.Date,
        order_count: Schema.Number,
        total_revenue: Schema.Number,
      })
    ),
  })
  ```

#### Task 10.3: Implement Analytics Route
- [ ] Create `src/api/analytics/analyticsRoutes.ts`
- [ ] GET `/api/analytics/weekly?startDate={date}&status={paid|unpaid|all}`
- [ ] Protect with `requireAdmin` guard
- [ ] Query database for weekly aggregations
- [ ] Return formatted analytics data

#### Task 10.4: Create Receipt Generation Use Case
- [ ] Create `src/application/receipt/GenerateReceiptUseCase.ts`
- [ ] Fetch order with items
- [ ] Fetch customer details
- [ ] Format receipt data

#### Task 10.5: Implement Receipt Route
- [ ] Create `src/api/receipts/receiptRoutes.ts`
- [ ] GET `/api/receipts/:orderId` - Generate receipt
- [ ] Include order details, customer info, items, total
- [ ] Format for printing or display

#### Task 10.6: Write Tests
- [ ] Test weekly analytics query
- [ ] Test analytics filtering (paid/unpaid/all)
- [ ] Test receipt generation
- [ ] Test authorization (admin only for analytics)

### Verification Steps

- [ ] GET `/api/analytics/weekly` returns correct aggregations
- [ ] Analytics filters work correctly
- [ ] GET `/api/receipts/:orderId` returns complete receipt
- [ ] Analytics endpoint requires admin role
- [ ] All analytics tests pass

### Deliverable

Working analytics and reporting API with weekly revenue analytics and receipt generation

---

## Phase 11: Application Composition

**Goal**: Wire everything together with Effect Layers

**Prerequisites**: Phases 0-10 complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 11.1: Create Main Layer Composition
- [ ] Create `src/main.ts`:
  ```typescript
  import { Effect, Layer } from 'effect'
  import { BunRuntime } from '@effect/platform-bun'
  import { SqlLive } from './infrastructure/database/SqlClient'
  import { HttpServerLive } from './infrastructure/http/HttpServer'
  import { UserRepository } from './infrastructure/database/repositories/UserRepository'
  import { CustomerRepository } from './infrastructure/database/repositories/CustomerRepository'
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
    HttpServerLive
  )

  // Main program
  const program = Effect.gen(function* () {
    const server = yield* HttpServer.HttpServer

    yield* Effect.logInfo('Starting server...')
    yield* server.serve(router) // Mount all routes
    yield* Effect.logInfo('Server started successfully')

    // Keep server running
    yield* Effect.never
  })

  // Run application
  program.pipe(
    Effect.provide(AppLive),
    BunRuntime.runMain
  )
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

---

## Phase 12: Testing & Documentation

**Goal**: Comprehensive testing and documentation

**Prerequisites**: All phases 0-11 complete

**Complexity**: Medium

**Estimated Time**: 6-8 hours

### Tasks

#### Task 12.1: Write Integration Tests
- [ ] Test complete authentication flow (login → API call → refresh → logout)
- [ ] Test customer registration and order creation workflow
- [ ] Test order status progression workflow
- [ ] Test authorization (admin vs staff permissions)

#### Task 12.2: Write E2E Tests
- [ ] Test complete user journey: register customer → create order → update status → generate receipt
- [ ] Test error scenarios and edge cases

#### Task 12.3: Add Seed Data
- [ ] Create `src/infrastructure/database/seeds.ts`
- [ ] Add sample admin user
- [ ] Add sample staff user
- [ ] Add sample customers
- [ ] Add sample services
- [ ] Add sample orders

#### Task 12.4: Document API Endpoints
- [ ] Create `docs/API.md` with all endpoints
- [ ] Document request/response schemas
- [ ] Document authentication requirements
- [ ] Add example requests and responses

#### Task 12.5: Create Development Setup Guide
- [ ] Document prerequisites (PostgreSQL, Bun)
- [ ] Document environment variable setup
- [ ] Document database migration steps
- [ ] Document how to run the application

#### Task 12.6: Add Code Examples
- [ ] Document common Effect patterns used
- [ ] Add examples for creating new endpoints
- [ ] Document how to add new domain services

### Verification Steps

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E tests cover critical workflows
- [ ] Seed data can be loaded successfully
- [ ] API documentation is complete and accurate
- [ ] Development setup guide is clear and complete

### Deliverable

Well-tested, documented backend with:
- Comprehensive test coverage
- Working seed data
- Complete API documentation
- Development setup guide

---

## Phase 13: Production Readiness

**Goal**: Prepare for production deployment

**Prerequisites**: All phases 0-12 complete

**Complexity**: Medium

**Estimated Time**: 4-8 hours

### Tasks

#### Task 13.1: Add Structured Logging
- [ ] Configure Effect Logger
- [ ] Add structured logging to critical operations
- [ ] Log levels: DEBUG, INFO, WARN, ERROR
- [ ] Include correlation IDs for tracing

#### Task 13.2: Implement Rate Limiting
- [ ] Add rate limiting middleware
- [ ] Limit login attempts (10 per minute per IP)
- [ ] Limit API calls (100 per minute per user)

#### Task 13.3: Add Security Headers
- [ ] Content Security Policy
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security

#### Task 13.4: Performance Optimization
- [ ] Add database indices for common queries
- [ ] Optimize N+1 queries
- [ ] Add connection pooling configuration
- [ ] Profile and optimize slow queries

#### Task 13.5: Add Health Check Endpoint
- [ ] GET `/health` - Check server health
- [ ] GET `/health/db` - Check database connection
- [ ] Return status and latency

#### Task 13.6: Production Environment Configuration
- [ ] Create `.env.production` template
- [ ] Document production environment variables
- [ ] Configure SSL/TLS for database
- [ ] Configure HTTPS-only cookies

#### Task 13.7: Deployment Documentation
- [ ] Document deployment process
- [ ] Document database migration strategy
- [ ] Document rollback procedures
- [ ] Document monitoring setup

### Verification Steps

- [ ] Structured logging works correctly
- [ ] Rate limiting prevents abuse
- [ ] Security headers are set
- [ ] Database queries are optimized
- [ ] Health check endpoints work
- [ ] Production configuration is complete
- [ ] Deployment documentation is clear

### Deliverable

Production-ready backend with:
- Structured logging
- Rate limiting
- Security headers
- Optimized performance
- Health checks
- Production configuration
- Deployment documentation

---

## Development Workflow

### Getting Started

1. **Clone repository and navigate to backend**:
   ```bash
   cd /applications/backend
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
import { SqlClient, Model } from '@effect/sql'
import { Effect, Option } from 'effect'
import { YourEntity } from '@domain/your-entity/YourEntity'

export class YourRepository extends Effect.Service<YourRepository>()(
  'YourRepository',
  {
    effect: Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const repo = yield* Model.makeRepository(YourEntity, {
        tableName: 'your_table',
        spanPrefix: 'YourRepository',
        idColumn: 'id',
      })

      // Add custom methods
      const findByField = (field: string) =>
        sql<YourEntity>`SELECT * FROM your_table WHERE field = ${field}`

      return {
        ...repo, // findById, insert, update, delete
        findByField,
      }
    }),
    dependencies: [],
  }
) {}
```

### Pattern 2: Creating a Domain Service

```typescript
import { Effect, Option } from 'effect'
import { YourRepository } from '@infrastructure/database/repositories/YourRepository'
import { YourError } from './YourErrors'

export class YourService extends Effect.Service<YourService>()(
  'YourService',
  {
    effect: Effect.gen(function* () {
      const repo = yield* YourRepository

      const businessMethod = (input: string) =>
        Effect.gen(function* () {
          // Business logic here
          const result = yield* repo.findByField(input)

          if (Option.isNone(result)) {
            return yield* Effect.fail(new YourError({ input }))
          }

          return result.value
        })

      return {
        businessMethod,
      }
    }),
    dependencies: [YourRepository.Default],
  }
) {}
```

### Pattern 3: Creating an API Route

```typescript
import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { parseBody } from '@infrastructure/http/RequestParser'
import { YourService } from '@domain/your-entity/YourService'
import { YourRequestSchema, YourResponseSchema } from './schemas'

export const yourRoute = Effect.gen(function* () {
  const yourService = yield* YourService

  // Parse and validate request
  const request = yield* parseBody(YourRequestSchema)

  // Call domain service
  const result = yield* yourService.businessMethod(request.field)

  // Return response
  return yield* HttpServerResponse.json(result)
})
```

### Pattern 4: Error Handling

```typescript
// Define typed errors
export class YourError extends Data.TaggedError('YourError')<{
  field: string
  reason?: string
}> {}

// Use errors in service
const service = Effect.gen(function* () {
  const result = yield* someOperation()

  if (!result) {
    return yield* Effect.fail(new YourError({ field: 'value' }))
  }

  return result
})

// Handle errors in HTTP layer
service.pipe(
  Effect.catchTag('YourError', (error) =>
    HttpServerResponse.json(
      { error: { code: 'YOUR_ERROR', message: error.reason } },
      { status: 400 }
    )
  )
)
```

### Pattern 5: Testing with Mock Layers

```typescript
import { describe, test, expect } from 'vitest'
import { Effect, Layer } from 'effect'

describe('YourService', () => {
  test('should do something', async () => {
    // Create mock repository
    const MockRepo = Layer.succeed(
      YourRepository,
      YourRepository.of({
        findById: (id) => Effect.succeed(Option.some(mockData)),
        insert: (data) => Effect.succeed(mockData),
        // ... other methods
      })
    )

    // Test program
    const program = Effect.gen(function* () {
      const service = yield* YourService
      return yield* service.businessMethod('test')
    }).pipe(
      Effect.provide(MockRepo),
      Effect.provide(YourService.Default)
    )

    const result = await Effect.runPromise(program)
    expect(result).toBeDefined()
  })
})
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


