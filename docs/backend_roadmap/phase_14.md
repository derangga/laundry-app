# Phase 14: Frontend Support — Add GET /api/auth/me Endpoint

**Goal**: Add a `GET /api/auth/me` endpoint that returns the authenticated user's profile data from the JWT token. This is required by the frontend to check auth state on page load without rotating refresh tokens.

**Prerequisites**: Auth system complete (phases 1-3)

**Complexity**: Low

**Motivation**: The frontend needs to verify if the current user is authenticated and get their profile (id, email, name, role). Currently the only way to get user data is via login or refresh responses, both of which rotate tokens. A dedicated `/me` endpoint reads from the existing JWT (via AuthMiddleware) and returns user data without side effects.

---

## Tasks

### Task 14.1: Add `me` Endpoint to AuthApi

**Modify `backend/src/api/AuthApi.ts`:**

Add a new GET endpoint to the `AuthGroup`:

```typescript
.add(
  HttpApiEndpoint.get('me', '/api/auth/me')
    .addSuccess(AuthenticatedUser)
    .addError(Unauthorized)
    .middleware(AuthMiddleware)
)
```

- Uses `AuthMiddleware` (Bearer token) — not `AuthAdminMiddleware`
- Returns `AuthenticatedUser` (already defined in `backend/src/domain/Auth.ts`)
- Only error: `Unauthorized` (401) if token is missing/invalid/expired

### Task 14.2: Add `me` Handler

**Modify `backend/src/handlers/AuthHandlers.ts`:**

Add handler for the `me` endpoint:

```typescript
.handle('me', () =>
  Effect.gen(function* () {
    const currentUser = yield* CurrentUser

    return AuthenticatedUser.make({
      id: currentUser.id,
      email: currentUser.email,
      name: '', // see note below
      role: currentUser.role,
    })
  })
)
```

**Important**: The `CurrentUser` context (provided by `AuthMiddleware`) contains `{ id, email, role }` from the JWT payload. However, `AuthenticatedUser` also has a `name` field. There are two options:

**Option A (simple)**: Look up the user's name from the database via `UserRepository.findById(currentUser.id)` to populate the `name` field. This adds a DB query but is accurate.

**Option B (faster)**: Add `name` to the JWT payload (`JwtPayload` in `domain/Auth.ts`), which avoids the DB lookup. This requires updating `JwtService` to include `name` when signing tokens, and means existing tokens will need to be refreshed to get the name field.

**Recommended**: Option A for now — it's simpler and doesn't require JWT changes. The single DB lookup per `/me` call is negligible.

```typescript
.handle('me', () =>
  Effect.gen(function* () {
    const currentUser = yield* CurrentUser
    const userRepo = yield* UserRepository

    const userOption = yield* userRepo.findById(currentUser.id)

    if (Option.isNone(userOption)) {
      return yield* Effect.fail(
        new Unauthorized({ message: 'User not found' })
      )
    }

    const user = userOption.value

    return AuthenticatedUser.make({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  })
)
```

### Task 14.3: Add Test for GET /api/auth/me

**Add test in `backend/src/__tests__/` (or existing auth test file):**

Test cases:
- `GET /api/auth/me` with valid token → 200, returns `{ id, email, name, role }`
- `GET /api/auth/me` without token → 401
- `GET /api/auth/me` with expired token → 401

### Task 14.4: Update API_TEST.md

**Modify `docs/API_TEST.md`:**

Add curl example:

```bash
### GET /api/auth/me - Get Current User

**Endpoint:** `GET /api/auth/me`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $AUTH_TOKEN"

#### Success Response (200)

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "staff@laundry.com",
  "name": "John Doe",
  "role": "staff"
}

#### Error Response (401 - No Token)

{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Update the endpoint summary count from 20 to 21.

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `backend/src/api/AuthApi.ts` — add `me` endpoint definition |
| Modify | `backend/src/handlers/AuthHandlers.ts` — add `me` handler |
| Create | Test file for the new endpoint |
| Modify | `docs/API_TEST.md` — add curl example |

## Acceptance Criteria

- [ ] `GET /api/auth/me` with valid Bearer token returns `{ id, email, name, role }` with status 200
- [ ] `GET /api/auth/me` without token returns 401
- [ ] `GET /api/auth/me` with expired token returns 401
- [ ] Response matches `AuthenticatedUser` schema (defined in `backend/src/domain/Auth.ts`)
- [ ] Tests pass
- [ ] API_TEST.md updated with curl example

## Dependencies

- Existing: `AuthMiddleware`, `CurrentUser`, `AuthenticatedUser`, `UserRepository`
- No new dependencies needed

## Impact on Frontend

After this endpoint is implemented, the frontend auth strategy simplifies:
- `useCurrentUser()` hook can call `GET /api/auth/me` directly instead of relying only on cached login/refresh responses
- Page refresh recovery: try `GET /api/auth/me` first (with existing access token from cookie/memory), fall back to refresh only if it returns 401
- Reduces unnecessary token rotations
