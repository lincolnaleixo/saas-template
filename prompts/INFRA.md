# Infrastructure Configuration

This directory contains all Docker and infrastructure configuration for the project.

## Directory Structure

```
infra/
├── Dockerfile.api              # API service container
├── Dockerfile.frontend         # Frontend development container
├── Dockerfile.frontend.prod    # Frontend production build
├── Dockerfile.worker           # Background worker container
├── docker-compose.dev.yml      # Development environment
├── docker-compose.prod.yml     # Production environment
├── nginx/                      # Nginx configuration
│   ├── nginx.conf             # Main nginx config
│   └── conf.d/                # Site configurations
├── scripts/                    # Infrastructure scripts
└── certbot/                    # SSL certificates (generated)
```

## Quick Start

### Development

```bash
# Start all services
./scripts/dev.sh

# Or manually with docker-compose
docker compose -f infra/docker-compose.dev.yml up
```

### Production

```bash
# Deploy to production
./scripts/prod.sh

# Services will be available at:
# - https://yourdomain.com (frontend)
# - https://yourdomain.com/api (backend API)
```

## Services

### Core Services

| Service | Description | Dev Port | Prod Port |
|---------|-------------|----------|-----------|
| API | Backend REST API | 8000 | 8000 (internal) |
| Worker | Background job processor | 8002 | 8002 (internal) |
| Frontend | Web application | 4001 | 80/443 |
| Database | PostgreSQL 16 | 5432 | 5432 (internal) |
| Redis | Cache & pub/sub | 6379 | 6379 (internal) |

### Development Tools

Available with `--profile tools`:

| Tool | Purpose | Port |
|------|---------|------|
| pgAdmin | Database GUI | 5050 |
| RedisInsight | Redis GUI | 8001 |
| MailDev | Email testing | 1080 |

## Environment Variables

All services are configured via environment variables. See `.env.example` for full documentation.

Key variables:
- `PROJECT_NAME` - Used for container naming
- `DOMAIN_NAME` - Production domain for SSL
- `*_PORT` - All ports are configurable

## SSL/HTTPS

Production deployments automatically:
1. Request Let's Encrypt certificates
2. Configure nginx for HTTPS
3. Set up automatic renewal

## Volumes

Production data is persisted in Docker volumes:
- `postgres-data` - Database files
- `redis-data` - Redis persistence
- `nginx-logs` - Access/error logs

## Backups

The backup service runs daily at 2 AM (configurable via `BACKUP_CRON`).
Backups are stored in `./backups` with automatic rotation.

## Customization

### Adding a New Service

1. Create a Dockerfile in this directory
2. Add service to docker-compose files
3. Update port configuration in .env.example
4. Document in this README

### Nginx Configuration

Templates in `nginx/conf.d/*.template` are processed on deployment with environment variables.

### Health Checks

All services include health checks for proper orchestration and monitoring.