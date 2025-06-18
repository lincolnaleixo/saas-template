#!/usr/bin/env bash
#
# Production Deployment Script
# ============================
#
# This comprehensive script handles the complete production deployment including:
# - Building and starting all services
# - SSL certificate generation and renewal via Let's Encrypt
# - Nginx configuration for HTTPS
# - Database initialization
# - Health checks and monitoring
#
# Usage:
#   ./scripts/prod.sh                    # Normal deployment
#   sudo ./scripts/prod.sh              # When setting up cron jobs
#
# Prerequisites:
#   - Domain pointed to server IP
#   - Ports 80 and 443 open
#   - Docker and Docker Compose installed
#   - .env.local or .env.production configured
#
# Configuration:
#   Copy .env.example to .env.local and set:
#   - PROJECT_NAME: Your project identifier
#   - DOMAIN_NAME: Your production domain
#   - LETSENCRYPT_EMAIL: Email for SSL certificates
#

# Exit on any error
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Functions
print_status() {
    echo -e "${BLUE}►${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Configuration from environment variables
# All these can be overridden in .env.local or .env.production
#
# PROJECT_NAME: Base name for all Docker containers (e.g., myapp-frontend, myapp-api)
PROJECT_NAME="${PROJECT_NAME:-myapp}"

# DOMAIN_NAME: Your production domain (required for SSL)
DOMAIN_NAME="${DOMAIN_NAME:-}"

# LETSENCRYPT_EMAIL: Email for SSL certificate notifications (required)
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

# Docker Compose settings
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_PATH="${COMPOSE_PATH:-./infra}"

# Enable Docker Compose Bake for better performance
export COMPOSE_BAKE=true

# Database configuration
DB_NAME="${DB_NAME:-$PROJECT_NAME}"
DB_USER="${DB_USER:-postgres}"

# Port configuration
API_PORT="${API_PORT:-8000}"          # Internal API port
NGINX_HTTP_PORT="${NGINX_HTTP_PORT:-80}"    # Public HTTP port
NGINX_HTTPS_PORT="${NGINX_HTTPS_PORT:-443}" # Public HTTPS port

# Banner
echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   ${PROJECT_NAME} Production Deployment"
echo "║   Unified Setup Script                 ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root when needed
check_sudo() {
    if [ "$EUID" -ne 0 ] && [ -n "$1" ]; then
        print_error "This operation requires sudo privileges"
        print_warning "Please run: sudo $0"
        exit 1
    fi
}

# Load environment from .env.local (production can use .env.production)
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
    print_success "Loaded configuration from .env.local"
elif [ -f .env.production ]; then
    set -a
    source .env.production
    set +a
    print_success "Loaded configuration from .env.production"
else
    print_warning "No environment file found (.env.local or .env.production), using defaults and environment variables"
fi

# Validate required vars
if [ -z "$DOMAIN_NAME" ] || [ -z "$LETSENCRYPT_EMAIL" ]; then
    print_error "DOMAIN_NAME and LETSENCRYPT_EMAIL must be set in .env.local or .env.production"
    exit 1
fi

print_success "Configuration loaded for $DOMAIN_NAME"

# Function to check if certificates exist
check_certificates() {
    if [ -d "${COMPOSE_PATH}/certbot/conf/live/$DOMAIN_NAME" ] && \
       [ -f "${COMPOSE_PATH}/certbot/conf/live/$DOMAIN_NAME/fullchain.pem" ] && \
       [ -f "${COMPOSE_PATH}/certbot/conf/live/$DOMAIN_NAME/privkey.pem" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check if cron job exists
check_cron_exists() {
    if sudo crontab -l 2>/dev/null | grep -q "certbot renew"; then
        return 0
    else
        return 1
    fi
}

# Step 1: Create directory structure
print_status "Setting up directories..."
if [ "$EUID" -eq 0 ]; then
    mkdir -p ${COMPOSE_PATH}/certbot/conf
    mkdir -p ${COMPOSE_PATH}/certbot/www/.well-known/acme-challenge
    chown -R $SUDO_USER:$SUDO_USER ${COMPOSE_PATH}/certbot
else
    mkdir -p ${COMPOSE_PATH}/certbot/conf
    mkdir -p ${COMPOSE_PATH}/certbot/www/.well-known/acme-challenge
fi

# Step 2: Stop and clean nginx configs
print_status "Preparing nginx configuration..."
docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} stop nginx 2>/dev/null || true

# Process nginx templates
print_status "Processing nginx configuration templates..."
${COMPOSE_PATH}/scripts/process-nginx-templates.sh

# Step 3: Determine if we need SSL certificates
NEEDS_SSL=false
if check_certificates; then
    print_success "SSL certificates already exist"
    CERT_EXISTS=true
else
    print_warning "SSL certificates not found, will request new ones"
    CERT_EXISTS=false
    NEEDS_SSL=true
fi

# Step 4: Copy nginx config
print_status "Copying nginx configuration..."
cp ${COMPOSE_PATH}/nginx/conf.d/processed/default.conf ${COMPOSE_PATH}/nginx/conf.d/processed/active.conf


# Step 5: Build and start services
print_status "Building Docker images..."
docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} build

print_status "Starting services..."
docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} up -d

