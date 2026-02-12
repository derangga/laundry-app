# Phase 7 Customer Management API Integration Test Plan

## Overview

This document outlines comprehensive integration test cases for the Phase 7 customer management API endpoints. These tests should be implemented to verify customer search, creation, retrieval, phone number normalization, and error handling scenarios.

## Test Environment Setup

### Prerequisites
- Test database with seed data (admin and staff users for authentication)
- HTTP client supporting bearer token authentication
- Test utilities for:
  - JWT token generation for authenticated requests
  - Database state inspection
  - Phone number normalization verification

### Test Users
```typescript
const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  },
  staff: {
    email: 'staff@example.com',
    password: 'password123',
    role: 'staff'
  }
}
```

### Test Customers
```typescript
const testCustomers = {
  existing: {
    name: 'John Doe',
    phone: '+628123456789',  // Normalized format
    address: 'Jakarta Selatan'
  },
  new: {
    name: 'Jane Smith',
    phone: '08987654321',
    address: 'Bandung'
  },
  noAddress: {
    name: 'Bob Wilson',
    phone: '+628555666777',
    address: null
  }
}
```

## Test Suites

### 1. GET /api/customers?phone={phone}

#### 1.1 Success Cases

**Test: Find existing customer with normalized phone**
- Setup:
  1. Login to get access token
  2. Create customer with phone '+628123456789'
- Request:
  ```
  GET /api/customers?phone=08123456789
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body:
    ```json
    {
      "id": "<uuid>",
      "name": "John Doe",
      "phone": "+628123456789",
      "address": "Jakarta Selatan",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
    ```
- Assertions:
  - ✓ Response status is 200
  - ✓ Customer object matches expected structure
  - ✓ Phone is normalized to +628XX format
  - ✓ All customer fields are present

**Test: Find customer with phone in +628XX format**
- Setup:
  1. Create customer with phone '08123456789'
- Request:
  ```
  GET /api/customers?phone=+628123456789
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains customer with phone '+628123456789'
- Assertions:
  - ✓ Response status is 200
  - ✓ Customer is found regardless of input format
  - ✓ Phone normalization works correctly

**Test: Find customer with phone in 628XX format**
- Setup:
  1. Create customer with phone '08123456789'
- Request:
  ```
  GET /api/customers?phone=628123456789
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains customer with phone '+628123456789'
- Assertions:
  - ✓ Response status is 200
  - ✓ Customer is found with 628XX format input
  - ✓ Phone normalization handles all formats

#### 1.2 Validation Error Cases

**Test: Missing phone query parameter**
- Request:
  ```
  GET /api/customers
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body:
    ```json
    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Phone query parameter is required"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR
  - ✓ Error message indicates missing phone parameter

**Test: Invalid phone number format**
- Request:
  ```
  GET /api/customers?phone=invalid
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body:
    ```json
    {
      "error": {
        "code": "INVALID_PHONE_NUMBER",
        "message": "Invalid Indonesian phone number format"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is INVALID_PHONE_NUMBER
  - ✓ Invalid phone formats are rejected

**Test: Empty phone parameter**
- Request:
  ```
  GET /api/customers?phone=
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body contains validation error
- Assertions:
  - ✓ Response status is 400
  - ✓ Empty phone parameter is rejected

#### 1.3 Not Found Cases

**Test: Customer does not exist**
- Request:
  ```
  GET /api/customers?phone=08999999999
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 404 Not Found
  - Body:
    ```json
    {
      "error": {
        "code": "CUSTOMER_NOT_FOUND",
        "message": "Customer with phone +628999999999 not found"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 404
  - ✓ Error code is CUSTOMER_NOT_FOUND
  - ✓ Error message includes normalized phone

#### 1.4 Authentication Cases

**Test: No access token provided**
- Request:
  ```
  GET /api/customers?phone=08123456789
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

**Test: Invalid access token**
- Request:
  ```
  GET /api/customers?phone=08123456789
  Authorization: Bearer invalid-token-12345
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains INVALID_TOKEN error
- Assertions:
  - ✓ Response status is 401
  - ✓ Invalid tokens are rejected

**Test: Expired access token**
- Setup:
  1. Create expired JWT token
- Request:
  ```
  GET /api/customers?phone=08123456789
  Authorization: Bearer <expired-token>
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Error indicates token is expired
- Assertions:
  - ✓ Response status is 401
  - ✓ Expired tokens are rejected

### 2. POST /api/customers

#### 2.1 Success Cases

**Test: Create customer with all fields**
- Setup:
  1. Login to get access token
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "Jane Smith",
    "phone": "08987654321",
    "address": "Bandung"
  }
  ```
- Expected Response:
  - Status: 201 Created
  - Body:
    ```json
    {
      "id": "<uuid>",
      "name": "Jane Smith",
      "phone": "+628987654321",
      "address": "Bandung",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
    ```
- Assertions:
  - ✓ Response status is 201
  - ✓ Customer object is returned with generated ID
  - ✓ Phone is normalized to +628XX format
  - ✓ Customer is stored in database
  - ✓ created_at and updated_at timestamps are set

**Test: Create customer without address (optional field)**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "Bob Wilson",
    "phone": "08555666777"
  }
  ```
- Expected Response:
  - Status: 201 Created
  - Body:
    ```json
    {
      "id": "<uuid>",
      "name": "Bob Wilson",
      "phone": "+628555666777",
      "address": null,
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
    ```
- Assertions:
  - ✓ Response status is 201
  - ✓ Customer is created successfully
  - ✓ address is null when not provided
  - ✓ Optional fields work correctly

#### 2.2 Validation Error Cases

**Test: Missing required field - name**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "phone": "08123456789",
    "address": "Jakarta"
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
              "message": "name is missing"
            }
          ]
        }
      }
    }
    ```
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR
  - ✓ Error indicates name is required

**Test: Missing required field - phone**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "John Doe",
    "address": "Jakarta"
  }
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body contains validation error for missing phone
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR
  - ✓ Error indicates phone is required

**Test: Empty name string**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "",
    "phone": "08123456789"
  }
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body contains validation error for empty name
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is VALIDATION_ERROR
  - ✓ Empty string is not allowed for name

**Test: Empty phone string**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "John Doe",
    "phone": ""
  }
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body contains validation error for empty phone
- Assertions:
  - ✓ Response status is 400
  - ✓ Empty string is not allowed for phone

