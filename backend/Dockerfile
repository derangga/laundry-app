# Multi-stage Dockerfile for production deployment
# Security features:
# - Multi-stage build (smaller final image)
# - Non-root user
# - Minimal base image
# - No unnecessary tools in production image

# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies (frozen lockfile for reproducibility)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# Production stage
FROM oven/bun:1-slim

# Create non-root user and group
RUN addgroup --system --gid 1001 laundry && \
    adduser --system --uid 1001 laundry

# Set working directory
WORKDIR /app

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=laundry:laundry /app/dist ./dist
COPY --from=builder --chown=laundry:laundry /app/node_modules ./node_modules
COPY --from=builder --chown=laundry:laundry /app/package.json ./package.json

# Switch to non-root user
USER laundry

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e 'fetch("http://localhost:3000/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start application
CMD ["bun", "dist/main.js"]
