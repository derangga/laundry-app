# Production Configuration Guide

This document describes all production environment variables, security configurations, and deployment requirements for the laundry management backend.

## Environment Variables

### Required Variables (MUST be changed)

These variables have no defaults and MUST be set in production:

```bash
# Database password - use a strong, random password
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# JWT secret - use a cryptographically secure random string (at least 32 characters)
# Generate with: openssl rand -base64 64
JWT_SECRET=CHANGE_ME_VERY_STRONG_SECRET_AT_LEAST_32_CHARS
```

### Server Configuration

```bash
NODE_ENV=production          # Required - enables production optimizations
PORT=3000                    # Port the backend listens on
HOST=0.0.0.0                # Host to bind to (0.0.0.0 for Docker)
LOG_LEVEL=info              # Logging level: debug, info, warning, error
LOG_FORMAT=json             # Log format: json (for production) or pretty (for development)
```

### Database Configuration

```bash
DATABASE_HOST=postgres       # Database host (service name in Docker Compose)
DATABASE_PORT=5432          # PostgreSQL port
DATABASE_USER=laundry_app_prod    # Database user
DATABASE_PASSWORD=<strong-password>  # REQUIRED - change this!
DATABASE_NAME=laundry_app_prod     # Database name
```

#### Database Connection Pool

```bash
DB_POOL_MIN=5               # Minimum connections in pool (default: 2)
DB_POOL_MAX=20              # Maximum connections in pool (default: 10)
DB_IDLE_TIMEOUT=30000       # Idle connection timeout in ms (default: 30000)
```

**Tuning Guidelines:**
- Small deployments (< 100 concurrent users): `DB_POOL_MIN=5, DB_POOL_MAX=20`
- Medium deployments (100-500 users): `DB_POOL_MIN=10, DB_POOL_MAX=40`
- Large deployments (> 500 users): `DB_POOL_MIN=20, DB_POOL_MAX=80`

### JWT Configuration

```bash
JWT_SECRET=<strong-secret>   # REQUIRED - at least 32 characters
JWT_ACCESS_EXPIRY=15m       # Access token lifetime (default: 15m)
JWT_REFRESH_EXPIRY=7d       # Refresh token lifetime (default: 7d)
```

**Security Recommendations:**
- Use a cryptographically secure random string for `JWT_SECRET`
- Generate with: `openssl rand -base64 64`
- Never commit the secret to version control
- Rotate the secret periodically (requires re-authentication of all users)

### Security Configuration

```bash
BCRYPT_ROUNDS=12            # Bcrypt hashing rounds (10-14 recommended)
RATE_LIMIT_ENABLED=true     # Enable rate limiting (default: true)
RATE_LIMIT_SKIP_ADMIN=true  # Skip rate limits for admin users (default: true)
MAX_BODY_SIZE=4194304       # Maximum request body size in bytes (default: 4MB)
MAX_JSON_DEPTH=10           # Maximum JSON nesting depth (default: 10)
```

## SSL/TLS Configuration

### Database SSL/TLS

For production deployments, enable SSL/TLS for database connections:

```bash
# Add to .env.production
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

**Note:** The current PostgreSQL client configuration does not include SSL by default. To enable SSL:

1. Update `backend/src/SqlClient.ts` to include SSL configuration
2. Ensure PostgreSQL server has SSL enabled
3. Provide SSL certificates if using custom CA

### Application SSL/TLS

SSL/TLS termination is handled by Nginx reverse proxy:

- Certificate location: `./ssl/cert.pem`
- Private key location: `./ssl/key.pem`
- TLS 1.2+ only
- Strong cipher suites configured

**Obtaining Certificates:**
- Production: Use Let's Encrypt (free, automated)
- Development: Generate self-signed certificate

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

## Cookie Security

Cookies are automatically secured in production:

- **httpOnly**: Always enabled (prevents JavaScript access)
- **secure**: Enabled in production (requires HTTPS)
- **sameSite**: Set to 'strict' (CSRF protection)

Implementation in `backend/src/http/CookieHelper.ts`:

```typescript
const isProduction = nodeEnv === 'production'

