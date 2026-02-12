# Phase 6 Authentication API Integration Test Plan

## Overview

This document outlines comprehensive integration test cases for the Phase 6 authentication API endpoints. These tests should be implemented to verify the complete authentication flow including httpOnly cookie handling, request validation, and error scenarios.

## Test Environment Setup

### Prerequisites
- Test database with seed data (admin and staff users)
- HTTP client supporting cookie management (e.g., supertest, fetch with cookie jar)
- Test utilities for:
  - Cookie parsing and validation
  - JWT token verification
  - Database state inspection

### Test Users
```typescript
const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    expectedRole: 'admin'
  },
  staff: {
    email: 'staff@example.com',
    password: 'password123',
    expectedRole: 'staff'
  }
}
```

## Test Suites

### 1. POST /api/auth/login

#### 1.1 Success Cases

**Test: Successful login with valid credentials**
- Request:
  ```json
  POST /api/auth/login
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```
- Expected Response:
  - Status: 200 OK
  - Body:
    ```json
    {
      "accessToken": "<valid-jwt>",
      "refreshToken": "<valid-token>",
      "user": {
        "id": "<uuid>",
        "email": "admin@example.com",
        "name": "Admin User",
        "role": "admin"
      }
    }
    ```
  - Headers:
    - `Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`
    - `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=604800`
- Assertions:
  - ✓ Response status is 200
  - ✓ Response body contains valid JWT accessToken
  - ✓ Response body contains refreshToken string
  - ✓ User object matches expected structure and data
  - ✓ Two Set-Cookie headers are present
  - ✓ accessToken cookie has httpOnly flag
  - ✓ accessToken cookie has secure flag (if production)
  - ✓ accessToken cookie has sameSite=strict
  - ✓ accessToken cookie has path=/
  - ✓ accessToken cookie has maxAge=900
  - ✓ refreshToken cookie has httpOnly flag
  - ✓ refreshToken cookie has path=/api/auth/refresh
  - ✓ refreshToken cookie has maxAge=604800
  - ✓ Refresh token is stored in database (hashed)

#### 1.2 Validation Error Cases

**Test: Invalid email format**
- Request:
  ```json
  POST /api/auth/login
  {
    "email": "notanemail",
    "password": "password123"
  }
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body:
    ```json
    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "details": {
          "errors": [
            {
              "field": "body",
              "message": "Invalid email format"
            }
          ]
        }
      }
    }
    ```
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR
  - ✓ Error message mentions invalid email format

**Test: Password too short**
- Request:
  ```json
  POST /api/auth/login
  {
    "email": "test@example.com",
    "password": "short"
  }
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body contains validation error for password minLength
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR
  - ✓ Error message mentions password length requirement

