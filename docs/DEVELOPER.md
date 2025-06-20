# Developer Guide

## Getting Started

### Prerequisites

- Docker installed
- Git configured
- Claude Code CLI installed

### Initial Setup

Choose your environment:

- **Development**: `./scripts/dev.sh` - Includes hot reload and log tailing
- **Production**: `./scripts/prod.sh` - Optimized builds with SSL/nginx

## Development Workflow

### Feature Development Scripts

Use these specialized scripts for common development tasks:

#### Creating New Features
```bash
dev/new-feature.ts
```

#### Bug Fixes
```bash
dev/bug-fix.ts
```

#### Feature Improvements
```bash
dev/improve-feature.ts
```

#### New Job on Scheduler/Worker
```bash
dev/new-job.ts
```

## Additional Resources

- Check `/prompts` directory for AI prompt templates
- Consult team documentation for specific guidelines