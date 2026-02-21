# Security Testing Guide

This guide covers security testing procedures for the laundry management backend, including automated tests, manual verification, and penetration testing checklist.

## Automated Tests

### Running Security Tests

```bash
# Run all security tests
cd backend
bun run test test/security/

# Run specific test suite
bun test test/security/security-verification.test.ts

# Run with coverage
bun test --coverage test/security/
```

### Test Suites

The automated security tests cover:

1. **Rate Limiting** (8 tests)
   - Login endpoint rate limiting
   - API endpoint rate limiting
   - Rate limit headers
   - Rate limit reset

2. **Security Headers** (7 tests)
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - X-XSS-Protection
   - Referrer-Policy
   - Permissions-Policy
   - Strict-Transport-Security (production only)

3. **Authentication** (6 tests)
   - Invalid credentials handling
   - Expired token handling
   - Missing token handling
   - Token tampering detection
   - Refresh token validation
   - Admin role enforcement

4. **SQL Injection Prevention** (4 tests)
   - Customer search endpoint
   - Order filtering
   - User lookup
   - Parameterized queries

5. **XSS Prevention** (3 tests)
   - Customer name sanitization
   - Order notes sanitization
   - Response encoding

6. **Request Security** (4 tests)
   - Body size limits
   - Content-Type validation
   - Header injection prevention
   - JSON depth limits

7. **Infrastructure Security** (5 tests)
   - Non-root user in Docker
   - Read-only filesystem
   - Resource limits
   - Network isolation
   - Secrets management

## Manual Testing Procedures

### 1. Rate Limiting Test

Test that rate limiting works correctly for login endpoint:

```bash
# Send 15 login requests in quick succession
for i in {1..15}; do
  echo "Request $i:"
  curl -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 0.5
done

# Expected results:
# - First 10 requests: 401 Unauthorized (invalid credentials)
# - Requests 11-15: 429 Too Many Requests
# - Response includes Retry-After header
```

**Verification:**
- Rate limit headers present in responses
- 429 status after exceeding limit
- Limit resets after window expires

### 2. Security Headers Test

Verify all security headers are present:

```bash
# Check security headers
curl -I http://localhost/health

# Expected headers:
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), ...
# Strict-Transport-Security: max-age=31536000; ... (HTTPS only)
```

**Verification:**
```bash
# Extract and verify each header
curl -I http://localhost/health | grep -i "content-security-policy"
curl -I http://localhost/health | grep -i "x-frame-options"
curl -I http://localhost/health | grep -i "x-content-type-options"
curl -I http://localhost/health | grep -i "x-xss-protection"
curl -I http://localhost/health | grep -i "referrer-policy"
curl -I http://localhost/health | grep -i "permissions-policy"
```

### 3. SQL Injection Test

Test that SQL injection attempts are blocked:

```bash
# Attempt SQL injection in customer search
curl -X GET "http://localhost/api/customers/search?query='; DROP TABLE users; --" \
  -H "Authorization: Bearer <access-token>"

# Expected: Either no results or validation error, never executes SQL
```

**Test cases:**
- `' OR '1'='1`
- `'; DROP TABLE users; --`
- `1' UNION SELECT * FROM users --`
- `admin'--`

**Verification:**
- Query returns safely (no SQL execution)
- No database errors in logs
- Parameterized queries used

### 4. TLS Version Test

Verify TLS 1.2+ only:

```bash
# Test TLS 1.0 (should fail)
openssl s_client -connect localhost:443 -tls1 < /dev/null

# Test TLS 1.1 (should fail)
openssl s_client -connect localhost:443 -tls1_1 < /dev/null

# Test TLS 1.2 (should succeed)
openssl s_client -connect localhost:443 -tls1_2 < /dev/null

# Test TLS 1.3 (should succeed)
openssl s_client -connect localhost:443 -tls1_3 < /dev/null
```

**Verification:**
- TLS 1.0 and 1.1 connections rejected
- TLS 1.2 and 1.3 connections accepted
- Strong cipher suites negotiated

### 5. Request Body Size Limit Test

Test that large payloads are rejected:

```bash
# Create 5MB payload (limit is 4MB)
dd if=/dev/zero bs=5M count=1 | base64 > large_payload.txt

# Send large payload
curl -X POST http://localhost/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  --data-binary "@large_payload.txt" \
  -w "\nStatus: %{http_code}\n"

# Expected: 413 Payload Too Large
```

**Verification:**
- 413 status code returned
- Request rejected before processing
- Error message indicates size limit

### 6. Content-Type Validation Test

