## Phase 7: API Routes - Customers

**Goal**: Implement customer management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 7.1: Define Customer Schemas

- [ ] Create `src/api/customers/schemas.ts`:

  ```typescript
  import { Schema } from "@effect/schema";

  export const CreateCustomerRequest = Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)),
    phone: Schema.String,
    address: Schema.optional(Schema.String),
  });

  export const CustomerResponse = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    phone: Schema.String,
    address: Schema.NullOr(Schema.String),
    created_at: Schema.Date,
    updated_at: Schema.Date,
  });

  export const SearchCustomerQuery = Schema.Struct({
    phone: Schema.String,
  });
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
