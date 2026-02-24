# API Testing with curl

This document provides curl request examples for testing all API endpoints (21 total).

## Prerequisites

- Backend server running on `http://localhost:3000`
- Set environment variables for tokens and IDs:
  ```bash
  export AUTH_TOKEN=""
  export REFRESH_TOKEN=""
  export CUSTOMER_ID=""
  export SERVICE_ID=""
  export ORDER_ID=""
  export USER_ID=""
  ```

## Table of Contents

- [Health Endpoints](#health-endpoints)
- [Authentication Endpoints](#authentication-endpoints)
- [Customer Management](#customer-management)
- [Order Management](#order-management)
- [Service Management](#service-management)
- [Analytics Endpoints](#analytics-endpoints)
- [Receipt Generation](#receipt-generation)
- [Testing Workflow](#testing-workflow)

---

## Health Endpoints

### GET /health - Server Health Check

**Endpoint:** `GET /health`
**Authentication:** Not required
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/health
```

#### Success Response (200)

```json
{
  "status": "ok",
  "timestamp": "2026-02-22T10:30:00.000Z"
}
```

---

### GET /health/db - Database Health Check

**Endpoint:** `GET /health/db`
**Authentication:** Not required
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/health/db
```

#### Success Response (200)

```json
{
  "status": "ok",
  "latencyMs": 12.5,
  "timestamp": "2026-02-22T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### POST /api/auth/bootstrap - Create First Admin User

**Endpoint:** `POST /api/auth/bootstrap`
**Authentication:** Not required (public endpoint)
**Status Code:** 201 Created on success

**IMPORTANT:** This endpoint only works on a fresh installation with no users. After the first user is created, this endpoint returns 403 Forbidden.

#### Request

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "SecureAdminPass123",
    "name": "System Administrator"
  }'
```

#### Success Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@laundry.com",
  "name": "System Administrator",
  "role": "admin",
  "created_at": "2026-02-12T08:30:00.000Z",
  "updated_at": "2026-02-12T08:30:00.000Z"
}
```

#### Error Response (403 - Already Bootstrapped)

```json
{
  "error": {
    "code": "BOOTSTRAP_NOT_ALLOWED",
    "message": "Bootstrap is not allowed. Users already exist in the system."
  }
}
```

#### Error Response (400 - Validation Error)

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "",
    "password": "",
    "name": ""
  }'
```

Response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

---

### POST /api/auth/register - Create New User Account

**Endpoint:** `POST /api/auth/register`
**Authentication:** Required (Bearer token)
**Status Code:** 201 Created on success

#### Request

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "staff@laundry.com",
    "password": "SecurePass123",
    "name": "John Doe",
    "role": "staff"
  }'
```

#### Variations

**Create admin user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "admin@laundry.com",
    "password": "AdminPass123",
    "name": "Admin User",
    "role": "admin"
  }'
```

**Duplicate email (should return 409):**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "staff@laundry.com",
    "password": "DifferentPass456",
    "name": "Jane Doe",
    "role": "admin"
  }'
```

**Without authentication (should return 401):**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unauthorized@laundry.com",
    "password": "password123",
    "name": "Unauthorized User",
    "role": "staff"
  }'
```

**Invalid input - empty fields (should return 400):**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "",
    "password": "",
    "name": "Test",
    "role": "invalid-role"
  }'
```

#### Success Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "staff@laundry.com",
  "name": "John Doe",
  "role": "staff",
  "created_at": "2026-02-12T08:30:00.000Z",
  "updated_at": "2026-02-12T08:30:00.000Z"
}
```

#### Error Response (409 - Duplicate Email)

```json
{
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "User already exists with email: staff@laundry.com"
  }
}
```

#### Error Response (401 - Unauthorized)

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

#### Error Response (400 - Validation Error)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

---

### POST /api/auth/login - Authenticate User

**Endpoint:** `POST /api/auth/login`
**Authentication:** Not required
**Status Code:** 200 OK on success

#### Request

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@laundry.com",
    "password": "SecurePass123"
  }'
```

#### Save tokens to environment variables

```bash
# After login, extract and save tokens
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@laundry.com",
    "password": "SecurePass123"
  }' > response.json

export AUTH_TOKEN=$(jq -r '.accessToken' response.json)
export REFRESH_TOKEN=$(jq -r '.refreshToken' response.json)
echo "Tokens saved to environment"
```

#### Success Response (200)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "staff@laundry.com",
    "name": "John Doe",
    "role": "staff"
  }
}
```

#### Error Response (401 - Invalid Email)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@laundry.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

#### Error Response (401 - Invalid Password)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@laundry.com",
    "password": "WrongPassword"
  }'
```

Response:
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

#### Error Response (400 - Validation Error)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "",
    "password": ""
  }'
```

Response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

---

### POST /api/auth/refresh - Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`
**Authentication:** Not required (public endpoint)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }'
```

#### Success Response (200)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "staff@laundry.com",
    "name": "John Doe",
    "role": "staff"
  }
}
```