Test that invalid Content-Type is rejected:

```bash
# Send JSON data with wrong Content-Type
curl -X POST http://localhost/api/orders \
  -H "Content-Type: text/plain" \
  -H "Authorization: Bearer <access-token>" \
  -d '{"customerId":"123","items":[]}' \
  -w "\nStatus: %{http_code}\n"

# Expected: 415 Unsupported Media Type
```

**Verification:**
- 415 status code returned
- Only `application/json` accepted for POST/PUT/PATCH

### 7. Header Injection Test

Test that CRLF injection in headers is blocked:

```bash
# Attempt header injection
curl -X GET http://localhost/health \
  -H "X-Custom-Header: value\r\nX-Injected: malicious" \
  -w "\nStatus: %{http_code}\n"

# Expected: 400 Bad Request or connection refused
```

**Verification:**
- Request rejected
- No injected headers in response
- Validation error logged

### 8. Authentication Bypass Test

Test that protected endpoints require authentication:

```bash
# Attempt to access protected endpoint without token
curl -X GET http://localhost/api/orders \
  -w "\nStatus: %{http_code}\n"

# Expected: 401 Unauthorized
```

**Verification:**
- 401 status code returned
- Error message indicates missing or invalid token

### 9. CORS Test

Test CORS headers and restrictions:

```bash
# Preflight request
curl -X OPTIONS http://localhost/api/customers \
  -H "Origin: https://malicious.com" \
  -H "Access-Control-Request-Method: GET" \
  -w "\nStatus: %{http_code}\n"

# Check CORS headers
curl -I http://localhost/api/customers \
  -H "Origin: https://allowed-origin.com"
```

**Verification:**
- CORS headers present
- Only allowed origins accepted
- Credentials allowed for trusted origins

### 10. Cookie Security Test

Test that cookies have secure flags:

```bash
# Login and capture cookies
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' \
  -c cookies.txt \
  -v

# Verify cookie flags
cat cookies.txt
```

**Verification:**
- `HttpOnly` flag present
- `Secure` flag present (HTTPS only)
- `SameSite=Strict` flag present
- Appropriate expiration time

## Penetration Testing Checklist

### Pre-Test Preparation

- [ ] Deploy application to test environment
- [ ] Obtain authorization for testing
- [ ] Define scope and exclusions
- [ ] Set up monitoring and logging
- [ ] Create test accounts

### Authentication & Authorization

- [ ] **Brute Force Protection**
  - Attempt 20+ login attempts with wrong password
  - Verify rate limiting triggers (429 after 10 attempts)
  - Verify account is not locked permanently

- [ ] **JWT Token Tampering**
  - Modify token payload (change role from user to admin)
  - Modify token signature
  - Use expired token
  - Use token from different application
  - Verify all attempts are rejected with 401

- [ ] **Refresh Token Theft**
  - Capture refresh token
  - Attempt to use on different device/IP
  - Verify token rotation on refresh
  - Verify old tokens are invalidated

- [ ] **Cookie Theft**
  - Attempt XSS to steal cookies (should fail - HttpOnly)
  - Attempt CSRF attacks (should fail - SameSite strict)
  - Verify cookies only sent over HTTPS in production

- [ ] **Admin Access Control**
  - Attempt admin endpoints as regular user
  - Verify 403 Forbidden response
  - Attempt role elevation via API

### Input Validation & Injection

- [ ] **SQL Injection**
  - Test all search fields (`' OR '1'='1`)
  - Test ORDER BY injection
  - Test UNION-based injection
  - Test time-based blind injection
  - Verify all inputs use parameterized queries

- [ ] **XSS (Cross-Site Scripting)**
  - Test reflected XSS in search results
  - Test stored XSS in customer names, order notes
  - Test DOM-based XSS
  - Verify CSP headers block inline scripts

- [ ] **Command Injection**
  - Test shell command injection in file uploads (if any)
  - Test path traversal (`../../etc/passwd`)
  - Verify no system command execution

- [ ] **LDAP/NoSQL Injection**
  - Not applicable (PostgreSQL only)

### API Security

- [ ] **Rate Limiting**
  - Test all endpoints for rate limits
  - Verify 429 responses with Retry-After header
  - Test rate limit bypass attempts (multiple IPs)
  - Verify authenticated users have higher limits

- [ ] **Mass Assignment**
  - Attempt to set unauthorized fields (role, created_at)
  - Verify schema validation blocks extra fields

- [ ] **API Versioning**
  - Test deprecated endpoints (if any)
  - Verify breaking changes are handled

