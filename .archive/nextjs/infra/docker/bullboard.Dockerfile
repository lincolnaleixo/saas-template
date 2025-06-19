# Bull Board Dockerfile
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
EXPOSE 3001

# Start Bull Board
CMD ["echo", "Bull Board not implemented yet"]