**Test: Invalid phone number format**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "John Doe",
    "phone": "invalid-phone"
  }
  ```
- Expected Response:
  - Status: 400 Bad Request
  - Body:
    ```json
    {
      "error": {
        "code": "INVALID_PHONE_NUMBER",
        "message": "Invalid Indonesian phone number format"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 400
  - ✓ Error code is INVALID_PHONE_NUMBER
  - ✓ Invalid phone formats are rejected

#### 2.3 Conflict Cases

**Test: Duplicate phone number**
- Setup:
  1. Create customer with phone '08123456789'
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "Another Person",
    "phone": "08123456789"
  }
  ```
- Expected Response:
  - Status: 409 Conflict
  - Body:
    ```json
    {
      "error": {
        "code": "CUSTOMER_ALREADY_EXISTS",
        "message": "Customer with phone +628123456789 already exists"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 409
  - ✓ Error code is CUSTOMER_ALREADY_EXISTS
  - ✓ Error message includes normalized phone
  - ✓ Duplicate customer is not created

**Test: Duplicate phone with different format**
- Setup:
  1. Create customer with phone '08123456789'
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <access-token>
  Content-Type: application/json
  {
    "name": "Another Person",
    "phone": "+628123456789"
  }
  ```
- Expected Response:
  - Status: 409 Conflict
  - Body contains CUSTOMER_ALREADY_EXISTS error
- Assertions:
  - ✓ Response status is 409
  - ✓ Phone normalization detects duplicate
  - ✓ Different input formats are normalized correctly

#### 2.4 Authentication Cases

**Test: No access token provided**
- Request:
  ```json
  POST /api/customers
  Content-Type: application/json
  {
    "name": "John Doe",
    "phone": "08123456789"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains UNAUTHORIZED error
- Assertions:
  - ✓ Response status is 401
  - ✓ Middleware blocks unauthenticated access

**Test: Invalid access token**
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer invalid-token
  Content-Type: application/json
  {
    "name": "John Doe",
    "phone": "08123456789"
  }
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains INVALID_TOKEN error
- Assertions:
  - ✓ Response status is 401
  - ✓ Invalid tokens are rejected

#### 2.5 Role Access Cases

**Test: Staff can create customer**
- Setup:
  1. Login as staff user
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <staff-access-token>
  Content-Type: application/json
  {
    "name": "Customer A",
    "phone": "08111222333"
  }
  ```
- Expected Response:
  - Status: 201 Created
  - Body contains created customer
- Assertions:
  - ✓ Response status is 201
  - ✓ Staff role can create customers

**Test: Admin can create customer**
- Setup:
  1. Login as admin user
- Request:
  ```json
  POST /api/customers
  Authorization: Bearer <admin-access-token>
  Content-Type: application/json
  {
    "name": "Customer B",
    "phone": "08222333444"
  }
  ```
- Expected Response:
  - Status: 201 Created
  - Body contains created customer
- Assertions:
  - ✓ Response status is 201
  - ✓ Admin role can create customers

### 3. GET /api/customers/:id

#### 3.1 Success Cases

**Test: Get existing customer by ID**
- Setup:
  1. Login to get access token
  2. Create customer and get its ID
- Request:
  ```
  GET /api/customers/<customer-id>
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body:
    ```json
    {
      "id": "<customer-id>",
      "name": "John Doe",
      "phone": "+628123456789",
      "address": "Jakarta",
      "created_at": "<timestamp>",
      "updated_at": "<timestamp>"
    }
    ```
- Assertions:
  - ✓ Response status is 200
  - ✓ Customer object matches expected structure
  - ✓ All fields are present
  - ✓ ID matches requested ID

#### 3.2 Not Found Cases

**Test: Non-existent customer ID**
- Request:
  ```
  GET /api/customers/00000000-0000-0000-0000-000000000000
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 404 Not Found
  - Body:
    ```json
    {
      "error": {
        "code": "CUSTOMER_NOT_FOUND",
        "message": "Customer not found"
      }
    }
    ```
- Assertions:
  - ✓ Response status is 404
  - ✓ Error code is CUSTOMER_NOT_FOUND

**Test: Invalid UUID format**
- Request:
  ```
  GET /api/customers/invalid-uuid
  Authorization: Bearer <access-token>
  ```
- Expected Response:
  - Status: 404 Not Found or 400 Bad Request
  - Body contains error message
- Assertions:
  - ✓ Invalid UUID is handled gracefully
  - ✓ No server crash or unhandled error

#### 3.3 Authentication Cases

**Test: No access token provided**
- Request:
  ```
  GET /api/customers/<customer-id>
  (no Authorization header)
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains UNAUTHORIZED error
- Assertions:
  - ✓ Response status is 401
  - ✓ Middleware blocks unauthenticated access

**Test: Invalid access token**
- Request:
  ```
  GET /api/customers/<customer-id>
  Authorization: Bearer invalid-token
  ```
- Expected Response:
  - Status: 401 Unauthorized
  - Body contains INVALID_TOKEN error
- Assertions:
  - ✓ Response status is 401
  - ✓ Invalid tokens are rejected

#### 3.4 Role Access Cases

**Test: Staff can access customer by ID**
- Setup:
  1. Login as staff
  2. Create customer
- Request:
  ```
  GET /api/customers/<customer-id>
  Authorization: Bearer <staff-access-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains customer object
- Assertions:
  - ✓ Response status is 200
  - ✓ Staff role can access customers

**Test: Admin can access customer by ID**
- Setup:
  1. Login as admin
  2. Create customer
- Request:
  ```
  GET /api/customers/<customer-id>
  Authorization: Bearer <admin-access-token>
  ```
- Expected Response:
  - Status: 200 OK
  - Body contains customer object
- Assertions:
  - ✓ Response status is 200
  - ✓ Admin role can access customers

### 4. Integration Flow Tests

**Test: Complete customer lifecycle workflow**
- Steps:
  1. Login to get access token
  2. Search for customer by phone (should be 404)
  3. Create customer with phone 08123456789
  4. Verify customer is created with normalized phone +628123456789
  5. Search for customer by phone 08123456789 (should be 200)
  6. Search for customer by phone +628123456789 (should be 200)
  7. Get customer by ID (should be 200)
  8. Attempt to create duplicate customer (should be 409)
- Assertions:
  - ✓ Each step succeeds in sequence
  - ✓ Customer not found before creation
  - ✓ Customer found after creation
  - ✓ Phone normalization works end-to-end
  - ✓ Duplicate detection works
  - ✓ All endpoints return consistent data

**Test: Phone normalization across all formats**
- Steps:
  1. Create customer with phone '08123456789'
  2. Search with '08123456789' (should find)
  3. Search with '+628123456789' (should find)
  4. Search with '628123456789' (should find)
  5. Attempt to create with '08123456789' (should be 409)
  6. Attempt to create with '+628123456789' (should be 409)
  7. Attempt to create with '628123456789' (should be 409)
- Assertions:
  - ✓ Customer is found with all phone formats
  - ✓ Duplicate detection works with all formats
  - ✓ Phone normalization is consistent
  - ✓ Stored phone is in normalized format

**Test: Concurrent customer creation with same phone**
- Setup:
  1. Login to get access token
- Actions:
  1. Send 2 simultaneous POST requests with same phone number
- Expected:
  - First request succeeds (201)
  - Second request fails (409)
- Assertions:
  - ✓ Only one customer is created
  - ✓ Race condition is handled correctly
  - ✓ Uniqueness constraint is enforced

## Test Implementation Notes

### Testing Libraries
- Use Effect's testing utilities for service layer testing
- Use supertest or similar for HTTP integration testing
- Use database transactions for test isolation

### Database Cleanup
- Each test should run in isolation
- Use transactions with rollback or database cleanup between tests
- Seed required test users before test suite runs
- Clear customer data between tests

### Environment Variables
- Use test-specific database
- Use test-specific JWT secrets
- Set appropriate test timeouts

### Phone Number Testing
- Test all three phone formats: 08XX, +628XX, 628XX
- Verify normalization produces consistent +628XX format
- Test invalid formats: short numbers, letters, special chars
- Test edge cases: empty string, whitespace, null

### Coverage Goals
- 100% coverage of customer route handlers
- All validation rules tested
- All error paths tested
- Phone normalization verified
- Authentication and authorization verified

## TODO: Implementation

- [ ] Set up test environment and database
- [ ] Implement test utilities (auth helpers, phone validators)
- [ ] Implement GET /api/customers?phone={phone} tests (11 test cases)
- [ ] Implement POST /api/customers tests (12 test cases)
- [ ] Implement GET /api/customers/:id tests (7 test cases)
- [ ] Implement integration flow tests (3 test cases)
- [ ] Add test documentation and examples
- [ ] Integrate into CI/CD pipeline

**Total Test Cases: 33**
