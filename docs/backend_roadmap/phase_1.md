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
  import { Schema } from "@effect/schema";
  import { Model } from "@effect/sql";

  export class User extends Model.Class<User>("User")({
    id: Model.Generated(Schema.String),
    email: Schema.String,
    password_hash: Schema.String,
    role: Schema.Literal("admin", "staff"),
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}

  export type UserRole = "admin" | "staff";
  ```

- [ ] Create `src/domain/customer/Customer.ts`:

  ```typescript
  import { Schema } from "@effect/schema";
  import { Model } from "@effect/sql";

  export class Customer extends Model.Class<Customer>("Customer")({
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
  import { Schema } from "@effect/schema";
  import { Model } from "@effect/sql";

  export class LaundryService extends Model.Class<LaundryService>(
    "LaundryService",
  )({
    id: Model.Generated(Schema.String),
    name: Schema.String,
    price: Schema.Number,
    unit_type: Schema.Literal("kg", "set"),
    is_active: Schema.Boolean,
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}

  export type UnitType = "kg" | "set";
  ```

- [ ] Create `src/domain/order/Order.ts`:

  ```typescript
  import { Schema } from "@effect/schema";
  import { Model } from "@effect/sql";

  export class Order extends Model.Class<Order>("Order")({
    id: Model.Generated(Schema.String),
    order_number: Schema.String,
    customer_id: Schema.String,
    status: Schema.Literal("received", "in_progress", "ready", "delivered"),
    payment_status: Schema.Literal("paid", "unpaid"),
    total_price: Schema.Number,
    created_by: Schema.String,
    created_at: Model.DateTimeInsert,
    updated_at: Model.DateTimeUpdate,
  }) {}

  export type OrderStatus = "received" | "in_progress" | "ready" | "delivered";
  export type PaymentStatus = "paid" | "unpaid";
  ```

- [ ] Create `src/domain/order/OrderItem.ts`:

  ```typescript
  import { Schema } from "@effect/schema";
  import { Model } from "@effect/sql";

  export class OrderItem extends Model.Class<OrderItem>("OrderItem")({
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
  import { SqlClient } from "@effect/sql";
  import { PgClient } from "@effect/sql-pg";
  import { Config, Layer } from "effect";

  export const SqlLive = PgClient.layer({
    host: Config.string("DATABASE_HOST"),
    port: Config.number("DATABASE_PORT"),
    database: Config.string("DATABASE_NAME"),
    username: Config.string("DATABASE_USER"),
    password: Config.secret("DATABASE_PASSWORD"),
  });
  ```

#### Task 1.12: Test Database Connection

- [ ] Create `src/infrastructure/database/__tests__/connection.test.ts`:

  ```typescript
  import { describe, test, expect } from "vitest";
  import { Effect } from "effect";
  import { SqlClient } from "@effect/sql";
  import { SqlLive } from "../SqlClient";

  describe("Database Connection", () => {
    test("should connect to database", async () => {
      const program = Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const result = yield* sql`SELECT 1 as result`;
        return result[0].result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(SqlLive)),
      );

      expect(result).toBe(1);
    });
  });
  ```

- [ ] Run test: `bun test`

### Key Files to Create

- Migration files in `/backend/migrations/`
- Entity models in `/backend/src/domain/`
- SqlClient configuration in `/backend/src/infrastructure/database/`

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
