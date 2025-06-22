#!/bin/bash
# Development startup script for Conkero SaaS platform

set -e

echo "🚀 Starting Conkero in development mode..."

# Load environment variables
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
else
    echo "⚠️  .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "📝 Please update .env.local with your configuration"
    exit 1
fi

# Ensure required directories exist
mkdir -p logger uploads migrations/drizzle migrations/rollback migrations/seeds backups

# Parse command line arguments
PROFILE=""
TOOLS=false
FRONTEND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --tools)
            TOOLS=true
            shift
            ;;
        --frontend)
            FRONTEND=true
            shift
            ;;
        --all)
            TOOLS=true
            FRONTEND=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--tools] [--frontend] [--all]"
            echo "  --tools    Start development tools (pgAdmin, RedisInsight, MailDev)"
            echo "  --frontend Start frontend development server"
            echo "  --all      Start all services including tools and frontend"
            exit 1
            ;;
    esac
done

# Build profile string
if [ "$TOOLS" = true ]; then
    PROFILE="--profile tools"
fi
if [ "$FRONTEND" = true ]; then
    PROFILE="$PROFILE --profile frontend"
fi

# Start services with development configuration
echo "🐳 Starting Docker services..."
docker compose --env-file .env.local -f infra/docker-compose.yml -f infra/docker-compose.dev.yml $PROFILE up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until nc -z localhost ${DB_PORT:-5432} 2>/dev/null || [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; do
    echo -n "."
    sleep 1
    ATTEMPTS=$((ATTEMPTS + 1))
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo " ✗"
    echo "⚠️  Database failed to become ready after $MAX_ATTEMPTS seconds"
    exit 1
else
    echo " ✓"
fi

# Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
ATTEMPTS=0
MAX_ATTEMPTS=60
until curl -sf http://localhost:${API_PORT:-8000}/health > /dev/null 2>&1 || [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; do
    echo -n "."
    sleep 1
    ATTEMPTS=$((ATTEMPTS + 1))
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo " ✗"
    echo "⚠️  API failed to start after $MAX_ATTEMPTS seconds"
    echo "Check logs with: docker compose logs api"
    exit 1
else
    echo " ✓"
fi

# Run migrations (if any exist)
if [ -d "migrations/drizzle" ] && [ "$(ls -A migrations/drizzle/*.sql 2>/dev/null)" ]; then
    echo "📊 Running database migrations..."
    docker compose --env-file .env.local -f infra/docker-compose.yml -f infra/docker-compose.dev.yml exec -T api bun run scripts/migrate.ts || echo "⚠️  Migration script not found, skipping..."
else
    echo "ℹ️  No migrations found, skipping..."
fi

# Seed database (only if seed file exists)
if [ -f "migrations/seeds/001_initial_data.ts" ]; then
    echo "🌱 Seeding database..."
    docker compose --env-file .env.local -f infra/docker-compose.yml -f infra/docker-compose.dev.yml exec -T api bun run migrations/seeds/001_initial_data.ts || true
fi

echo ""
echo "✅ Development environment ready!"
echo ""
echo "📚 Access points:"
echo "   API:            http://localhost:${API_PORT:-8000}"
echo "   API Docs:       http://localhost:${API_PORT:-8000}/api-docs"
echo "   Health Check:   http://localhost:${API_PORT:-8000}/health"
echo "   Worker Health:  http://localhost:${WORKER_PORT:-8002}/health"

if [ "$TOOLS" = true ]; then
    echo ""
    echo "🛠️  Development tools:"
    echo "   pgAdmin:        http://localhost:${PGADMIN_PORT:-5050}"
    echo "   Redis Insight:  http://localhost:${REDIS_INSIGHT_PORT:-8001}"
    echo "   MailDev:        http://localhost:${MAILDEV_PORT:-1080}"
fi

if [ "$FRONTEND" = true ]; then
    echo ""
    echo "🎨 Frontend:"
    echo "   Dev Server:     http://localhost:${FRONTEND_DEV_PORT:-4001}"
fi

echo ""
echo "📋 Useful commands:"
echo "   View API logs:      docker compose logs -f api"
echo "   View Worker logs:   docker compose logs -f worker"
echo "   View all logs:      docker compose logs -f"
echo "   Stop services:      docker compose down"
echo "   Reset everything:   docker compose down -v"
echo "   Shell into API:     docker compose exec api sh"
echo ""
echo "🔥 Hot reload is enabled - changes to backend code will auto-restart!"
echo ""
echo "📺 Following logs (press Ctrl+C to exit)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Follow logs from all services
docker compose --env-file .env.local -f infra/docker-compose.yml -f infra/docker-compose.dev.yml logs -f --tail 50