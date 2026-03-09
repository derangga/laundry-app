# Production Dockerfile for frontend SSR
#
# IMPORTANT: Build the frontend on the host before building this image:
#   cd frontend && bun run build
# Docker's memory limit (~2GB) is insufficient for Vite builds.
# The host-built dist/ is copied in below and also bind-mounted into nginx.
FROM oven/bun:1

WORKDIR /app

# Copy root package files for workspace setup
COPY bun.lock package.json ./

# Copy workspace package.json files
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/observability/package.json ./packages/observability/
COPY backend/package.json ./backend/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy workspace source code (includes pre-built dist/)
COPY packages/shared/ ./packages/shared/
COPY packages/observability/ ./packages/observability/
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Set environment
ENV NODE_ENV=production
ENV PORT=3100

WORKDIR /app/frontend

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3100/ || exit 1

# Start SSR server
CMD ["bun", "run", "dist/server/server.js"]
