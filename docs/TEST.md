# API Testing with curl

This document provides curl request examples for testing the authentication API endpoints.

## Prerequisites

- Backend server running on `http://localhost:3000`
- Set environment variables for tokens:
  ```bash
  export AUTH_TOKEN=""
  export REFRESH_TOKEN=""
  ```

## Authentication Endpoints

### 0. Bootstrap - Create First Admin User

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

### 1. Register - Create New User Account

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

### 2. Login - Authenticate User

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

## Testing Workflow

### First-Time Setup (Bootstrap)

For a fresh database installation, bootstrap the first admin user:

```bash
#!/bin/bash

echo "Step 1: Bootstrap first admin user..."
BOOTSTRAP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "AdminPass123",
    "name": "Initial Administrator"
  }')

echo "Bootstrap Response:"
echo "$BOOTSTRAP_RESPONSE" | jq .
```

### Complete Registration and Login Flow

After bootstrapping, create and authenticate other users:

```bash
#!/bin/bash

# 1. Get an existing auth token first (or bootstrap admin)
echo "Step 1: Logging in with admin account..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "AdminPass123"
  }')

AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
echo "Auth Token: $AUTH_TOKEN"

# 2. Register new staff user
echo "Step 2: Registering new staff user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "email": "newstaff@laundry.com",
    "password": "NewStaffPass456",
    "name": "New Staff Member",
    "role": "staff"
  }')

echo "Registered User:"
echo "$REGISTER_RESPONSE" | jq .

# 3. Login with new user
echo "Step 3: Logging in with new user..."
NEW_USER_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newstaff@laundry.com",
    "password": "NewStaffPass456"
  }')

NEW_USER_TOKEN=$(echo "$NEW_USER_LOGIN" | jq -r '.accessToken')
echo "New User Auth Token: $NEW_USER_TOKEN"
echo "Login successful!"
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

- **Auth Token Format:** JWT tokens are included in the `Authorization: Bearer <token>` header
- **Password Requirements:** Minimum 1 character (enforced by schema), consider adding validation for stronger passwords
- **Email Format:** Non-empty string (consider adding email format validation)
- **Timestamps:** API returns ISO 8601 format UTC timestamps
- **Status Codes:**
  - `200 OK`: Successful login
  - `201 Created`: Successful registration
  - `400 Bad Request`: Validation error
  - `401 Unauthorized`: Missing/invalid auth or invalid credentials
  - `409 Conflict`: Duplicate email on registration
  - `500 Internal Server Error`: Database or server error
