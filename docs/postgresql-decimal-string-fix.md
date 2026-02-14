# PostgreSQL DECIMAL Returns Strings in Effect SQL

## Problem

When using Effect SQL with PostgreSQL, `DECIMAL` / `NUMERIC` columns are returned as **strings** instead of numbers.

```json
// Expected
{"price": 15000}

// Actual from PostgreSQL
{"price": "15000.00"}
```

This causes schema validation errors when using `Schema.Number`:

```
Expected number, actual "15000.00"
```

## Why This Happens

1. **PostgreSQL preserves precision**: DECIMAL columns return strings to avoid JavaScript floating-point precision loss
2. **Effect SQL template literals don't decode**: Using `sql<T>` only provides TypeScript type hints, not runtime schema decoding

```typescript
// This does NOT decode through the schema at runtime
sql<LaundryService>`SELECT * FROM services`
```

## Solution

### Step 1: Create a DecimalNumber Schema

Create `src/domain/common/DecimalNumber.ts`:

```typescript
import { Schema } from 'effect'

/**
 * Schema for DECIMAL/NUMERIC columns from PostgreSQL.
 * Accepts both string (from DB) and number (from JSON), outputs number.
 */
export const DecimalNumber = Schema.transform(
  Schema.Union(Schema.Number, Schema.String),
  Schema.Number,
  {
    strict: true,
    decode: (input) => (typeof input === 'string' ? parseFloat(input) : input),
    encode: (n) => n,
  }
)
```

### Step 2: Use DecimalNumber in Domain Models

```typescript
// In domain model files (e.g., LaundryService.ts)
import { DecimalNumber } from './common/DecimalNumber.js'

export class LaundryService extends Model.Class<LaundryService>('LaundryService')({
  id: Model.Generated(ServiceId),
  name: Schema.String,
  price: DecimalNumber,  // Changed from Schema.Number
  // ...
}) {}
```

**Note**: Keep input schemas using `Schema.Number` since JSON requests already send numbers:

```typescript
export class CreateLaundryServiceInput extends Schema.Class<CreateLaundryServiceInput>(
  'CreateLaundryServiceInput'
)({
  price: Schema.Number,  // Keep as Schema.Number for JSON input
}) {}
```

### Step 3: Decode SQL Results Through Schema

The critical fix - pipe SQL results through schema decoders:

```typescript
import { Effect, Schema } from 'effect'
import { SqlClient, SqlError } from '@effect/sql'
import { LaundryService } from '../domain/LaundryService'

// Create decoders
const decodeServices = Schema.decodeUnknown(Schema.Array(LaundryService))
const decodeService = Schema.decodeUnknown(LaundryService)

// Use in repository methods
const findActive = (): Effect.Effect<readonly LaundryService[], SqlError.SqlError> =>
  sql`
    SELECT id, name, price, unit_type, is_active, created_at, updated_at
    FROM services
    WHERE is_active = true
  `.pipe(
    Effect.flatMap((rows) => decodeServices(rows)),
    Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
  )

const insert = (data: CreateInput): Effect.Effect<LaundryService, SqlError.SqlError> =>
  sql`
    INSERT INTO services (name, price) VALUES (${data.name}, ${data.price})
    RETURNING id, name, price, created_at, updated_at
  `.pipe(
    Effect.flatMap((rows) => {
      const first = rows[0]
      return first !== undefined
        ? decodeService(first)
        : Effect.fail(new Error('Insert failed'))
    }),
    Effect.mapError((e) => new SqlError.SqlError({ cause: e }))
  )
```

## Key Takeaways

1. **`sql<T>` is only TypeScript typing** - it doesn't decode at runtime
2. **Always decode SQL results** through `Schema.decodeUnknown()` for proper type transformation
3. **Separate input vs output schemas** - input schemas receive JSON (numbers), output schemas receive DB data (strings for DECIMAL)
4. **Create reusable transform schemas** for common PostgreSQL type mismatches

## Affected Column Types

| PostgreSQL Type | JavaScript Return | Solution |
|-----------------|-------------------|----------|
| DECIMAL(x,y) | string | DecimalNumber schema |
| NUMERIC(x,y) | string | DecimalNumber schema |
| BIGINT | string (if > Number.MAX_SAFE_INTEGER) | Similar transform |
| INTEGER | number | No fix needed |
| REAL/FLOAT | number | No fix needed |

## Files Changed in This Fix

- `src/domain/common/DecimalNumber.ts` - New schema
- `src/domain/LaundryService.ts` - Updated price fields
- `src/domain/Order.ts` - Updated price/quantity fields
- `src/repositories/ServiceRepository.ts` - Added schema decoding
- `src/repositories/OrderRepository.ts` - Added schema decoding
- `src/repositories/OrderItemRepository.ts` - Added schema decoding
