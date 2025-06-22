# Infrastructure Configuration

This directory contains all Docker and infrastructure configuration for the Conkero project.

## Directory Structure

```
infra/
├── docker-compose.yml          # Base Docker configuration
├── docker-compose.dev.yml      # Development environment overrides
├── docker-compose.prod.yml     # Production environment configuration
├── Dockerfile.api              # Multi-stage Dockerfile for API service
├── Dockerfile.worker           # Multi-stage Dockerfile for Worker service
├── nginx/                      # Nginx configuration
│   ├── nginx.conf             # Main nginx configuration
│   └── conf.d/                # Site configurations
│       └── default.conf.template  # Environment-based template
└── scripts/                    # Infrastructure scripts
```

## Quick Start

### Development

```bash
# Start all services with hot-reload
../scripts/dev.sh

# Start with development tools (pgAdmin, RedisInsight, MailDev)
../scripts/dev.sh --tools

# Start with frontend development server
../scripts/dev.sh --frontend

# Start everything
../scripts/dev.sh --all
```

### Production

```bash
# Deploy to production
../scripts/prod.sh

# Services will be available at:
# - https://yourdomain.com (frontend)
# - https://yourdomain.com/api (backend API)
```

## Services

### Core Services

| Service | Description | Dev Port | Prod Port |
|---------|-------------|----------|-----------|
| API | Backend REST API with Bun runtime | 8000 | 8000 (internal) |
| Worker | Background job processor | 8002 | 8002 (internal) |
| Database | PostgreSQL 16 with pgvector | 5432 | 5432 (internal) |
| Redis | Cache & pub/sub | 6379 | 6379 (internal) |

### Development Tools

Available with `--tools` flag:

| Tool | Purpose | Port |
|------|---------|------|
| pgAdmin | Database GUI | 5050 |
| RedisInsight | Redis GUI | 8001 |
| MailDev | Email testing | 1080 |

## Docker Configuration

### Development Features

- **Hot Reload**: All services use Bun's `--hot` flag for automatic reloading
- **Volume Mounts**: Source code is mounted for instant updates
- **Development Tools**: Optional tools for database and cache inspection
- **Logging**: All logs visible in terminal and saved to `./logger` directory

### Production Features

- **Multi-stage Builds**: Optimized images with only production dependencies
- **Nginx Reverse Proxy**: SSL termination and static file serving
- **Automatic Backups**: Daily database backups with rotation
- **Health Checks**: All services include health endpoints
- **Non-root Users**: Services run as unprivileged users

## Environment Variables

All services are configured via environment variables. Key variables:

```bash
# Project
PROJECT_NAME=conkero

# Database
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=conkero

# Redis
REDIS_URL=redis://redis:6379

# API
API_PORT=8000
JWT_SECRET=your_jwt_secret

# Worker
WORKER_PORT=8002

# Development Tools (optional)
PGADMIN_PORT=5050
REDIS_INSIGHT_PORT=8001
MAILDEV_PORT=1080

# Production
DOMAIN_NAME=yourdomain.com
SSL_ENABLED=true
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

## Volumes

### Development
- Source code mounted for hot-reload
- `postgres-data`: Database persistence
- `redis-data`: Redis persistence

### Production
- `postgres-data`: Database files
- `redis-data`: Redis persistence
- `certbot-conf`: SSL certificates
- `certbot-www`: Let's Encrypt challenges
- `nginx-logs`: Access/error logs
- `backup-data`: Database backups

## Networking

All services communicate on a custom Docker network named `${PROJECT_NAME}_network`.

Internal service communication:
- API → Database: `db:5432`
- API → Redis: `redis:6379`
- Nginx → API: `api:8000`

## SSL/HTTPS

Production deployments automatically:
1. Request Let's Encrypt certificates via Certbot
2. Configure nginx for HTTPS with modern SSL settings
3. Set up automatic certificate renewal
4. Redirect HTTP to HTTPS

## Health Checks

All services include health checks:
- API: `GET /health`
- Worker: `GET /health` on port 8002
- Database: `pg_isready`
- Redis: `redis-cli ping`

## Logs

### Development
- Terminal output with colors and emojis
- Files saved to `./logger/app-YYYY-MM-DD.log`

### Production
- JSON format for structured logging
- Docker log drivers with rotation
- Centralized in Docker's logging system

## Customization

### Adding a New Service

1. Create a Dockerfile in this directory
2. Add service to docker-compose files
3. Update port configuration in .env.example
4. Document in this README

### Modifying Nginx

Templates in `nginx/conf.d/*.template` support environment variables:
- `${DOMAIN_NAME}`: Your domain
- `${API_PORT}`: Backend port
- `${SSL_ENABLED}`: Enable HTTPS

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f infra/docker-compose.yml logs

# Verify environment variables
docker compose -f infra/docker-compose.yml config
```

### Hot reload not working
- Ensure volume mounts are correct
- Check that Bun's `--hot` flag is in the CMD
- Verify file permissions

### Database connection issues
- Wait for health checks to pass
- Check DATABASE_URL format
- Verify network connectivity

### Port conflicts
- All ports are configurable via environment variables
- Check `.env.local` for port settings
- Use `docker ps` to see what's running