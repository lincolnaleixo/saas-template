# Modern Full-Stack Template

> A production-ready template for building modern web applications with Next.js, tRPC, PostgreSQL, and Docker.

**Version 1.0.0** - *Released: June 18, 2025*

## About This Template

This template provides a complete foundation for building scalable, type-safe web applications. It includes everything you need to go from development to production, with best practices and automation built-in.

### Key Features

- **Full-Stack Type Safety**: End-to-end TypeScript with tRPC and Zod validation
- **Modern Stack**: Next.js 15, React 19, Tailwind CSS 4, and shadcn/ui
- **Database Ready**: PostgreSQL with Drizzle ORM and automatic migrations
- **Background Jobs**: Redis + BullMQ for queues and scheduled tasks
- **Authentication**: Lucia auth with session management
- **Production Ready**: SSL/HTTPS with Let's Encrypt, nginx reverse proxy
- **Developer Experience**: Hot reload, automated workflows, and comprehensive tooling
- **Fully Containerized**: Everything runs in Docker - no local dependencies

## Quick Start

1. **Clone and Configure**
   ```bash
   git clone <this-repo> my-project
   cd my-project
   cp .env.example .env.local
   ```

2. **Start Development**
   ```bash
   ./scripts/dev.sh
   ```
   
   Access your app at `http://localhost:3000`

3. **Deploy to Production**
   ```bash
   # Configure your domain in .env.production
   ./scripts/prod.sh
   ```

## What's Included

### Infrastructure
- Docker Compose setup for all services
- Automatic SSL certificate management
- nginx reverse proxy with caching
- Database backups and migrations
- Redis for caching and job queues

### Development Tools
- Hot reload for frontend and backend
- Database GUI (pgAdmin)
- Redis GUI (RedisInsight)
- Job queue monitoring (Bull Board)
- Email testing (MailDev)

### Automation
- Git workflow with AI-powered commits
- Automatic API documentation
- Database migration tracking
- Pre-commit hooks for quality

## Documentation

- **Technical Guidelines**: See [GUIDELINES.md](./GUIDELINES.md)
- **Development Workflow**: See [WORKFLOW.md](./WORKFLOW.md)
- **AI Assistant Instructions**: See [CLAUDE.md](./CLAUDE.md)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend | tRPC v11, Server Components |
| Database | PostgreSQL 16, Drizzle ORM |
| Cache | Redis 7 |
| Jobs | BullMQ |
| Auth | Lucia |
| Runtime | Bun |
| Deploy | Docker Compose |

## Requirements

- Docker and Docker Compose
- Bun (for local development)
- A domain name (for production SSL)

## License

MIT - Use this template for any project!

---

Made in Barcelona with ❤️ to accelerate modern web development.