# Wait for database to be ready
print_status "Waiting for database to start..."
MAX_ATTEMPTS=30
ATTEMPT=0
while ! docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} exec -T ${PROJECT_NAME}-db pg_isready -U ${DB_USER} > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
        print_error "Database failed to start after $MAX_ATTEMPTS attempts"
        exit 1
    fi
    sleep 1
done
print_success "Database is ready"

# Import latest schema
print_status "Importing database schema..."
LATEST_SCHEMA=$(ls -1 ${COMPOSE_PATH}/db-schemas/*.sql 2>/dev/null | sort -r | head -1)
if [ -n "$LATEST_SCHEMA" ] && [ -f "$LATEST_SCHEMA" ]; then
    print_status "Using schema: $(basename $LATEST_SCHEMA)"
    docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} exec -T ${PROJECT_NAME}-db psql -U ${DB_USER} -d ${DB_NAME} < "$LATEST_SCHEMA" 2>/dev/null || {
        print_warning "Schema already exists or partial import (this is normal)"
    }
    print_success "Database schema imported"
else
    print_error "No schema file found in ${COMPOSE_PATH}/db-schemas/"
    print_warning "Database will start empty - make sure to run backup-db.sh in development first"
fi

# Wait for other services
print_status "Waiting for all services to start..."
sleep 5

# Step 6: Get SSL certificates if needed
if [ "$NEEDS_SSL" = true ]; then
    print_status "Testing HTTP access before requesting certificates..."
    if ! curl -f -s -o /dev/null http://localhost/health; then
        print_error "HTTP health check failed"
        docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs nginx
        exit 1
    fi

    print_status "Requesting SSL certificates from Let's Encrypt..."
    docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} run --rm \
        --entrypoint "certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email $LETSENCRYPT_EMAIL \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            -d $DOMAIN_NAME \
            -d www.$DOMAIN_NAME" certbot

    if [ $? -ne 0 ]; then
        print_error "Failed to obtain SSL certificates"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check DNS: dig +short $DOMAIN_NAME"
        echo "2. Ensure port 80 is accessible from internet"
        echo "3. Temporarily disable Cloudflare proxy if enabled"
        exit 1
    fi

    print_success "SSL certificates obtained!"

    # Switch to HTTPS configuration
    print_status "Switching to HTTPS configuration..."
    ./scripts/prod.sh
    exit 0
fi

# Step 7: Setup cron for renewal if not exists
if check_cron_exists; then
    print_success "Certificate renewal cron job already exists"
else
    print_status "Setting up automatic certificate renewal..."
    if [ "$EUID" -eq 0 ]; then
        # Running as root
        (crontab -l 2>/dev/null; echo "0 0 * * 0 cd $PROJECT_DIR && docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} run --rm certbot renew && docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} exec nginx nginx -s reload") | crontab -
        print_success "Cron job added for automatic renewal"
    else
        print_warning "To setup automatic renewal, run:"
        echo "sudo crontab -e"
        echo "Add: 0 0 * * 0 cd $PROJECT_DIR && docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} run --rm certbot renew && docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} exec nginx nginx -s reload"
    fi
fi

# Step 8: Final verification
print_status "Verifying deployment..."
echo ""

# Check services with better detection
SERVICES=("nginx" "api" "frontend" "db" "redis" "scheduler")
ALL_GOOD=true

for service in "${SERVICES[@]}"; do
    # Check if container exists and is running
    if docker ps -q -f name=${PROJECT_NAME}-$service | grep -q .; then
        print_success "$service is running"
    else
        print_error "$service is not running"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = true ]; then
    echo ""
    print_success "Deployment complete!"
    echo ""
    if [ "$CERT_EXISTS" = true ]; then
        echo -e "${GREEN}Your site is available at:${NC}"
        echo -e "  ${BLUE}https://$DOMAIN_NAME${NC}"
        echo -e "  ${BLUE}https://www.$DOMAIN_NAME${NC}"
    else
        echo -e "${YELLOW}Your site is currently available at:${NC}"
        echo -e "  ${BLUE}http://$DOMAIN_NAME${NC}"
        echo -e "${YELLOW}Run this script again after DNS propagation to enable HTTPS${NC}"
    fi

    # Display useful commands
    echo ""
    echo -e "${BLUE}📌 Useful Commands:${NC}"
    echo "  • View all logs:      docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs -f"
    echo "  • View API logs:      docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs -f api"
    echo "  • View Scheduler:     docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs -f scheduler"
    echo "  • Stop all services:  docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} down"
    echo "  • Database shell:     docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} exec ${PROJECT_NAME}-db psql -U ${DB_USER}"
    echo ""

    print_warning "📺 Following logs for API and Scheduler (Press Ctrl+C to stop)..."
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Follow logs for API and Scheduler
    docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs -f api scheduler
else
    echo ""
    print_error "Some services failed to start"
    echo "Check logs with: docker compose -f ${COMPOSE_PATH}/${COMPOSE_FILE} logs [service-name]"
    exit 1
fi
