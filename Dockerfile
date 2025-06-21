# Use Bun base image
FROM oven/bun:1-alpine AS base

# Install dependencies for production
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build/compile if needed (TypeScript, etc.)
# RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy necessary files from builder
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/frontend ./frontend
COPY --from=builder --chown=nodejs:nodejs /app/static ./static
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create necessary directories
RUN mkdir -p logger && chown -R nodejs:nodejs logger

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["bun", "run", "backend/server.ts"]