---

### POST /api/auth/logout - Logout User

**Endpoint:** `POST /api/auth/logout`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
# Logout current session
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }'
```

#### Logout all sessions

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'",
    "logoutAll": true
  }'
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me - Get Current User

**Endpoint:** `GET /api/auth/me`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "staff@laundry.com",
  "name": "John Doe",
  "role": "staff"
}
```

#### Error Response (401 - No Token)

```bash
curl -X GET http://localhost:3000/api/auth/me
```

Response:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### Error Response (401 - Invalid/Expired Token)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid-token-here"
```

Response:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## Customer Management

### GET /api/customers - Search Customer by Phone

**Endpoint:** `GET /api/customers?phone={phoneNumber}`
**Authentication:** Not required
**Status Code:** 200 OK on success

#### Request

```bash
# Search for customer by phone number
curl -X GET "http://localhost:3000/api/customers?phone=081234567890"
```

#### Success Response (200)

```json
{
  "id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "phone": "081234567890",
  "address": "Jl. Merdeka No. 123, Jakarta Pusat",
  "created_at": "2026-02-20T08:30:00.000Z",
  "updated_at": "2026-02-20T08:30:00.000Z"
}
```

#### Save customer ID to environment

```bash
CUSTOMER_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/customers?phone=081234567890")
export CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.id')
echo "Customer ID: $CUSTOMER_ID"
```

---

### POST /api/customers - Create Customer

**Endpoint:** `POST /api/customers`
**Authentication:** Not required
**Status Code:** 201 Created on success

#### Request

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phone": "081234567890",
    "address": "Jl. Merdeka No. 123, Jakarta Pusat"
  }'
```

#### Request without address (optional field)

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phone": "081298765432"
  }'
```

#### Success Response (201)

```json
{
  "id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "phone": "081234567890",
  "address": "Jl. Merdeka No. 123, Jakarta Pusat",
  "created_at": "2026-02-22T10:30:00.000Z",
  "updated_at": "2026-02-22T10:30:00.000Z"
}
```

---

### GET /api/customers/:id - Get Customer Details

**Endpoint:** `GET /api/customers/:id`
**Authentication:** Not required
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/customers/$CUSTOMER_ID
```

#### Success Response (200)

```json
{
  "id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "phone": "081234567890",
  "address": "Jl. Merdeka No. 123, Jakarta Pusat",
  "created_at": "2026-02-20T08:30:00.000Z",
  "updated_at": "2026-02-20T08:30:00.000Z"
}
```

---

## Order Management

### POST /api/orders - Create Order

**Endpoint:** `POST /api/orders`
**Authentication:** Required (Bearer token)
**Status Code:** 201 Created on success