**Test: Missing required fields**
- Request variations:
  ```json
  POST /api/auth/login
  { "email": "test@example.com" }  // Missing password

  POST /api/auth/login
  { "password": "password123" }  // Missing email

  POST /api/auth/login
  {}  // Missing both
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body contains validation error for missing fields
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR

#### 1.3 Authentication Error Cases

**Test: Wrong password**
- Request:
  ```json
  POST /api/auth/login
  {
    "email": "admin@example.com",
    "password": "wrongpassword123"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body:
    ```json
    {
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 401
  - ✓ Error code is INVALID_CREDENTIALS
  - ✓ No cookies are set

**Test: Non-existent user**
- Request:
  ```json
  POST /api/auth/login
  {
    "email": "nonexistent@example.com",
    "password": "password123"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains INVALID_CREDENTIALS error
- Assertions:
  - ✓ Response status is 401
  - ✓ Error code is INVALID_CREDENTIALS
  - ✓ Error message doesn't reveal if user exists (security)

### 2. POST /api/auth/refresh

#### 2.1 Success Cases

**Test: Successful refresh with refreshToken in cookie**
- Setup:
  1. Login to get initial tokens and cookies
  2. Wait 1 second to ensure new timestamps
- Request:
  ```
  POST /api/auth/refresh
  Cookie: refreshToken=<valid-refresh-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains new accessToken, new refreshToken, and user data
  - Headers contain new Set-Cookie for both tokens
- Assertions:
  - ✓ Response status is 200
  - ✓ New accessToken is different from original
  - ✓ New refreshToken is different from original
  - ✓ User object matches logged-in user
  - ✓ New cookies are set
  - ✓ Old refresh token is revoked in database
  - ✓ New refresh token is stored in database

**Test: Successful refresh with refreshToken in body**
- Setup:
  1. Login to get initial tokens (ignore cookies)
- Request:
  ```json
  POST /api/auth/refresh
  {
    "refreshToken": "<valid-refresh-token>"
  }
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains new tokens and user data
  - Headers contain new Set-Cookie for both tokens
- Assertions:
  - ✓ Response status is 200
  - ✓ New tokens are generated
  - ✓ Cookies are set
  - ✓ Token rotation occurred

**Test: Cookie takes precedence over body**
- Setup:
  1. Login as admin to get adminRefreshToken
  2. Login as staff to get staffRefreshToken
- Request:
  ```json
  POST /api/auth/refresh
  Cookie: refreshToken=<admin-refresh-token>
  {
    "refreshToken": "<staff-refresh-token>"
  }
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains admin user data (cookie token was used)
- Assertions:
  - ✓ Response status is 200
  - ✓ User is admin (not staff)
  - ✓ Cookie token was prioritized

#### 2.2 Error Cases

**Test: No refresh token provided**
- Request:
  ```
  POST /api/auth/refresh
  (no cookie, no body)
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body:
    ```json
    {
      "error": {
        "code": "INVALID_TOKEN",
        "message": "No refresh token provided"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 401
  - ✓ Error code is INVALID_TOKEN

**Test: Invalid refresh token**
- Request:
  ```json
  POST /api/auth/refresh
  {
    "refreshToken": "invalid-token-12345"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains REFRESH_TOKEN_NOT_FOUND error
- Assertions:
  - ✓ Response status is 401
  - ✓ Error code is REFRESH_TOKEN_NOT_FOUND

**Test: Expired refresh token**
- Setup:
  1. Create refresh token with past expiry date in database
- Request:
  ```json
  POST /api/auth/refresh
  {
    "refreshToken": "<expired-token>"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Error indicates token is invalid/expired
- Assertions:
  - ✓ Response status is 401
  - ✓ Expired token is not accepted

**Test: Already used refresh token (token rotation)**
- Setup:
  1. Login to get refreshToken
  2. Use refreshToken once successfully
  3. Try to use same old refreshToken again
- Request:
  ```json
  POST /api/auth/refresh
  {
    "refreshToken": "<already-used-token>"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains REFRESH_TOKEN_NOT_FOUND error
- Assertions:
  - ✓ Response status is 401
  - ✓ Old token is not reusable
  - ✓ Token rotation security enforced

### 3. POST /api/auth/logout

#### 3.1 Success Cases

**Test: Successful logout with refreshToken in cookie**
- Setup:
  1. Login to get tokens and cookies
- Request:
  ```
  POST /api/auth/logout
  Authorization: Bearer <access-token>
  Cookie: refreshToken=<refresh-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body:
    ```json
    {
      "success": true,
      "message": "Successfully logged out."
    }
    ```
  - Headers:
    - `Set-Cookie: accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    - `Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- Assertions:
  - ✓ Response status is 200
  - ✓ Success is true
  - ✓ Both cookies are cleared (Max-Age=0, Expires=epoch)
  - ✓ Refresh token is revoked in database

**Test: Successful logout with refreshToken in body**
- Setup:
  1. Login to get tokens
- Request:
  ```json
  POST /api/auth/logout
  Authorization: Bearer <access-token>
  {
    "refreshToken": "<refresh-token>"
  }
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains success message
  - Cookies are cleared
- Assertions:
  - ✓ Response status is 200
  - ✓ Refresh token is revoked
  - ✓ Cookies are cleared

**Test: Logout all sessions**
- Setup:
  1. Login multiple times to create multiple refresh tokens for same user
  2. Verify multiple tokens exist in database
- Request:
  ```json
  POST /api/auth/logout
  Authorization: Bearer <access-token>
  {
    "refreshToken": "<one-refresh-token>",
    "logoutAll": true
  }
  ```
- Expected Response:
  - Status: 200 OK
  - Body:
    ```json
    {
      "success": true,
      "message": "Logged out from all sessions. X token(s) revoked."
    }
    ```
- Assertions:
  - ✓ Response status is 200
  - ✓ All refresh tokens for user are revoked
  - ✓ Message indicates count of revoked tokens

**Test: Logout without refresh token (edge case)**
- Setup:
  1. Login to get access token only
- Request:
  ```
  POST /api/auth/logout
  Authorization: Bearer <access-token>
  (no refresh token in cookie or body)
  ```
- Expected Response:
  - Status: 200 OK
  - Body:
    ```json
    {
      "success": true,
      "message": "Logged out (no refresh token provided)."
    }
    ```
- Assertions:
  - ✓ Response status is 200
  - ✓ Logout succeeds even without refresh token
  - ✓ Cookies are still cleared

#### 3.2 Error Cases

**Test: Logout without authentication**
- Request:
  ```
  POST /api/auth/logout
  (no Authorization header)
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body:
    ```json
    {
      "error": {
        "code": "UNAUTHORIZED",
        "message": "Authentication required"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 401
  - ✓ Error code is UNAUTHORIZED
  - ✓ Middleware blocks unauthenticated access

**Test: Logout with invalid access token**
- Request:
  ```
  POST /api/auth/logout
  Authorization: Bearer invalid-token-12345
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains INVALID_TOKEN error
- Assertions:
  - ✓ Response status is 401
  - ✓ Error code is INVALID_TOKEN
  - ✓ Invalid tokens are rejected

**Test: Logout with expired access token**
- Setup:
  1. Create expired JWT access token
- Request:
  ```
  POST /api/auth/logout
  Authorization: Bearer <expired-access-token>
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Error indicates token is invalid/expired
- Assertions:
  - ✓ Response status is 401
  - ✓ Expired access tokens are rejected

### 4. Cookie Security and Attributes

**Test: Cookie attributes in production environment**
- Setup:
  - Set NODE_ENV=production
- Actions:
  1. Login
  2. Inspect Set-Cookie headers
- Assertions:
  - ✓ accessToken cookie has Secure flag
  - ✓ refreshToken cookie has Secure flag
  - ✓ Both cookies have HttpOnly flag
  - ✓ Both cookies have SameSite=Strict

**Test: Cookie attributes in development environment**
- Setup:
  - Set NODE_ENV=development
- Actions:
  1. Login
  2. Inspect Set-Cookie headers
- Assertions:
  - ✓ accessToken cookie does NOT have Secure flag
  - ✓ refreshToken cookie does NOT have Secure flag
  - ✓ Both cookies have HttpOnly flag
  - ✓ Both cookies have SameSite=Strict

**Test: Cookie path restrictions**
- Setup:
  1. Login to get cookies
- Actions:
  1. Send request to /api/auth/refresh with refreshToken cookie
  2. Send request to /api/auth/login with refreshToken cookie
  3. Verify which endpoints receive the refreshToken cookie
- Assertions:
  - ✓ refreshToken cookie is sent to /api/auth/refresh (path match)
  - ✓ refreshToken cookie is NOT sent to other paths (path restriction)
  - ✓ accessToken cookie is sent to all paths (path=/)

### 5. Integration Flow Tests

**Test: Complete authentication flow**
- Steps:
  1. Login with valid credentials
  2. Verify cookies are set
  3. Use access token to access protected resource
  4. Refresh tokens using cookie
  5. Verify new tokens work
  6. Logout
  7. Verify cookies are cleared
  8. Verify old tokens don't work
- Assertions:
  - ✓ Each step succeeds in sequence
  - ✓ Token rotation works correctly
  - ✓ Logout invalidates tokens

**Test: Concurrent refresh token usage (race condition)**
- Setup:
  1. Login to get tokens
- Actions:
  1. Send 2 simultaneous refresh requests with same refreshToken
- Expected:
  - First request succeeds (200)
  - Second request fails (401) - token already revoked
- Assertions:
  - ✓ Only one refresh succeeds
  - ✓ Token rotation prevents reuse
  - ✓ No race condition issues

**Test: Multiple sessions for same user**
- Setup:
  1. Login from "browser 1" (get tokens/cookies A)
  2. Login from "browser 2" (get tokens/cookies B)
- Actions:
  1. Verify both sessions work independently
  2. Logout from browser 1 (logoutAll=false)
  3. Verify browser 1 tokens don't work
  4. Verify browser 2 tokens still work
  5. Logout from browser 2 (logoutAll=true)
  6. Verify all tokens are revoked
- Assertions:
  - ✓ Multiple sessions coexist
  - ✓ Individual logout works
  - ✓ Logout all terminates all sessions

## Test Implementation Notes

### Testing Libraries
- Use Effect's testing utilities for service mocking
- Use supertest or similar for HTTP assertions
- Use cookie-parser or manual parsing for cookie validation

### Database Cleanup
- Each test should run in isolation
- Use transactions or database cleanup between tests
- Seed required test users before test suite runs

### Environment Variables
- Tests should override NODE_ENV to test both production and development behaviors
- Use test-specific JWT secrets
- Use short token expiries for testing expiration scenarios

### Coverage Goals
- 100% coverage of auth route handlers
- All validation rules tested
- All error paths tested
- Cookie security attributes verified
- Token rotation logic verified

## TODO: Implementation

- [ ] Set up test environment and database
- [ ] Implement test utilities (cookie parser, JWT verifier)
- [ ] Implement POST /api/auth/login tests (11 test cases)
- [ ] Implement POST /api/auth/refresh tests (9 test cases)
- [ ] Implement POST /api/auth/logout tests (8 test cases)
- [ ] Implement cookie security tests (3 test cases)
- [ ] Implement integration flow tests (3 test cases)
- [ ] Add test documentation and examples
- [ ] Integrate into CI/CD pipeline

**Total Test Cases: 34**
