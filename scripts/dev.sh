#!/bin/bash
# Development startup script for SaaS Admin Dashboard

set -e

echo "🚀 Starting SaaS Admin Dashboard in development mode..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "⚠️  .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "📝 Please update .env.local with your configuration"
fi

# Ensure required directories exist
mkdir -p logger uploads migrations/drizzle migrations/rollback migrations/seeds

# Start services with development configuration
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec -T api bun run scripts/migrate.ts

# Seed database (only if empty)
echo "🌱 Seeding database..."
docker-compose exec -T api bun run migrations/seeds/001_initial_data.ts || true

echo "✅ Development environment ready!"
echo ""
echo "📚 Access points:"
echo "   Admin Dashboard: http://localhost:${API_PORT:-8000}"
echo "   API:            http://localhost:${API_PORT:-8000}/api"
echo "   API Docs:       http://localhost:${API_PORT:-8000}/api-docs"
echo "   pgAdmin:        http://localhost:${PGADMIN_PORT:-5050}"
echo "   Redis Insight:  http://localhost:${REDIS_INSIGHT_PORT:-8001}"
echo "   MailDev:        http://localhost:${MAILDEV_PORT:-1080}"
echo ""
echo "🔑 Default admin credentials:"
echo "   Email:    admin@example.com"
echo "   Password: admin123"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker-compose logs -f api"
echo "   Stop:         docker-compose down"
echo "   Reset DB:     docker-compose down -v"