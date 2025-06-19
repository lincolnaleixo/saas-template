# API Development Dockerfile
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

# Expose port
EXPOSE 8000

# Set development command
CMD ["bun", "run", "dev:api"]