#### Request

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "customer_id": "'"$CUSTOMER_ID"'",
    "items": [
      {
        "service_id": "'"$SERVICE_ID"'",
        "quantity": 3
      }
    ],
    "created_by": "'"$USER_ID"'",
    "payment_status": "unpaid"
  }'
```

#### Request with multiple items

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "customer_id": "'"$CUSTOMER_ID"'",
    "items": [
      {
        "service_id": "service-uuid-1",
        "quantity": 5
      },
      {
        "service_id": "service-uuid-2",
        "quantity": 2
      }
    ],
    "created_by": "'"$USER_ID"'",
    "payment_status": "paid"
  }'
```

#### Success Response (201)

```json
{
  "id": "order-550e8400-e29b-41d4-a716-446655440000",
  "order_number": "ORD-20260222-0001",
  "customer_id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "status": "received",
  "payment_status": "unpaid",
  "total_price": 45000,
  "created_by": "user-550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-02-22T10:30:00.000Z",
  "updated_at": "2026-02-22T10:30:00.000Z"
}
```

#### Save order ID to environment

```bash
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "customer_id": "'"$CUSTOMER_ID"'",
    "items": [{"service_id": "'"$SERVICE_ID"'", "quantity": 3}],
    "created_by": "'"$USER_ID"'"
  }')
export ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
echo "Order ID: $ORDER_ID"
```

---

### GET /api/orders - List All Orders

**Endpoint:** `GET /api/orders`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
[
  {
    "id": "order-550e8400-e29b-41d4-a716-446655440000",
    "order_number": "ORD-20260222-0001",
    "customer_id": "cust-550e8400-e29b-41d4-a716-446655440000",
    "customer_name": "Jane Doe",
    "customer_phone": "081234567890",
    "status": "received",
    "payment_status": "unpaid",
    "total_price": 45000,
    "created_by": "user-550e8400-e29b-41d4-a716-446655440000",
    "created_by_name": "John Doe",
    "created_at": "2026-02-22T10:30:00.000Z",
    "updated_at": "2026-02-22T10:30:00.000Z"
  },
  {
    "id": "order-660e8400-e29b-41d4-a716-446655440000",
    "order_number": "ORD-20260222-0002",
    "customer_id": "cust-770e8400-e29b-41d4-a716-446655440000",
    "customer_name": "Ahmad Pratama",
    "customer_phone": "081298765432",
    "status": "in_progress",
    "payment_status": "paid",
    "total_price": 75000,
    "created_by": "user-550e8400-e29b-41d4-a716-446655440000",
    "created_by_name": "John Doe",
    "created_at": "2026-02-22T11:15:00.000Z",
    "updated_at": "2026-02-22T11:30:00.000Z"
  }
]
```

---

### GET /api/orders/:id - Get Order with Items

**Endpoint:** `GET /api/orders/:id`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
{
  "id": "order-550e8400-e29b-41d4-a716-446655440000",
  "order_number": "ORD-20260222-0001",
  "customer_id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "status": "received",
  "payment_status": "unpaid",
  "total_price": 45000,
  "created_by": "user-550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-02-22T10:30:00.000Z",
  "updated_at": "2026-02-22T10:30:00.000Z",
  "items": [
    {
      "id": "item-550e8400-e29b-41d4-a716-446655440000",
      "service_id": "service-660e8400-e29b-41d4-a716-446655440000",
      "quantity": 3,
      "price_at_order": 15000,
      "subtotal": 45000
    }
  ]
}
```

---

### PUT /api/orders/:id/status - Update Order Status

**Endpoint:** `PUT /api/orders/:id/status`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
# Update to in_progress
curl -X PUT http://localhost:3000/api/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "status": "in_progress"
  }'
```

#### Valid status values

```bash
# Status progression: received → in_progress → ready → delivered

# Mark as ready
curl -X PUT http://localhost:3000/api/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"status": "ready"}'