- [ ] **Error Handling**
  - Trigger various errors
  - Verify no sensitive information in error messages
  - Verify no stack traces in production

### Infrastructure Security

- [ ] **TLS/SSL Configuration**
  - Verify TLS 1.2+ only
  - Verify strong cipher suites
  - Test certificate validity
  - Test OCSP stapling
  - Verify HSTS header present

- [ ] **Docker Security**
  - Verify non-root user
  - Verify read-only filesystem
  - Verify resource limits
  - Verify no privileged containers
  - Verify secrets not in environment variables

- [ ] **Network Security**
  - Verify database not exposed externally
  - Verify only ports 80, 443 open
  - Test internal network isolation
  - Verify firewall rules

- [ ] **Secrets Management**
  - Verify no secrets in source code
  - Verify no secrets in logs
  - Verify environment variables secured
  - Verify Docker secrets used

### Data Security

- [ ] **Sensitive Data Exposure**
  - Verify passwords are hashed (bcrypt)
  - Verify no passwords in logs
  - Verify JWT tokens not logged
  - Verify refresh tokens stored securely

- [ ] **Data Validation**
  - Test phone number validation
  - Test email validation
  - Test numeric field validation
  - Test date field validation

- [ ] **Data Leakage**
  - Verify error messages don't leak data
  - Verify 404 vs 403 responses don't leak existence
  - Verify no sensitive data in URLs

### Business Logic

- [ ] **Order Processing**
  - Attempt negative quantities
  - Attempt zero prices
  - Attempt invalid status transitions
  - Verify total calculation is server-side

- [ ] **Payment Processing**
  - Attempt to mark unpaid order as paid (as non-admin)
  - Attempt price manipulation
  - Verify payment status validation

- [ ] **User Management**
  - Attempt to delete own admin account (as last admin)
  - Attempt to access other users' data
  - Verify email uniqueness

## Vulnerability Scanning

### Automated Scanning Tools

```bash
# OWASP ZAP (GUI or CLI)
zap-cli quick-scan http://localhost

# Nikto web scanner
nikto -h http://localhost

# SQLMap for SQL injection
sqlmap -u "http://localhost/api/customers/search?query=test" \
  --cookie="session=<token>" \
  --batch

# npm audit (dependency vulnerabilities)
cd backend
npm audit
```

### Docker Security Scanning

```bash
# Trivy vulnerability scanner
trivy image laundry-app_backend

# Docker bench security
docker run -it --net host --pid host --userns host --cap-add audit_control \
  -v /var/lib:/var/lib \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker/docker-bench-security
```

## Security Test Report Template

```markdown
# Security Test Report

**Date:** YYYY-MM-DD
**Tester:** Name
**Application Version:** vX.X.X
**Environment:** Production/Staging/Testing

## Summary
- Total tests: X
- Passed: X
- Failed: X
- Critical issues: X

## Critical Findings

### 1. [Vulnerability Name]
- **Severity:** Critical/High/Medium/Low
- **Location:** Endpoint/Component
- **Description:** What was found
- **Impact:** Potential damage
- **Recommendation:** How to fix
- **Status:** Open/Fixed/Won't Fix

## Test Results

### Authentication & Authorization
- [ ] Brute force protection: Pass/Fail
- [ ] JWT tampering: Pass/Fail
- [ ] Cookie security: Pass/Fail
...

### Recommendations
1. ...
2. ...

### Next Steps
1. Fix critical issues immediately
2. Schedule fixes for high-severity issues
3. Re-test after fixes
```

## Continuous Security Testing

### CI/CD Integration

Add security tests to CI/CD pipeline:

```yaml
# .github/workflows/security.yml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run security tests
        run: |
          cd backend
          bun install
          bun test test/security/
      - name: npm audit
        run: |
          cd backend
          npm audit --audit-level=moderate
      - name: Docker scan
        run: |
          docker build -t test-image ./backend
          trivy image test-image
```

### Regular Security Audits

Schedule regular security reviews:

- **Weekly:** Automated vulnerability scans
- **Monthly:** Manual penetration testing
- **Quarterly:** Full security audit
- **Annually:** Third-party security assessment

## Incident Response

If a vulnerability is discovered:

1. **Assess severity** - Critical/High/Medium/Low
2. **Create ticket** - Document the finding
3. **Notify team** - Alert relevant stakeholders
4. **Develop fix** - Implement and test fix
5. **Deploy patch** - Deploy to production ASAP
6. **Verify fix** - Re-test to confirm resolution
7. **Post-mortem** - Document lessons learned

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
