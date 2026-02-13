## Phase 8: API Routes - Services

**Goal**: Implement laundry service management endpoints

**Prerequisites**: Phase 4 (Domain Services), Phase 5 (HTTP Server) complete

**Complexity**: Simple

**Estimated Time**: 2-3 hours

### Tasks

#### Task 8.1: Define Service Schemas

- [x] Use existing domain models from `@domain/LaundryService.ts`:
  - `CreateLaundryServiceInput` for create request
  - `UpdateLaundryServiceInput` for update request
  - `LaundryService` for response

#### Task 8.2: Implement Service Routes

- [x] Create `src/api/ServiceApi.ts`
- [x] GET `/api/services` - List all active services (public)
- [x] POST `/api/services` - Create service (Admin only)
- [x] PUT `/api/services/:id` - Update service (Admin only)
- [x] DELETE `/api/services/:id` - Soft delete service (Admin only)

#### Task 8.3: Add Admin Authorization

- [x] Protect POST, PUT, DELETE routes with `AuthMiddleware` + requireAdmin check
- [x] Allow public access to GET route
- [x] Use `setPath()` for dynamic path parameters (per Effect platform docs)

#### Task 8.4: Write Integration Tests

- [x] Test service list retrieval
- [x] Test service creation (as admin)
- [x] Test service update (as admin)
- [x] Test service deletion (soft delete)
- [x] Test authorization (non-admin cannot create/update/delete)

### Verification Steps

- [x] GET `/api/services` returns active services (no auth required)
- [x] POST `/api/services` creates service (admin only)
- [x] PUT `/api/services/:id` updates service (admin only)
- [x] DELETE `/api/services/:id` soft deletes service (admin only)
- [x] Non-admin users receive 403 on protected routes
- [x] All service tests pass

### Deliverable

Working service management API with admin-only CRUD operations

### Files Created/Modified

**Created:**
- `src/api/ServiceApi.ts` - API definition with HttpApi
- `src/handlers/ServiceHandlers.ts` - Request handlers
- `test/api/services/serviceRoutes.test.ts` - Integration tests (8 tests)

**Modified:**
- `src/domain/http/HttpErrors.ts` - Added ServiceNotFound HTTP error
- `src/http/Router.ts` - Added ServiceApi layer
