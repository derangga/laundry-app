## Phase 2: Repository Layer

**Status**: ✅ Complete

**Goal**: Implement data access layer using Effect.Service pattern

**Prerequisites**: Phase 1 complete

**Complexity**: Medium

**Estimated Time**: 4-6 hours

### Tasks

#### Task 2.1: Create UserRepository ✅

- [x] Create `src/infrastructure/database/repositories/UserRepository.ts`:

  ```typescript
  import { SqlClient } from "@effect/sql";
  import { Model } from "@effect/sql";
  import { Effect, Option } from "effect";
  import { User } from "@domain/user/User";

  export class UserRepository extends Effect.Service<UserRepository>()(
    "UserRepository",
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const repo = yield* Model.makeRepository(User, {
          tableName: "users",
          spanPrefix: "UserRepository",
          idColumn: "id",
        });

        const findByEmail = (email: string) =>
          sql<User>`SELECT * FROM users WHERE email = ${email}`.pipe(
            Effect.map((rows) =>
              rows.length > 0 ? Option.some(rows[0]) : Option.none(),
            ),
          );

        return {
          ...repo, // findById, insert, update, delete
          findByEmail,
        };
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 2.2: Create CustomerRepository ✅

- [x] Create `src/infrastructure/database/repositories/CustomerRepository.ts`:

  ```typescript
  import { SqlClient } from "@effect/sql";
  import { Model } from "@effect/sql";
  import { Effect, Option } from "effect";
  import { Customer } from "@domain/customer/Customer";

  export class CustomerRepository extends Effect.Service<CustomerRepository>()(
    "CustomerRepository",
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const repo = yield* Model.makeRepository(Customer, {
          tableName: "customers",
          spanPrefix: "CustomerRepository",
          idColumn: "id",
        });

        const findByPhone = (phone: string) =>
          sql<Customer>`SELECT * FROM customers WHERE phone = ${phone}`.pipe(
            Effect.map((rows) =>
              rows.length > 0 ? Option.some(rows[0]) : Option.none(),
            ),
          );

        const searchByName = (name: string) =>
          sql<Customer>`SELECT * FROM customers WHERE name ILIKE ${"%" + name + "%"}`;

        return {
          ...repo,
          findByPhone,
          searchByName,
        };
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 2.3: Create ServiceRepository ✅

- [x] Create `src/infrastructure/database/repositories/ServiceRepository.ts`:

  ```typescript
  import { SqlClient } from "@effect/sql";
  import { Model } from "@effect/sql";
  import { Effect } from "effect";
  import { LaundryService } from "@domain/service/LaundryService";

  export class ServiceRepository extends Effect.Service<ServiceRepository>()(
    "ServiceRepository",
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const repo = yield* Model.makeRepository(LaundryService, {
          tableName: "services",
          spanPrefix: "ServiceRepository",
          idColumn: "id",
        });

        const findActive = () =>
          sql<LaundryService>`SELECT * FROM services WHERE is_active = true ORDER BY name`;

        const softDelete = (id: string) =>
          sql`UPDATE services SET is_active = false, updated_at = NOW() WHERE id = ${id}`;

        return {
          ...repo,
          findActive,
          softDelete,
        };
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 2.4: Create OrderRepository ✅

- [x] Create `src/infrastructure/database/repositories/OrderRepository.ts`:

  ```typescript
  import { SqlClient } from "@effect/sql";
  import { Model } from "@effect/sql";
  import { Effect } from "effect";
  import { Order, OrderStatus, PaymentStatus } from "@domain/order/Order";

  export class OrderRepository extends Effect.Service<OrderRepository>()(
    "OrderRepository",
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const repo = yield* Model.makeRepository(Order, {
          tableName: "orders",
          spanPrefix: "OrderRepository",
          idColumn: "id",
        });

        const findByCustomerId = (customerId: string) =>
          sql<Order>`SELECT * FROM orders WHERE customer_id = ${customerId} ORDER BY created_at DESC`;

        const findByOrderNumber = (orderNumber: string) =>
          sql<Order>`SELECT * FROM orders WHERE order_number = ${orderNumber}`.pipe(
            Effect.map((rows) =>
              rows.length > 0 ? Option.some(rows[0]) : Option.none(),
            ),
          );

        const updateStatus = (id: string, status: OrderStatus) =>
          sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;

        const updatePaymentStatus = (
          id: string,
          paymentStatus: PaymentStatus,
        ) =>
          sql`UPDATE orders SET payment_status = ${paymentStatus}, updated_at = NOW() WHERE id = ${id}`;

        return {
          ...repo,
          findByCustomerId,
          findByOrderNumber,
          updateStatus,
          updatePaymentStatus,
        };
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 2.5: Create OrderItemRepository ✅

- [x] Create `src/infrastructure/database/repositories/OrderItemRepository.ts`:

  ```typescript
  import { SqlClient } from "@effect/sql";
  import { Model } from "@effect/sql";
  import { Effect } from "effect";
  import { OrderItem } from "@domain/order/OrderItem";

  export class OrderItemRepository extends Effect.Service<OrderItemRepository>()(
    "OrderItemRepository",
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const repo = yield* Model.makeRepository(OrderItem, {
          tableName: "order_items",
          spanPrefix: "OrderItemRepository",
          idColumn: "id",
        });

        const findByOrderId = (orderId: string) =>
          sql<OrderItem>`SELECT * FROM order_items WHERE order_id = ${orderId}`;

        const insertMany = (
          items: Array<Omit<OrderItem, "id" | "created_at">>,
        ) =>
          Effect.forEach(items, (item) => repo.insert(item), {
            concurrency: "unbounded",
          });

        return {
          ...repo,
          findByOrderId,
          insertMany,
        };
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 2.6: Create RefreshTokenRepository ✅

- [x] Create `src/infrastructure/database/repositories/RefreshTokenRepository.ts`:

  ```typescript
  import { SqlClient } from "@effect/sql";
  import { Model } from "@effect/sql";
  import { Effect, Option } from "effect";
  import { Schema } from "@effect/schema";

  class RefreshToken extends Model.Class<RefreshToken>("RefreshToken")({
    id: Model.Generated(Schema.String),
    user_id: Schema.String,
    token_hash: Schema.String,
    expires_at: Schema.Date,
    created_at: Model.DateTimeInsert,
    revoked_at: Schema.NullOr(Schema.Date),
  }) {}

  export class RefreshTokenRepository extends Effect.Service<RefreshTokenRepository>()(
    "RefreshTokenRepository",
    {
      effect: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const repo = yield* Model.makeRepository(RefreshToken, {
          tableName: "refresh_tokens",
          spanPrefix: "RefreshTokenRepository",
          idColumn: "id",
        });

        const findByTokenHash = (tokenHash: string) =>
          sql<RefreshToken>`
            SELECT * FROM refresh_tokens
            WHERE token_hash = ${tokenHash}
            AND revoked_at IS NULL
            AND expires_at > NOW()
          `.pipe(
            Effect.map((rows) =>
              rows.length > 0 ? Option.some(rows[0]) : Option.none(),
            ),
          );

        const revoke = (id: string) =>
          sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${id}`;

        const revokeAllForUser = (userId: string) =>
          sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${userId} AND revoked_at IS NULL`;

        const deleteExpired = () =>
          sql`DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`;

        return {
          ...repo,
          findByTokenHash,
          revoke,
          revokeAllForUser,
          deleteExpired,
        };
      }),
      dependencies: [],
    },
  ) {}
  ```

#### Task 2.7: Write Repository Tests ✅

- [x] Create test file for each repository in `test/infrastructure/database/repositories/`
- [x] Test CRUD operations for each repository
- [x] Test custom methods (findByPhone, findByEmail, etc.)
- [x] Use test database or mocks

Example test structure:

```typescript
import { describe, test, expect, beforeEach } from "vitest";
import { Effect, Layer } from "effect";
import { CustomerRepository } from "@infrastructure/database/repositories/CustomerRepository";
import { SqlLive } from "@infrastructure/database/SqlClient";