# Mark as delivered
curl -X PUT http://localhost:3000/api/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"status": "delivered"}'
```

#### Success Response (200)

```json
{
  "id": "order-550e8400-e29b-41d4-a716-446655440000",
  "order_number": "ORD-20260222-0001",
  "customer_id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "payment_status": "unpaid",
  "total_price": 45000,
  "created_by": "user-550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-02-22T10:30:00.000Z",
  "updated_at": "2026-02-22T11:45:00.000Z"
}
```

---

### PUT /api/orders/:id/payment - Update Payment Status

**Endpoint:** `PUT /api/orders/:id/payment`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
# Mark as paid
curl -X PUT http://localhost:3000/api/orders/$ORDER_ID/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "payment_status": "paid"
  }'
```

#### Mark as unpaid

```bash
curl -X PUT http://localhost:3000/api/orders/$ORDER_ID/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "payment_status": "unpaid"
  }'
```

#### Success Response (200)

```json
{
  "id": "order-550e8400-e29b-41d4-a716-446655440000",
  "order_number": "ORD-20260222-0001",
  "customer_id": "cust-550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "payment_status": "paid",
  "total_price": 45000,
  "created_by": "user-550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-02-22T10:30:00.000Z",
  "updated_at": "2026-02-22T12:00:00.000Z"
}
```

---

## Service Management

### GET /api/services - List All Services

**Endpoint:** `GET /api/services`
**Authentication:** Not required
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/services
```

#### Success Response (200)

```json
[
  {
    "id": "service-550e8400-e29b-41d4-a716-446655440000",
    "name": "Cuci Kering",
    "price": 15000,
    "unit_type": "kg",
    "is_active": true,
    "created_at": "2026-02-20T08:00:00.000Z",
    "updated_at": "2026-02-20T08:00:00.000Z"
  },
  {
    "id": "service-660e8400-e29b-41d4-a716-446655440000",
    "name": "Cuci Setrika",
    "price": 20000,
    "unit_type": "kg",
    "is_active": true,
    "created_at": "2026-02-20T08:00:00.000Z",
    "updated_at": "2026-02-20T08:00:00.000Z"
  },
  {
    "id": "service-770e8400-e29b-41d4-a716-446655440000",
    "name": "Cuci Karpet",
    "price": 50000,
    "unit_type": "set",
    "is_active": true,
    "created_at": "2026-02-20T08:00:00.000Z",
    "updated_at": "2026-02-20T08:00:00.000Z"
  }
]
```

#### Save service ID to environment

```bash
SERVICES_RESPONSE=$(curl -s -X GET http://localhost:3000/api/services)
export SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.[0].id')
echo "Service ID: $SERVICE_ID"
```

---

### POST /api/services - Create Service

**Endpoint:** `POST /api/services`
**Authentication:** Required (Admin role only)
**Status Code:** 201 Created on success

#### Request

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "name": "Cuci Kering",
    "price": 15000,
    "unit_type": "kg"
  }'
```

#### Create service with "set" unit type

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "name": "Cuci Karpet",
    "price": 50000,
    "unit_type": "set"
  }'
```

#### Success Response (201)

```json
{
  "id": "service-550e8400-e29b-41d4-a716-446655440000",
  "name": "Cuci Kering",
  "price": 15000,
  "unit_type": "kg",
  "is_active": true,
  "created_at": "2026-02-22T10:30:00.000Z",
  "updated_at": "2026-02-22T10:30:00.000Z"
}
```

---

### PUT /api/services/:id - Update Service

**Endpoint:** `PUT /api/services/:id`
**Authentication:** Required (Admin role only)
**Status Code:** 200 OK on success

#### Request

```bash
# Update service price
curl -X PUT http://localhost:3000/api/services/$SERVICE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "price": 18000
  }'
```

#### Update multiple fields

```bash
curl -X PUT http://localhost:3000/api/services/$SERVICE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "name": "Cuci Kering Express",
    "price": 20000,
    "is_active": true
  }'
