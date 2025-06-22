# SaaS Admin Dashboard

A modern, responsive admin dashboard built with TypeScript, Bun, PostgreSQL, and Web Components. Features a beautiful Shadcn-inspired design system with mobile-first responsive layout.

## 🚀 Features

- **Modern Tech Stack**: Bun runtime, TypeScript, PostgreSQL, Redis
- **Beautiful UI**: Shadcn-inspired design system with dark mode support
- **Web Components**: Custom elements for modular, reusable UI components
- **Admin Features**: User management, analytics, activity logs, settings
- **Authentication**: Secure session-based auth with role-based access control
- **Real-time Updates**: WebSocket support for live data
- **Background Jobs**: PostgreSQL-based job queue with pg-boss
- **Docker Ready**: Complete containerization with docker-compose
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## 📋 Prerequisites

- Docker and Docker Compose
- Bun runtime (optional for local development)
- Git

## 🛠️ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saas-admin-dashboard
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start the application**
   ```bash
   # Using Docker (recommended)
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   
   # Or manually with docker-compose
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

4. **Access the dashboard**
   - Admin Dashboard: http://localhost:8000
   - API Documentation: http://localhost:8000/api-docs
   - pgAdmin: http://localhost:5050
   - Redis Insight: http://localhost:8001
   - MailDev: http://localhost:1080

5. **Default credentials**
   - Email: `admin@example.com`
   - Password: `admin123`

## 📁 Project Structure

```
saas-admin-dashboard/
├── backend/              # Backend API server
│   ├── models/          # Database models (Drizzle ORM)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middlewares/     # Express-style middleware
│   └── lib/            # Core utilities
├── frontend/            # Frontend web components
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── services/       # API client services
│   └── styles/         # CSS styles
├── worker/             # Background job processor
├── migrations/         # Database migrations
├── scripts/           # Utility scripts
├── infra/             # Infrastructure configs
└── docker-compose.yml # Docker orchestration
```

## 🔧 Development

### Running locally without Docker

```bash
# Install dependencies
bun install

# Run database migrations
bun run migrate

# Seed the database
bun run seed

# Start the development server
bun run dev
```

### Running tests

```bash
bun test
```

### Database migrations

```bash
# Generate a new migration
bun drizzle-kit generate:pg

# Run migrations
bun run migrate

# Rollback migration
bun run scripts/rollback.ts <migration-name>
```

## 🚀 Production Deployment

1. **Update environment variables**
   ```bash
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Build and run**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Run migrations**
   ```bash
   docker-compose exec api bun run migrate
   ```

## 📚 API Documentation

The API documentation is automatically generated and available at `/api-docs` when the server is running. It includes:

- Interactive Swagger UI
- All available endpoints
- Request/response schemas
- Authentication requirements

## 🔒 Security

- All passwords are hashed with bcrypt
- Session-based authentication with secure cookies
- CSRF protection on state-changing operations
- Input validation with Zod schemas
- SQL injection protection with parameterized queries
- Rate limiting on API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.