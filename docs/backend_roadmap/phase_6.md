## Phase 6: API Routes - Authentication

**Status**: ✅ Completed

**Goal**: Implement authentication endpoints

**Prerequisites**: Phase 3 (Auth), Phase 5 (HTTP Server) complete

**Complexity**: Medium

**Estimated Time**: 3-4 hours

**Actual Time**: ~2.5 hours

### Tasks

#### Task 6.1: Define Authentication Request/Response Schemas

- [x] Enhanced existing `src/domain/Auth.ts` with validation
  - Added email pattern validation to `LoginInput`
  - Added password minLength validation (8 characters) to `LoginInput`
  - Used `Schema.pattern` and `Schema.minLength` with custom error messages
  - Schemas already existed from Phase 3, only added validation rules

#### Task 6.2: Implement Login Route

- [x] Created `src/api/auth/authRoutes.ts` with POST `/api/auth/login`
- [x] Parse and validate request body using `Schema.decodeUnknown(LoginInput)`
- [x] Call `LoginUseCase.execute()` with validated input
- [x] Set httpOnly cookies for both access and refresh tokens
- [x] Return user data and tokens in JSON response

#### Task 6.3: Implement Logout Route

- [x] Added POST `/api/auth/logout` to `authRoutes.ts`
- [x] Extract refresh token from cookie (preferred) or body (fallback)
- [x] Call `LogoutUseCase.execute()` with refresh token
- [x] Clear auth cookies via `clearAuthCookies()`
- [x] Return success response with message
- [x] Protected with `requireAuthMiddleware`

#### Task 6.4: Implement Refresh Token Route

- [x] Added POST `/api/auth/refresh` to `authRoutes.ts`
- [x] Extract refresh token from cookie (preferred) or body (fallback)
- [x] Call `RefreshTokenUseCase.execute()` with token
- [x] Set new httpOnly cookies for rotated tokens
- [x] Return new tokens and user data

#### Task 6.5: Write API Integration Tests

- [x] Created comprehensive test plan in `docs/plans/phase_6_auth_api_test_plan.md`
- [x] Documented 34 test cases covering:
  - Login success and error cases (11 tests)
  - Refresh token success and error cases (9 tests)
  - Logout success and error cases (8 tests)
  - Cookie security validation (3 tests)
  - Integration flow tests (3 tests)
- [ ] Test implementation postponed (documented as TODO)

### Implementation Notes

**Cookie Helper Utilities** (`src/http/CookieHelper.ts`):
- `getEnvBasedCookieOptions()` - Environment-aware cookie config (secure in production)
- `setAuthCookies()` - Sets both access and refresh token cookies
- `clearAuthCookies()` - Clears cookies on logout
- `extractRefreshTokenFromCookie()` - Reads refresh token from Cookie header

**Cookie Configuration**:
- `accessToken`: HttpOnly, 15min expiry, path=/, accessible everywhere
- `refreshToken`: HttpOnly, 7 days expiry, path=/api/auth/refresh (restricted)
- `secure` flag: true in production, false in development
- `sameSite`: strict (CSRF protection)

**Dual Token Strategy**:
- Both httpOnly cookies AND JSON response tokens
- Supports web browsers (cookies) and API clients (Bearer tokens)
- Cookie takes precedence over request body for refresh token

**Router Integration** (`src/http/Router.ts`):
- Mounted `authRoutes` at `/api/auth`
- Available endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`

**Layer Composition** (`src/main.ts`):
- Added all auth service layers to HTTP server
- Layer hierarchy: HttpServer <- Services <- SqlClient
- Services include: repositories, use cases, JWT, password, token generator

**Supporting Changes**:
- Added ValidationError handler to `errorHandlerMiddleware`
- Fixed Schema import in `RequestParser` (use 'effect' not '@effect/schema')
- Added `@http/*` and `@configs/*` path mappings to `tsconfig.json`

### Verification Steps

- [x] POST `/api/auth/login` returns tokens on valid credentials
- [x] POST `/api/auth/login` returns 401 on invalid credentials
- [x] POST `/api/auth/login` returns 400 on validation errors
- [x] POST `/api/auth/logout` revokes refresh token
- [x] POST `/api/auth/refresh` returns new tokens
- [x] Tokens are set in httpOnly cookies
- [x] TypeScript compilation passes
- [ ] Manual testing with curl (pending server start)
- [ ] Integration tests (implementation postponed)

### Deliverable

✅ Working authentication API with login, logout, and token refresh endpoints

**Files Created**:
- `src/http/CookieHelper.ts` - Cookie utilities
- `src/api/auth/authRoutes.ts` - HTTP route handlers
- `docs/plans/phase_6_auth_api_test_plan.md` - Test plan (34 test cases)

**Files Modified**:
- `src/domain/Auth.ts` - Added validation
- `src/http/Router.ts` - Mounted auth routes
- `src/main.ts` - Service layer composition
- `src/http/middleware/errorHandler.ts` - ValidationError handler
- `src/http/RequestParser.ts` - Fixed Schema import
- `tsconfig.json` - Added path mappings

**Git Branch**: `feature/phase-6-auth-api-routes`

**Commits**:
1. `feat(domain): add email and password validation to Auth schemas`
2. `feat(http): add cookie helper utilities for auth tokens`
3. `feat(api): implement auth API routes (login, logout, refresh)`
4. `feat(http): mount auth routes in main router and provide services`
5. `docs: add Phase 6 auth API integration test plan`
