# Conkero - Amazon Seller Automation Platform

A modern SaaS platform that helps Amazon sellers increase sales and reduce manual work by automating critical business operations.

## 🚀 Features

- **Beautiful Web Interface** - Clean, responsive UI built with modern web standards
- **Product Management** - Manage your entire product catalog with ease
- **Dashboard Analytics** - Real-time metrics and insights
- **Settings & Configuration** - Comprehensive settings management
- **Background Jobs** - Automated tasks running in the background
- **API Documentation** - Auto-generated API docs with Swagger

## 📋 Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- [Docker](https://www.docker.com/) and Docker Compose
- PostgreSQL 16 (via Docker)
- Redis (via Docker)

## 🛠️ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/conkero.git
cd conkero
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Start the development environment
```bash
./scripts/dev.sh
```

This will:
- Start all Docker services (PostgreSQL, Redis)
- Run database migrations
- Start the API server with hot reload
- Make the app available at http://localhost:8000

### 4. Access the application
- **Web App**: http://localhost:8000
- **API Docs**: http://localhost:8000/api-docs
- **Health Check**: http://localhost:8000/health

## 🏗️ Project Structure

```
conkero/
├── backend/          # Backend API (Bun + TypeScript)
├── frontend/         # Frontend SPA (Web Components + HTMX)
├── worker/           # Background job processor
├── scripts/          # Development and deployment scripts
├── infra/           # Docker and infrastructure config
├── migrations/      # Database migrations
└── docs/           # Project documentation
```

## 💻 Development

### Running with development tools
```bash
# Start with pgAdmin, RedisInsight, and MailDev
./scripts/dev.sh --tools

# Access development tools:
# pgAdmin: http://localhost:5050
# RedisInsight: http://localhost:8001
# MailDev: http://localhost:1080
```

### Common commands
```bash
# Run tests
bun test

# Run linter
bun run lint

# Run type checking
bun run typecheck

# Generate database migration
bun run migrate:generate

# Apply migrations
bun run migrate
```

### Frontend Development

The frontend is a Single Page Application built with:
- **Web Components** - Reusable custom elements
- **HTMX** - For server interactions
- **PicoCSS** - Beautiful, semantic CSS framework
- **TypeScript** - Type safety throughout

Key pages:
- `/` - Dashboard with metrics and quick actions
- `/products` - Product management with table view
- `/settings` - Comprehensive settings interface

## 🚢 Production Deployment

### Using Docker
```bash
# Build and start production services
./scripts/prod.sh

# The app will be available on port 80/443
```

### Environment Variables

Key variables to configure for production:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `SESSION_SECRET` - Secret for sessions
- `DOMAIN_NAME` - Your production domain

See `.env.example` for all available options.

## 📚 Documentation

- [Backend Guidelines](docs/BACKEND-GUIDELINES.md)
- [Frontend Guidelines](docs/FRONTEND-GUIDELINES.md)
- [General Guidelines](docs/GENERAL-GUIDELINES.md)
- [Features Roadmap](FEATURES.md)
- [API Documentation](http://localhost:8000/api-docs) (when running)

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## 📦 Tech Stack

### Backend
- **Runtime**: Bun 1.x
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 + pgvector
- **ORM**: Drizzle
- **Cache**: Redis
- **Jobs**: pg-boss
- **Auth**: Lucia

### Frontend
- **Framework**: Web Components + HTMX
- **Styling**: PicoCSS (via CDN)
- **Language**: TypeScript
- **Routing**: Custom SPA router
- **State**: Server-driven with HTMX

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh) for blazing fast performance
- UI powered by [PicoCSS](https://picocss.com/) for beautiful, semantic styles
- Icons from [Heroicons](https://heroicons.com/)

---

Made with ❤️ by the Conkero team