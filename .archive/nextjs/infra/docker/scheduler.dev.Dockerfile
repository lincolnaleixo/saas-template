# Scheduler Development Dockerfile
FROM oven/bun:1.2.16-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lock* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Set development command
CMD ["bun", "run", "dev:worker"]