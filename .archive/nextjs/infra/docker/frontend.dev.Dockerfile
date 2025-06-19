FROM oven/bun:alpine

WORKDIR /app

# Install dependencies in a separate stage
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# The node_modules will be in the container, not in a volume
# This ensures dependencies are available

# Create directories that will be mounted as volumes
RUN mkdir -p src public .next app components hooks lib

# Expose port
EXPOSE 3000

# Start development server
CMD ["bun", "run", "dev"]