```

#### Deactivate service

```bash
curl -X PUT http://localhost:3000/api/services/$SERVICE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "is_active": false
  }'
```

#### Success Response (200)

```json
{
  "id": "service-550e8400-e29b-41d4-a716-446655440000",
  "name": "Cuci Kering",
  "price": 18000,
  "unit_type": "kg",
  "is_active": true,
  "created_at": "2026-02-20T08:00:00.000Z",
  "updated_at": "2026-02-22T11:00:00.000Z"
}
```

---

### DELETE /api/services/:id - Delete Service

**Endpoint:** `DELETE /api/services/:id`
**Authentication:** Required (Admin role only)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X DELETE http://localhost:3000/api/services/$SERVICE_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
{
  "message": "Service deleted successfully"
}
```

---

## Analytics Endpoints

### GET /api/analytics/weekly - Weekly Analytics

**Endpoint:** `GET /api/analytics/weekly`
**Authentication:** Required (Admin role only)
**Status Code:** 200 OK on success

**Query Parameters:**
- `payment_status` (optional): Filter by payment status ("paid", "unpaid", "all")
- `range` (optional): Predefined range ("last_4_weeks", "last_8_weeks", "last_12_weeks")
- `start_date` (optional): Custom start date (YYYY-MM-DD)
- `end_date` (optional): Custom end date (YYYY-MM-DD)

#### Request - Default (last 4 weeks)

```bash
curl -X GET http://localhost:3000/api/analytics/weekly \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Request - Filter by payment status

```bash
# Only paid orders
curl -X GET "http://localhost:3000/api/analytics/weekly?payment_status=paid" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Only unpaid orders
curl -X GET "http://localhost:3000/api/analytics/weekly?payment_status=unpaid" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Request - Custom date range

```bash
curl -X GET "http://localhost:3000/api/analytics/weekly?start_date=2026-01-01&end_date=2026-02-22" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Request - Predefined range

```bash
curl -X GET "http://localhost:3000/api/analytics/weekly?range=last_8_weeks" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
{
  "weeks": [
    {
      "week_start": "2026-01-27",
      "total_revenue": 1250000,
      "order_count": 45
    },
    {
      "week_start": "2026-02-03",
      "total_revenue": 1450000,
      "order_count": 52
    },
    {
      "week_start": "2026-02-10",
      "total_revenue": 1350000,
      "order_count": 48
    },
    {
      "week_start": "2026-02-17",
      "total_revenue": 950000,
      "order_count": 35
    }
  ],
  "start_date": "2026-01-27",
  "end_date": "2026-02-22",
  "payment_filter": "all"
}
```

---

### GET /api/analytics/dashboard - Dashboard Statistics

**Endpoint:** `GET /api/analytics/dashboard`
**Authentication:** Required (Admin role only)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
{
  "todays_orders": 12,
  "pending_payments": 8,
  "weekly_revenue": 950000,
  "total_customers": 156
}
```

---

## Receipt Generation

### GET /api/receipts/:orderId - Generate Receipt

**Endpoint:** `GET /api/receipts/:orderId`
**Authentication:** Required (Bearer token)
**Status Code:** 200 OK on success

#### Request

```bash
curl -X GET http://localhost:3000/api/receipts/$ORDER_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

#### Success Response (200)

```json
{
  "business_name": "Laundry Express",
  "business_address": "Jl. Sudirman No. 45, Jakarta Selatan",
  "business_phone": "021-12345678",
  "order_number": "ORD-20260222-0001",
  "order_date": "2026-02-22T10:30:00.000Z",
  "order_status": "delivered",
  "customer_name": "Jane Doe",
  "customer_phone": "081234567890",
  "items": [
    {
      "service_name": "Cuci Kering",
      "unit_type": "kg",
      "quantity": 3,
      "price_at_order": 15000,
      "subtotal": 45000
    },
    {
      "service_name": "Cuci Setrika",
      "unit_type": "kg",
      "quantity": 2,
      "price_at_order": 20000,
      "subtotal": 40000
    }
  ],
  "total_price": 85000,
  "payment_status": "paid",
  "staff_name": "John Doe"
}
```

---

## Testing Workflow

### Complete End-to-End Workflow

This workflow demonstrates testing all major endpoints in a realistic sequence.

```bash
#!/bin/bash

