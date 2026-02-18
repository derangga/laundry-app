## Phase 13: Production Readiness

**Goal**: Prepare for production deployment

**Prerequisites**: All phases 0-12 complete

**Complexity**: Medium

**Estimated Time**: 4-8 hours

### Tasks

#### Task 13.1: Implement Rate Limiting

Create `RateLimitService` using Effect.Service pattern with in-memory storage and automatic cleanup.

- [ ] **13.1.1** Create `RateLimitService` in `src/usecase/security/RateLimitService.ts`
  - In-memory store using `Map<string, RateLimitEntry>`
  - Cleanup mechanism for expired entries using `Effect.schedule`
  - Methods: `checkLimit(key, maxRequests, windowMs)`, `increment(key)`, `reset(key)`
  - Error type: `RateLimitExceeded` with retry-after info

- [ ] **13.1.2** Login endpoint protection (10 attempts per 5 minutes per IP)
  - Apply to `POST /api/auth/login`
  - Key format: `login:{ip}`
  - Return 429 with `Retry-After` header when exceeded

- [ ] **13.1.3** Token refresh protection (20 attempts per 10 minutes per IP)
  - Apply to `POST /api/auth/refresh`
  - Key format: `refresh:{ip}`
  - Separate limit from login to prevent total lockout

- [ ] **13.1.4** Authenticated API rate limiting (100 requests per minute per user)
  - Apply to all authenticated endpoints
  - Key format: `api:{userId}`
  - Skip for admin users (configurable)

- [ ] **13.1.5** Public API rate limiting (60 requests per minute per IP)
  - Apply to public endpoints (`/api/services` list, health checks)
  - Key format: `public:{ip}`

- [ ] **13.1.6** Order creation throttling (30 orders per minute per user)
  - Apply to `POST /api/orders`
  - Key format: `create-order:{userId}`
  - Prevent abuse/spam orders

- [ ] **13.1.7** Customer search throttling (50 searches per minute)
  - Apply to `GET /api/customers/search`
  - Key format: `search:{userId}`
  - Prevent phone number enumeration attacks

- [ ] **13.1.8** Add rate limit response headers
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `X-RateLimit-Reset`: Unix timestamp when window resets
  - `Retry-After`: Seconds until retry (on 429 responses)

#### Task 13.2: Add Security Headers

Implement via middleware in `src/middleware/SecurityHeadersMiddleware.ts` using Effect patterns.

- [ ] **13.2.1** Content-Security-Policy (CSP)
  - Default: `default-src 'self'`
  - Scripts: `script-src 'self'`
  - Styles: `style-src 'self' 'unsafe-inline'` (for Tailwind)
  - Images: `img-src 'self' data:`
  - Connect: `connect-src 'self'`
  - Frame: `frame-ancestors 'none'`

- [ ] **13.2.2** X-Frame-Options: `DENY`
  - Prevent clickjacking attacks
  - Already covered by CSP frame-ancestors but good for legacy

- [ ] **13.2.3** X-Content-Type-Options: `nosniff`
  - Prevent MIME type sniffing

- [ ] **13.2.4** Strict-Transport-Security (HSTS)
  - `max-age=31536000; includeSubDomains; preload`
  - Force HTTPS for 1 year

- [ ] **13.2.5** X-XSS-Protection: `1; mode=block`
  - Legacy browser XSS protection

- [ ] **13.2.6** Referrer-Policy: `strict-origin-when-cross-origin`
  - Send full URL to same origin, origin only to cross-origin

- [ ] **13.2.7** Permissions-Policy
  - Disable unused features: `camera=(), microphone=(), geolocation=(), payment=()`

#### Task 13.3: Performance Optimization

- [ ] Add database indices for common queries
- [ ] Optimize N+1 queries
- [ ] Add connection pooling configuration
- [ ] Profile and optimize slow queries

#### Task 13.4: Add Health Check Endpoint

- [ ] GET `/health` - Check server health
- [ ] GET `/health/db` - Check database connection
- [ ] Return status and latency

#### Task 13.5: Production Environment Configuration

- [ ] Create `.env.production` template
- [ ] Document production environment variables
- [ ] Configure SSL/TLS for database
- [ ] Configure HTTPS-only cookies

#### Task 13.6: Deployment Documentation

- [ ] Document deployment process
- [ ] Document database migration strategy
- [ ] Document rollback procedures
- [ ] Document monitoring setup

#### Task 13.7: Request Security Hardening

Implement additional request-level protections via middleware.

- [ ] **13.7.1** Request body size limit (10MB)
  - Reject requests larger than 10MB with 413 Payload Too Large
  - Prevents memory exhaustion attacks

- [ ] **13.7.2** JSON parsing depth limit
  - Maximum nesting depth: 10 levels
  - Prevents stack overflow attacks via deeply nested JSON

- [ ] **13.7.3** Input sanitization middleware
  - Trim whitespace from string inputs
  - Remove null bytes and control characters
  - Validate content-type matches payload

- [ ] **13.7.4** Header injection prevention
  - Validate header names (no newline characters)
  - Prevent response splitting attacks
  - Sanitize error messages in headers

#### Task 13.8: Infrastructure Security (Docker/Nginx)

Configure security at infrastructure level for defense in depth.

- [ ] **13.8.1** Nginx rate limiting for DDoS protection
  - Connection limit: 10 connections per IP
  - Request limit: 50 req/sec burst to 100
  - Zone: `limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s`

- [ ] **13.8.2** Nginx security headers (fallback)
  - Duplicate security headers as fallback
  - Add in case app headers fail

