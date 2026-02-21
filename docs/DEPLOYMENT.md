# Deployment Guide

This guide covers the complete deployment process for the laundry management backend, including initial setup, database migrations, rollback procedures, and monitoring.

## Prerequisites

Before deploying, ensure you have:

- Docker and Docker Compose installed
- Valid SSL/TLS certificates (Let's Encrypt or self-signed)
- Production environment variables configured
- Database password and JWT secret generated

## Deployment Steps

### 1. Environment Preparation

```bash
# Clone the repository
git clone <repository-url>
cd laundry-app

# Copy production environment template
cp backend/.env.production.example backend/.env.production

# Edit environment variables (REQUIRED)
nano backend/.env.production
```

**Critical variables to change:**
- `JWT_SECRET` - Generate with `openssl rand -base64 64`
- `DATABASE_PASSWORD` - Use a strong random password

```bash
# Create secrets directory for Docker
mkdir -p secrets
echo "your-strong-password" > secrets/db_password.txt
chmod 600 secrets/db_password.txt

# Create SSL directory
mkdir -p ssl
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Production)

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
chmod 644 ssl/cert.pem
chmod 600 ssl/key.pem
```

#### Option B: Self-Signed (Development/Testing)

```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

### 3. Database Migration

```bash
# Build the application first
cd backend
bun install
bun run build

# Run migrations
bun run migrate:up

# Verify migrations
psql -h localhost -U laundry_app_prod -d laundry_app_prod -c "\dt"
```

**Expected tables:**
- `users`
- `customers`
- `services`
- `orders`
- `order_items`
- `refresh_tokens`

**Verify indices:**
```sql
\d customers
\d orders
\d order_items
\d refresh_tokens
```

### 4. Build Docker Images

```bash
# Return to project root
cd ..

# Build backend image
docker-compose build backend

# Verify image
docker images | grep laundry_backend
```

### 5. Start Application

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                IMAGE                   STATUS
# laundry_backend     laundry-app_backend     Up (healthy)
# laundry_nginx       nginx:alpine            Up (healthy)
# laundry_postgres    postgres:16-alpine      Up (healthy)
```

### 6. Verify Health Checks

```bash
# Check server health
curl http://localhost/health

# Expected: {"status":"ok","timestamp":"2026-02-21T..."}

# Check database health
curl http://localhost/health/db

# Expected: {"status":"ok","latencyMs":5,"timestamp":"2026-02-21T..."}
```

### 7. Bootstrap Admin User

```bash
# Create the first admin user
curl -X POST http://localhost/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "strong-admin-password",
    "fullName": "Admin User"
  }'

# Expected: User object with admin role
```

**Note:** The bootstrap endpoint can only be used once. It will return an error if an admin user already exists.

### 8. Test API

```bash
# Login as admin
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@laundry.com",
    "password": "strong-admin-password"
  }'

# Save the access token from response
# Expected: {"accessToken":"...","refreshToken":"...","user":{...}}
```

## Database Migration Strategy

### Forward Migrations

```bash
# Run all pending migrations
cd backend
bun run migrate:up

# Run specific migration
bun run migrate:up --to 000007
```

**Migration order:**
1. `000001` - Users table
2. `000002` - Customers table
3. `000003` - Services table
4. `000004` - Orders table
5. `000005` - Order items table
6. `000006` - Refresh tokens table
7. `000007` - Performance indices

### Rollback Migrations

```bash
# Rollback last migration
bun run migrate:down

# Rollback to specific migration
bun run migrate:down --to 000006

# Rollback all migrations (DANGEROUS)
bun run migrate:down --to 0
```

**Warning:** Rolling back migrations can cause data loss. Always backup the database before rolling back.

### Zero-Downtime Deployment

For production deployments with minimal downtime:

1. **Run migrations before deployment** - Migrations are backward compatible
2. **Deploy new application version** - Old version continues running
3. **Verify health checks** - Ensure new version is healthy
4. **Switch traffic** - Update load balancer or restart services

```bash
# 1. Run migrations
cd backend
bun run migrate:up

# 2. Build new image
cd ..
docker-compose build backend

# 3. Rolling update
docker-compose up -d --no-deps backend

# 4. Verify health
curl http://localhost/health
curl http://localhost/health/db
```

## Rollback Procedures

### Application Rollback

If the new deployment has issues:

```bash
# 1. Stop current version
docker-compose stop backend

# 2. Checkout previous version
git checkout <previous-tag-or-commit>

# 3. Rebuild image
docker-compose build backend

# 4. Start application
docker-compose up -d backend

# 5. Verify health
curl http://localhost/health
```

### Database Rollback

If database migration causes issues:

```bash
# 1. Stop application
docker-compose stop backend

# 2. Rollback migration
cd backend
bun run migrate:down

# 3. Restart application
cd ..
docker-compose up -d backend
```

**Important:** Always test rollback procedures in a staging environment first.

### Complete Rollback Workflow

```bash
# 1. Backup current state
docker-compose exec postgres pg_dump -U laundry_app_prod laundry_app_prod > backup.sql

# 2. Stop services
docker-compose down

# 3. Restore previous version
git checkout <previous-version>

# 4. Rollback migrations if needed
cd backend
bun run migrate:down
cd ..

# 5. Rebuild and restart
docker-compose build
docker-compose up -d

# 6. Verify
curl http://localhost/health
```

## Monitoring Setup

### Health Check Monitoring

Configure your monitoring system to check health endpoints:

```bash
# Server health (fast check)
*/30 * * * * curl -f http://localhost/health || alert

# Database health (slower check)
*/1 * * * * curl -f http://localhost/health/db || alert
```

**Recommended thresholds:**
- `/health` response time: < 10ms
- `/health/db` response time: < 100ms
- Alert if response time > 1000ms
- Alert if status is not "ok"

### Log Aggregation

Collect logs from Docker containers:

```bash
# View logs
docker-compose logs -f backend

# Export logs to file
docker-compose logs backend > logs/backend.log

# Use log aggregation tool (ELK, Loki, etc.)
```

**Log format in production:**
```json
{
  "level": "info",
  "timestamp": "2026-02-21T10:30:00.000Z",
  "message": "Request completed",
  "correlationId": "uuid",
  "method": "POST",
  "path": "/api/orders",
  "status": 201,
  "durationMs": 45
}
```

### Metrics to Monitor

**Application Metrics:**
- Request rate (requests/second)
- Error rate (errors/requests)
- Response time (p50, p95, p99)
- Active connections

**Database Metrics:**
- Connection pool utilization
- Query execution time
- Active connections
- Database size

**Infrastructure Metrics:**
- CPU usage (< 80%)
- Memory usage (< 80%)
- Disk I/O
- Network traffic

### Alerting

Set up alerts for:

1. **Critical (immediate action):**
   - Application down (health check fails)
   - Database down
   - Error rate > 5%
   - Response time > 1000ms

2. **Warning (investigate soon):**
   - CPU usage > 80%
   - Memory usage > 80%
   - Disk usage > 85%
   - Connection pool > 80% utilized

3. **Info (monitor trends):**
   - Rate limiting triggered
   - Failed login attempts
   - Slow queries

## Backup & Recovery

### Database Backup

```bash
# Daily backup (add to cron)
0 2 * * * docker-compose exec postgres pg_dump -U laundry_app_prod laundry_app_prod | gzip > /backups/laundry_$(date +\%Y\%m\%d).sql.gz

# Backup with retention (keep 30 days)
find /backups -name "laundry_*.sql.gz" -mtime +30 -delete
```

### Database Restore

```bash
# Stop application
docker-compose stop backend

# Restore from backup
gunzip < /backups/laundry_20260221.sql.gz | docker-compose exec -T postgres psql -U laundry_app_prod laundry_app_prod

# Start application
docker-compose up -d backend
```

## Scaling Considerations

### Vertical Scaling (Single Instance)

Increase resources in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'      # Increase from 1
          memory: 1024M  # Increase from 512M
```

### Horizontal Scaling (Multiple Instances)

**Requirements:**
- Load balancer (Nginx, HAProxy, AWS ALB)
- Redis for rate limiting (replace in-memory store)
- Shared session storage (Redis)

**Current limitations:**
- Rate limiting uses in-memory store (single instance only)
- No session sharing between instances

**Future improvements:**
- Implement Redis-backed rate limiting
- Use external session store
- Configure load balancer health checks

## Security Hardening

### Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirects to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw enable

# Deny all other ports
ufw default deny incoming
ufw default allow outgoing
```

### Security Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

### Secrets Rotation

```bash
# 1. Generate new secrets
NEW_JWT_SECRET=$(openssl rand -base64 64)
NEW_DB_PASSWORD=$(openssl rand -base64 32)

# 2. Update .env.production
nano backend/.env.production

# 3. Update database password
docker-compose exec postgres psql -U laundry_app_prod -d laundry_app_prod \
  -c "ALTER USER laundry_app_prod WITH PASSWORD 'new-password';"

# 4. Update Docker secrets
echo "new-password" > secrets/db_password.txt

# 5. Restart services
docker-compose restart
```

**Note:** Rotating JWT secret will invalidate all existing tokens and require users to log in again.

## Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

### Database connection errors

```bash
# Verify database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U laundry_app_prod -d laundry_app_prod -c "SELECT 1;"
```

### SSL certificate errors

```bash
# Verify certificate files exist
ls -la ssl/

# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Verify private key matches certificate
openssl x509 -noout -modulus -in ssl/cert.pem | openssl md5
openssl rsa -noout -modulus -in ssl/key.pem | openssl md5
```

### High memory usage

```bash
# Check container memory usage
docker stats

# Adjust resource limits in docker-compose.yml
# Increase connection pool size if needed
```

## Maintenance Windows

For planned maintenance:

1. **Notify users** - Send notification 24-48 hours in advance
2. **Schedule downtime** - Choose low-traffic period
3. **Backup database** - Always backup before maintenance
4. **Perform updates** - Migrations, application updates, security patches
5. **Verify health** - Check all health endpoints
6. **Monitor closely** - Watch metrics for 1-2 hours after maintenance
