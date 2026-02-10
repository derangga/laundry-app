## Phase 8: API Routes - Services

**Goal**: Implement laundry service management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 8.1: Define Service Schemas

- [ ] Create `src/api/services/schemas.ts`:

  ```typescript
  import { Schema } from "@effect/schema";

  export const CreateServiceRequest = Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)),
    price: Schema.Number.pipe(Schema.positive()),
    unit_type: Schema.Literal("kg", "set"),
  });

  export const UpdateServiceRequest = Schema.Struct({
    name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
    price: Schema.optional(Schema.Number.pipe(Schema.positive())),
    unit_type: Schema.optional(Schema.Literal("kg", "set")),
  });

  export const ServiceResponse = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    price: Schema.Number,
    unit_type: Schema.Literal("kg", "set"),
    is_active: Schema.Boolean,
    created_at: Schema.Date,
    updated_at: Schema.Date,
  });
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