# ============================================
# 1. Health Checks
# ============================================
echo "=== Health Checks ==="
echo "Server health:"
curl -s http://localhost:3000/health | jq .

echo -e "\nDatabase health:"
curl -s http://localhost:3000/health/db | jq .

# ============================================
# 2. Bootstrap & Authentication
# ============================================
echo -e "\n=== Bootstrap First Admin ==="
BOOTSTRAP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "AdminPass123",
    "name": "Initial Administrator"
  }')
echo "$BOOTSTRAP_RESPONSE" | jq .

echo -e "\n=== Admin Login ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "AdminPass123"
  }')

export AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
export REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')
export USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
echo "Admin logged in. User ID: $USER_ID"

# ============================================
# 3. Create Services (Admin only)
# ============================================
echo -e "\n=== Create Services ==="
SERVICE1=$(curl -s -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "name": "Cuci Kering",
    "price": 15000,
    "unit_type": "kg"
  }')
export SERVICE_ID=$(echo "$SERVICE1" | jq -r '.id')
echo "Created service: Cuci Kering (ID: $SERVICE_ID)"

SERVICE2=$(curl -s -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "name": "Cuci Setrika",
    "price": 20000,
    "unit_type": "kg"
  }')
echo "Created service: Cuci Setrika"

echo -e "\n=== List All Services ==="
curl -s http://localhost:3000/api/services | jq .

# ============================================
# 4. Create Customer
# ============================================
echo -e "\n=== Create Customer ==="
CUSTOMER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "phone": "081234567890",
    "address": "Jl. Merdeka No. 123, Jakarta Pusat"
  }')
export CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.id')
echo "Created customer: Jane Doe (ID: $CUSTOMER_ID)"

echo -e "\n=== Search Customer by Phone ==="
curl -s "http://localhost:3000/api/customers?phone=081234567890" | jq .

# ============================================
# 5. Create Order
# ============================================
echo -e "\n=== Create Order ==="
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "customer_id": "'"$CUSTOMER_ID"'",
    "items": [
      {
        "service_id": "'"$SERVICE_ID"'",
        "quantity": 3
      }
    ],
    "created_by": "'"$USER_ID"'",
    "payment_status": "unpaid"
  }')
export ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
echo "Created order (ID: $ORDER_ID)"
echo "$ORDER_RESPONSE" | jq .

# ============================================
# 6. Update Order Status & Payment
# ============================================
echo -e "\n=== Update Order Status to in_progress ==="
curl -s -X PUT http://localhost:3000/api/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"status": "in_progress"}' | jq .

echo -e "\n=== Update Payment Status to paid ==="
curl -s -X PUT http://localhost:3000/api/orders/$ORDER_ID/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"payment_status": "paid"}' | jq .

echo -e "\n=== Update Order Status to ready ==="
curl -s -X PUT http://localhost:3000/api/orders/$ORDER_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"status": "ready"}' | jq .

# ============================================
# 7. Generate Receipt
# ============================================
echo -e "\n=== Generate Receipt ==="
curl -s http://localhost:3000/api/receipts/$ORDER_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

# ============================================
# 8. Analytics (Admin only)
# ============================================
echo -e "\n=== Dashboard Statistics ==="
curl -s http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

echo -e "\n=== Weekly Analytics ==="
curl -s http://localhost:3000/api/analytics/weekly \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

