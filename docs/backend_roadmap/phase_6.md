## Phase 6: API Routes - Authentication

**Goal**: Implement authentication endpoints

**Prerequisites**: Phase 3 (Auth), Phase 5 (HTTP Server) complete

**Complexity**: Medium

**Estimated Time**: 3-4 hours

### Tasks

#### Task 6.1: Define Authentication Request/Response Schemas

- [ ] Create `src/api/auth/schemas.ts`:

  ```typescript
  import { Schema } from "@effect/schema";

  export const LoginRequest = Schema.Struct({
    email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    password: Schema.String.pipe(Schema.minLength(8)),
  });

  export const LoginResponse = Schema.Struct({
    accessToken: Schema.String,
    refreshToken: Schema.String,
    user: Schema.Struct({
      id: Schema.String,
      email: Schema.String,
      role: Schema.Literal("admin", "staff"),
    }),
  });

  export const RefreshTokenRequest = Schema.Struct({
    refreshToken: Schema.String,
  });

  export const RefreshTokenResponse = Schema.Struct({
    accessToken: Schema.String,
    refreshToken: Schema.String,
  });
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
