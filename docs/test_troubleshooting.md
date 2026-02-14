## Table of Contents

| Date | Title |
|------|-------|
| 2026-02-14 | Schema DateTimeUtc Decoding Error in Repository Tests |

---
## Overview

This document contains common issues encountered during unit testing and their solutions.


## Schema DateTimeUtc Decoding Error in Repository Tests

**Date:** 2026-02-14
**File:** `backend/test/repositories/OrderItemRepository.test.ts`

### Problem

Test fails with schema decoding error:

```
DateTimeUtc
└─ Encoded side transformation failure
   └─ Expected string, actual DateTime.Utc(2024-01-01T00:00:00.000Z)
```

### Root Cause

When testing repository methods that use `Schema.decodeUnknown()`, the mock data must provide **raw database values** (encoded), not already-decoded domain objects.

**Schema types behave differently:**

| Schema Type | Encoded (DB) | Decoded (Domain) |
|-------------|--------------|------------------|
| `Schema.DateTimeUtc` | `string` | `DateTime.Utc` |
| `Model.DateTimeInsertFromDate` | `Date` | `DateTime.Utc` |

The error occurs when using `.make()` with `DateTime.unsafeMake()`:

```typescript
// WRONG - creates decoded domain object
OrderItemWithService.make({
  created_at: DateTime.unsafeMake(new Date('2024-01-01')),
})
```

The repository's `Schema.decodeUnknown()` expects string input but receives `DateTime.Utc`.

### Solution

Create mock helper functions that return raw database-like data:

```typescript
const createMockOrderItemWithService = (
  overrides: Partial<OrderItemWithService> = {}
): OrderItemWithService =>
  ({
    id: 'item-123',
    order_id: 'order-123',
    service_id: 'service-123',
    service_name: 'Regular Wash',
    unit_type: 'kg',
    quantity: 5,
    price_at_order: 10000,
    subtotal: 50000,
    created_at: '2024-01-01T00:00:00.000Z', // string, not DateTime
    ...overrides,
  }) as unknown as OrderItemWithService
```

**Key points:**
- Use string ISO format for `Schema.DateTimeUtc` fields
- Use `Date` object for `Model.DateTimeInsertFromDate` fields
- Follow existing mock helper patterns in the test file

### Quick Reference

| Domain Field Schema | Mock Value Type | Example |
|---------------------|-----------------|---------|
| `Schema.DateTimeUtc` | `string` | `'2024-01-01T00:00:00.000Z'` |
| `Model.DateTimeInsertFromDate` | `Date` | `new Date('2024-01-01')` |
| `DecimalNumber` | `number` | `10000` |
| Branded types (`OrderId`, etc.) | `string` | `'order-123'` |