# ============================================
# 9. List All Orders
# ============================================
echo -e "\n=== List All Orders ==="
curl -s http://localhost:3000/api/orders \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

# ============================================
# 10. Token Refresh & Logout
# ============================================
echo -e "\n=== Refresh Token ==="
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }')
echo "$REFRESH_RESPONSE" | jq .

echo -e "\n=== Logout ==="
curl -s -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }' | jq .

echo -e "\n=== Workflow Complete ==="
```

### Quick Testing Scripts

#### Test Health Endpoints

```bash
#!/bin/bash
echo "Server Health:"
curl -s http://localhost:3000/health | jq .
echo -e "\nDatabase Health:"
curl -s http://localhost:3000/health/db | jq .
```

#### Test Authentication Flow

```bash
#!/bin/bash

# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "AdminPass123"
  }')

export AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
export REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')

echo "Logged in successfully"
echo "Access Token: $AUTH_TOKEN"
```

#### Test Service Management (Admin)

```bash
#!/bin/bash

# Assumes AUTH_TOKEN is set
echo "Creating service..."
SERVICE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "name": "Express Wash",
    "price": 25000,
    "unit_type": "kg"
  }')

SERVICE_ID=$(echo "$SERVICE_RESPONSE" | jq -r '.id')
echo "Service created: $SERVICE_ID"

echo -e "\nUpdating service price..."
curl -s -X PUT http://localhost:3000/api/services/$SERVICE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"price": 30000}' | jq .

echo -e "\nListing all services..."
curl -s http://localhost:3000/api/services | jq .
```

---

## Pretty Output with jq

All curl requests can be piped through `jq` for readable JSON output:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@laundry.com",
    "password": "SecurePass123"
  }' | jq .
```

## Verbose Mode for Debugging

Add `-v` flag to see request/response headers:

```bash
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@laundry.com",
    "password": "SecurePass123"
  }'
```

## Response Headers

View only response headers:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@laundry.com",
    "password": "SecurePass123"
  }'
```

## Notes

### Authentication

- **Auth Token Format:** JWT tokens are included in the `Authorization: Bearer <token>` header
- **Admin Endpoints:** Services (POST/PUT/DELETE) and Analytics endpoints require admin role
- **Protected Endpoints:** Order management and receipts require authentication
- **Public Endpoints:** Health checks, customer management, and service listing are public

### Data Formats

- **Timestamps:** API returns ISO 8601 format UTC timestamps (e.g., "2026-02-22T10:30:00.000Z")
- **Phone Numbers:** Indonesian format (e.g., "081234567890")
- **Prices:** Numbers in Rupiah (e.g., 15000 = Rp 15,000)
- **UUIDs:** All IDs are UUID v4 strings with type prefixes (e.g., "cust-", "order-", "service-")

### Enumerations

- **Order Status:** `received` → `in_progress` → `ready` → `delivered`
- **Payment Status:** `paid` | `unpaid`
- **Unit Type:** `kg` | `set`
- **User Role:** `admin` | `staff`
- **Analytics Payment Filter:** `paid` | `unpaid` | `all`

### Status Codes

- `200 OK`: Successful request (GET, PUT, DELETE)
- `201 Created`: Successful creation (POST)
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing/invalid auth or invalid credentials
- `403 Forbidden`: Bootstrap already done or insufficient permissions
- `404 Not Found`: Resource not found (customer, order, service)
- `409 Conflict`: Duplicate resource (customer phone, user email)
- `500 Internal Server Error`: Database or server error

### Endpoint Summary

**Total: 21 endpoints**

- **Health (2):** GET /health, GET /health/db
- **Auth (6):** bootstrap, register, login, refresh, logout, me
- **Customers (3):** search by phone, create, get by ID
- **Orders (5):** create, list, get by ID, update status, update payment
- **Services (4):** list, create, update, delete
- **Analytics (2):** weekly, dashboard
- **Receipts (1):** generate receipt
