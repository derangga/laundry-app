# Multi-stage Dockerfile for production deployment
# Security features:
# - Multi-stage build (smaller final image)
# - Non-root user
# - Minimal base image
# - No unnecessary tools in production image

# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY bun.lock package.json ./

# Copy workspace package.json files (both needed for workspace resolution)
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies at root level (workspace-aware)
RUN bun install --frozen-lockfile

# Copy backend source code
COPY backend/ ./backend/

# Copy shared package source code (required for build-time imports)
COPY packages/shared/ ./packages/shared/

# Build application
WORKDIR /app/backend
RUN bun run build

# Production stage
FROM oven/bun:1-slim

# Create non-root user and group
RUN groupadd --system --gid 1001 laundry && \
    useradd --system --uid 1001 --gid laundry laundry

# Set working directory
WORKDIR /app

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=laundry:laundry /app/backend/dist ./dist
COPY --from=builder --chown=laundry:laundry /app/backend/node_modules ./node_modules
COPY --from=builder --chown=laundry:laundry /app/backend/package.json ./package.json

# Switch to non-root user
USER laundry

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun -e 'fetch("http://localhost:3000/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start application
CMD ["bun", "dist/main.js"]
