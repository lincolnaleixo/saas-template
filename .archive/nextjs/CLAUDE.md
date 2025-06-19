## 1. About the project

### 1.1 Name

// INPUT THE PROJECT NAME

### 1.2 Vision

//INPUT HERE THE PROJECT VISION IN DETAILS

### 1.3 Description

//INPUT HERE THE PROJECT DESCRIPTION IN DETAILS

## 2. Development guidelines

STRICTLY FOLLOW THE guidelines.md found on the root of the repository

## 3. Important Project Files

- Technical stack and design principles: `guidelines.md`
- Development workflows and procedures: `workflow.md`
- Environment configuration example: `.env.example`

## 4. Infrastructure Notes

### 4.1 SSL/HTTPS Configuration
- The project always uses SSL in production
- Certificates are managed automatically via Let's Encrypt
- Initial setup: `./infra/scripts/init-letsencrypt.sh`
- Automatic renewal is handled by the certbot service

### 4.2 Environment Variables
- All configuration is driven by environment variables
- Copy `.env.example` to `.env.local` for development
- Key variables:
  - `PROJECT_NAME`: Used for container naming
  - `DOMAIN_NAME`: Required for production SSL
  - `SSL_EMAIL`: Required for Let's Encrypt
  - `API_PORT`: Backend API port (default: 8000)

### 4.3 Docker Performance
- `COMPOSE_BAKE=true` is enabled by default for better build performance
- This delegates builds to Docker Buildkit bake

### 4.4 Nginx Configuration
- Templates use environment variables and are processed at runtime
- Located in `infra/nginx/conf.d/`
- Processed by `infra/scripts/process-nginx-templates.sh`