setCookie(response, 'refresh_token', token, {
  httpOnly: true,        // Always enabled
  secure: isProduction,  // HTTPS-only in production
  sameSite: 'strict',    // CSRF protection
  maxAge: maxAgeSeconds,
})
```

**Requirements:**
- Production deployment MUST use HTTPS
- Cookies will not work over HTTP in production
- Nginx is configured to redirect HTTP → HTTPS

## Security Checklist

Before deploying to production, verify:

### Secrets & Credentials
- [ ] `JWT_SECRET` changed from default (at least 32 characters)
- [ ] `DATABASE_PASSWORD` changed from default (strong password)
- [ ] Secrets not committed to version control
- [ ] Environment variables file permissions restricted (chmod 600)

### TLS/SSL
- [ ] Valid SSL certificate installed for domain
- [ ] SSL certificate private key secured
- [ ] TLS 1.2+ enforced
- [ ] HTTP redirects to HTTPS
- [ ] Database SSL enabled (if using remote database)

### Application Security
- [ ] `NODE_ENV=production` set
- [ ] Rate limiting enabled (`RATE_LIMIT_ENABLED=true`)
- [ ] Security headers enabled (automatic in production)
- [ ] Request body size limits configured
- [ ] JSON depth limits configured

### Infrastructure Security
- [ ] Docker containers run as non-root user
- [ ] Resource limits configured (CPU, memory)
- [ ] Read-only filesystem enabled
- [ ] Database not exposed externally (internal network only)
- [ ] Firewall configured (ports 80, 443 only)

### Monitoring & Logging
- [ ] Health check endpoints accessible
- [ ] Logs collected and aggregated
- [ ] Log level set to `info` (not `debug`)
- [ ] Log format set to `json`
- [ ] Database connection pool metrics monitored

## Performance Tuning

### Database Indices

Performance indices are created by migration `000007_add_performance_indices.up.sql`:

- `idx_customers_phone` - Customer phone lookup
- `idx_orders_customer_id` - Orders by customer
- `idx_orders_status` - Orders by status
- `idx_orders_payment_status` - Orders by payment status
- `idx_orders_created_at` - Orders by date
- `idx_order_items_order_id` - Order items by order
- `idx_refresh_tokens_user_id` - Refresh tokens by user
- `idx_refresh_tokens_expires_at` - Expired token cleanup

Verify indices exist:

```sql
\d customers
\d orders
\d order_items
\d refresh_tokens
```

### Connection Pooling

Tune connection pool based on load:

```bash
# Development
DB_POOL_MIN=2
DB_POOL_MAX=10

# Production (low traffic)
DB_POOL_MIN=5
DB_POOL_MAX=20

# Production (high traffic)
DB_POOL_MIN=20
DB_POOL_MAX=80
```

Monitor pool utilization and adjust accordingly.

## Secrets Management

### Using Docker Secrets

The `docker-compose.yml` uses Docker secrets for sensitive data:

```bash
# Create secrets directory
mkdir -p secrets

# Create database password secret
echo "your-strong-password" > secrets/db_password.txt
chmod 600 secrets/db_password.txt

# Add to .gitignore
echo "secrets/" >> .gitignore
```

### Environment File Security

```bash
# Restrict permissions on .env.production
chmod 600 backend/.env.production

# Never commit to version control
echo ".env.production" >> .gitignore
```

## Health Checks

Health check endpoints for monitoring:

### Server Health
```bash
GET /health
Response: {"status":"ok","timestamp":"2026-02-21T..."}
```

### Database Health
```bash
GET /health/db
Response: {"status":"ok","latencyMs":5,"timestamp":"2026-02-21T..."}
```

**Monitoring Recommendations:**
- Check `/health` every 30 seconds
- Check `/health/db` every 60 seconds
- Alert if `/health/db` latency > 100ms
- Alert if `/health` returns non-200 status

## Rate Limiting

Rate limiting is enabled by default in production:

### Strategies

| Endpoint | Max Requests | Window |
|----------|-------------|--------|
| `/api/auth/login` | 10 | 15 minutes |
| `/api/auth/refresh` | 20 | 15 minutes |
| Authenticated API | 100 | 1 minute |
| Public API | 30 | 1 minute |
| Order creation | 20 | 1 minute |
| Customer search | 50 | 1 minute |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708530000
Retry-After: 45 (on 429 errors only)
```

### Disabling Rate Limiting

To disable (not recommended for production):

```bash
RATE_LIMIT_ENABLED=false
```

## Common Issues

### Issue: Cookies not working in production

**Cause:** Application not using HTTPS, or `secure` flag enabled without HTTPS

**Solution:**
1. Ensure Nginx is serving over HTTPS
2. Verify SSL certificate is valid
3. Check that `NODE_ENV=production` is set

### Issue: Database connection pool exhausted

**Cause:** Too many concurrent requests, pool too small

**Solution:**
1. Increase `DB_POOL_MAX`
2. Monitor connection usage
3. Check for connection leaks in application code

### Issue: Rate limiting too strict

**Cause:** Default rate limits too low for traffic patterns

**Solution:**
1. Adjust rate limit strategies in `RateLimitService.ts`
2. Or disable rate limiting for specific endpoints
3. Or increase limits in strategy configuration
