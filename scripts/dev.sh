#!/usr/bin/env bash
#
# Development Environment Startup Script
# =====================================
# 
# This script starts all services needed for local development using Docker Compose.
# It loads configuration from .env.local and provides hot-reload for all services.
#
# Usage:
#   ./scripts/dev.sh
#
# Configuration:
#   All settings are loaded from .env.local
#   See .env.example for available options
#
# Services started:
#   - frontend (Next.js with hot reload)
#   - api (Backend API with hot reload)
#   - scheduler (Background jobs)
#   - db (PostgreSQL database)
#   - redis (Cache and job queue)
#

set -euo pipefail

# Load environment variables from .env.local
# This file should never be committed to git
if [ -f .env.local ]; then
    # Use a more robust method to export environment variables
    set -a  # automatically export all variables
    source .env.local
    set +a  # turn off automatic export
    echo "✓ Loaded configuration from .env.local"
else
    echo "⚠️  Warning: .env.local not found, using default values"
    echo "   Copy .env.example to .env.local and configure it"
fi

# Configuration with defaults
# These can be overridden in .env.local
PROJECT_NAME="${PROJECT_NAME:-myapp}"              # Used for container naming
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}" # Docker compose file to use
COMPOSE_PATH="${COMPOSE_PATH:-./infra}"           # Path to infrastructure files

# Enable Docker Compose Bake for better performance
export COMPOSE_BAKE=true

# Services to start in development
# You can customize this list in .env.local with DEV_SERVICES variable
SERVICES="${DEV_SERVICES:-frontend api scheduler db redis}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=� Starting ${PROJECT_NAME} development environment...${NC}"
echo -e "   Services: ${SERVICES}"
echo -e "   Compose file: ${COMPOSE_PATH}/${COMPOSE_FILE}"

# Ensure compose file exists
if [ ! -f "${COMPOSE_PATH}/${COMPOSE_FILE}" ]; then
    echo -e "${YELLOW}�  Compose file not found at ${COMPOSE_PATH}/${COMPOSE_FILE}${NC}"
    exit 1
fi

# Start services
echo -e "\n${BLUE}= Starting containers...${NC}"
docker compose -f "${COMPOSE_PATH}/${COMPOSE_FILE}" up -d ${SERVICES}

# Wait for services to be ready
echo -e "\n${BLUE}� Waiting for services to be ready...${NC}"
sleep 3

# Show running containers
echo -e "\n${GREEN} Development environment is running!${NC}"
docker compose -f "${COMPOSE_PATH}/${COMPOSE_FILE}" ps

# Show access URLs
echo -e "\n${BLUE}🚀 Application available at:${NC} http://localhost:3000"
echo -e "${BLUE}📚 API Documentation:${NC} http://localhost:3000/api-docs"

# Tail logs
echo -e "\n${BLUE}=� Tailing logs for active services...${NC}"
docker compose -f "${COMPOSE_PATH}/${COMPOSE_FILE}" logs -f ${SERVICES}