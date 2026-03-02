## Table of Contents

| Date | Title |
|------|-------|
| 2026-03-02 | Raw SQL Returns JS Date Instead of DateTime.Utc |

---

## Problem

The `searchByPhone` (`GET /api/customers/search`) and `getById` (`GET /api/customers/:id`) endpoints return an `HttpApiDecodeError` when encoding the response:

```
HttpApiDecodeError: Expected DateTimeUtcString, actual [Date object]
```

The `create` endpoint (`POST /api/customers`) works fine.

## Why This Happens

Two things combine to cause this:

### 1. `sql<T>` template literals don't decode at runtime

Raw SQL queries using `sql<Customer>\`...\`` only provide **TypeScript type hints**. The PostgreSQL driver returns `TIMESTAMPTZ` columns as raw JS `Date` objects — they are NOT decoded through the `Customer` Model schema.

```typescript
// This does NOT decode through the schema at runtime
// created_at/updated_at are raw JS Date objects, NOT DateTime.Utc
const findByPhone = (phone: string) =>
  sql<Customer>`
    SELECT id, name, phone, address, created_at, updated_at
    FROM customers WHERE phone = ${phone}
  `.pipe(Effect.map((rows) => Option.fromNullable(rows[0])))
```

### 2. `HttpApiBuilder` encodes responses through the response schema

When the handler returns a value, `HttpApiBuilder` encodes it through `CustomerResponse`, which uses `DateTimeUtcString` (i.e., `Schema.DateTimeUtc`). This schema expects a `DateTime.Utc` instance — not a raw JS `Date` — so encoding fails.

### Why `create` works

`repo.insert` comes from `Model.makeRepository`, which **does** decode SQL results through the `Customer` Model schema. This converts `Date` → `DateTime.Utc` automatically.

```typescript
// Model.makeRepository decodes through the schema — Date → DateTime.Utc
const repo = yield* Model.makeRepository(Customer, {
  tableName: 'customers',
  spanPrefix: 'CustomerRepository',
  idColumn: 'id',
})
// repo.insert properly returns DateTime.Utc for timestamp fields
```

## Solution

Explicitly construct the response DTO in the handler, converting raw `Date` objects to `DateTime.Utc` using `DateTime.unsafeFromDate()`:

```typescript
import { DateTime } from 'effect'
import { CustomerResponse } from '@domain/Customer'

.handle('searchByPhone', ({ urlParams }) =>
  Effect.gen(function* () {
    const customerService = yield* CustomerService
    const customer = yield* customerService.findByPhone(urlParams.phone).pipe(...)

    return CustomerResponse.make({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      created_at: DateTime.unsafeFromDate(customer.created_at as unknown as Date),
      updated_at: DateTime.unsafeFromDate(customer.updated_at as unknown as Date),
    })
  })
)
```

The `as unknown as Date` cast is needed because TypeScript thinks `customer.created_at` is `DateTime.Utc` (from the `sql<Customer>` type hint), but at runtime it's actually a raw `Date`.

## Alternative Approach: Decode in the Repository

Instead of converting in the handler, you could decode SQL results through the schema in the repository (same pattern as the [DECIMAL string fix](./postgresql-decimal-string-fix.md)):

```typescript
import { Schema } from 'effect'

const decodeCustomer = Schema.decodeUnknown(Customer)

const findByPhone = (phone: string) =>
  sql`
    SELECT id, name, phone, address, created_at, updated_at
    FROM customers WHERE phone = ${phone}
  `.pipe(
    Effect.flatMap((rows) =>
      rows[0] ? decodeCustomer(rows[0]) : Effect.succeed(Option.none())
    ),
    Effect.map(Option.some),
    Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
  )
```

This is the more robust fix since it ensures the domain model is always properly decoded, but it requires more changes in the repository layer.

## Key Takeaways

1. **`sql<T>` is only TypeScript typing** — it doesn't decode at runtime (same root cause as the DECIMAL string issue)
2. **`Model.makeRepository` methods DO decode** — `insert`, `findById` from the repo properly decode through the schema
3. **Custom raw SQL queries do NOT decode** — any hand-written `sql\`...\`` query returns raw driver types
4. **Always convert timestamps from raw SQL** — use `DateTime.unsafeFromDate()` when constructing response DTOs from raw SQL results
5. **Explicit response mapping is safer** — constructing response DTOs explicitly (like `OrderHandlers` does) catches these issues at the handler level

## Affected Column Types

| PostgreSQL Type | Raw JS Return | Schema Expects | Fix |
|-----------------|---------------|----------------|-----|
| TIMESTAMPTZ | `Date` | `DateTime.Utc` | `DateTime.unsafeFromDate()` |
| TIMESTAMP | `Date` | `DateTime.Utc` | `DateTime.unsafeFromDate()` |
| DECIMAL(x,y) | `string` | `number` | `DecimalNumber` schema |

## Files Changed in This Fix

- `backend/src/handlers/CustomerHandlers.ts` — Added explicit `CustomerResponse.make()` with `DateTime.unsafeFromDate()` conversion for `searchByPhone` and `getById` handlers