- [ ] **13.8.3** Docker security hardening
  - Run container as non-root user
  - Read-only root filesystem (`read_only: true`)
  - Remove unnecessary capabilities
  - Limit resources (CPU: 1.0, Memory: 512MB)

- [ ] **13.8.4** Docker network isolation
  - Use custom bridge network (not default)
  - No external exposure for database container
  - Internal DNS resolution only

- [ ] **13.8.5** SSL/TLS termination at Nginx
  - TLS 1.2+ only (disable SSLv3, TLS 1.0, 1.1)
  - Strong cipher suites
  - HSTS preload ready
  - OCSP stapling enabled

### Verification Steps

- [ ] Rate limiting prevents abuse
- [ ] Security headers are set
- [ ] Database queries are optimized
- [ ] Health check endpoints work
- [ ] Production configuration is complete
- [ ] Deployment documentation is clear

### Deliverable

Production-ready backend with:

- Rate limiting
- Security headers
- Optimized performance
- Health checks
- Production configuration
- Deployment documentation

---

## Task 13.9: Security Verification Checklist

Before deploying to production, verify all security measures are in place and functioning:

### Rate Limiting Verification (8 checks)

- [ ] **RL-1**: Login endpoint blocks after 10 failed attempts from same IP
- [ ] **RL-2**: Login rate limit resets after 5 minutes
- [ ] **RL-3**: Token refresh has separate limit (20 per 10 min)
- [ ] **RL-4**: Authenticated API returns 429 after 100 req/min
- [ ] **RL-5**: Public API returns 429 after 60 req/min
- [ ] **RL-6**: Order creation limited to 30/min per user
- [ ] **RL-7**: Rate limit headers present on all responses (`X-RateLimit-*`)
- [ ] **RL-8**: `Retry-After` header present on 429 responses

### Security Headers Verification (7 checks)

- [ ] **SH-1**: `Content-Security-Policy` header present and strict
- [ ] **SH-2**: `X-Frame-Options: DENY` present
- [ ] **SH-3**: `X-Content-Type-Options: nosniff` present
- [ ] **SH-4**: `Strict-Transport-Security` present with max-age >= 1 year
- [ ] **SH-5**: `X-XSS-Protection: 1; mode=block` present
- [ ] **SH-6**: `Referrer-Policy` present
- [ ] **SH-7**: `Permissions-Policy` present with restricted features

### Authentication & Authorization Verification (6 checks)

- [ ] **AUTH-1**: Passwords hashed with bcrypt (cost factor >= 10)
- [ ] **AUTH-2**: JWT tokens expire correctly (15 min access, 7 day refresh)
- [ ] **AUTH-3**: Refresh tokens rotated on use (old token invalidated)
- [ ] **AUTH-4**: Cookies are httpOnly, secure, SameSite=Strict
- [ ] **AUTH-5**: Admin endpoints return 403 for staff users
- [ ] **AUTH-6**: JWT signature verified on every request

### SQL Injection Prevention Verification (4 checks)

- [ ] **SQL-1**: All queries use parameterized statements (no string concatenation)
- [ ] **SQL-2**: Dynamic queries use `sql.unsafe()` with proper parameter indexing
- [ ] **SQL-3**: No user input directly interpolated into SQL
- [ ] **SQL-4**: `SELECT *` never used (explicit column lists only)

### XSS Prevention Verification (3 checks)

- [ ] **XSS-1**: CSP header prevents inline scripts
- [ ] **XSS-2**: Output encoding verified (no raw HTML in responses)
- [ ] **XSS-3**: JSON responses have proper content-type (`application/json`)

### Request Security Verification (4 checks)

- [ ] **REQ-1**: Requests >10MB rejected with 413
- [ ] **REQ-2**: Deeply nested JSON (>10 levels) rejected
- [ ] **REQ-3**: Invalid content-types rejected
- [ ] **REQ-4**: Headers sanitized (no newlines, null bytes)

### Infrastructure Security Verification (5 checks)

- [ ] **INFRA-1**: Container runs as non-root user
- [ ] **INFRA-2**: Container filesystem is read-only
- [ ] **INFRA-3**: Nginx rate limiting active (test with load)
- [ ] **INFRA-4**: TLS 1.2+ only (test with SSL Labs)
- [ ] **INFRA-5**: Database not exposed to external network

### Security Testing Tools

Run these commands to verify security:

```bash
# Check security headers
curl -I https://your-domain.com/api/health

# Test rate limiting (should return 429 after limit)
for i in {1..15}; do curl -X POST https://your-domain.com/api/auth/login; done

# Test SQL injection (should return 400, not 500)
curl "https://your-domain.com/api/customers/search?phone=' OR '1'='1"

# Check TLS version (should reject TLS 1.0, 1.1)
openssl s_client -tls1 -connect your-domain.com:443
```

### Penetration Testing Checklist

- [ ] Attempt brute force login (verify rate limiting)
- [ ] Attempt JWT tampering (verify signature validation)
- [ ] Attempt cookie theft (verify httpOnly, secure flags)
- [ ] Attempt XSS injection in all input fields
- [ ] Attempt SQL injection in search parameters
- [ ] Attempt CSRF without proper headers (verify CORS)
- [ ] Attempt access to admin endpoints as staff (verify 403)
- [ ] Attempt directory traversal in file uploads (if applicable)

---

**Security Contact**: If security issues are discovered, document them in `docs/security/INCIDENTS.md` and fix before production deployment.

**Last Updated**: 2026-02-18