describe("CustomerRepository", () => {
  const TestLayer = Layer.mergeAll(SqlLive, CustomerRepository.Default);

  test("should insert and find customer by phone", async () => {
    const program = Effect.gen(function* () {
      const repo = yield* CustomerRepository;

      const newCustomer = {
        name: "John Doe",
        phone: "+628123456789",
        address: "Jakarta",
      };

      const created = yield* repo.insert(newCustomer);
      const found = yield* repo.findByPhone(newCustomer.phone);

      return { created, found };
    });

    const { created, found } = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer)),
    );

    expect(Option.isSome(found)).toBe(true);
    expect(Option.getOrThrow(found).phone).toBe("+628123456789");
  });
});
```

### Key Files to Create

- Repository implementations in `src/infrastructure/database/repositories/`
- Repository tests in `test/infrastructure/database/repositories/`

### Verification Steps

- [x] All repositories compile without errors
- [x] Each repository extends Effect.Service
- [x] Custom query methods are implemented (using direct SQL queries instead of Model.makeRepository)
- [x] Repository tests pass (38 tests passing)
- [x] All repositories follow the same pattern

### Deliverable

Complete repository layer with:

- UserRepository with email lookup
- CustomerRepository with phone lookup
- ServiceRepository with soft delete
- OrderRepository with status updates
- OrderItemRepository with batch insert
- RefreshTokenRepository with revocation
- Unit tests for all repositories
