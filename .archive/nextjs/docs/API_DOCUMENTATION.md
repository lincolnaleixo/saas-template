# API Documentation

This project uses tRPC for type-safe APIs. API documentation is automatically generated from the tRPC router definitions.

## Live API Documentation

Access the interactive API documentation at:

**http://localhost:3000/api-docs**

This custom-built documentation provides:
- Live, interactive documentation for all tRPC endpoints
- Organized by router (auth, example, etc.)
- Input/output schemas for each endpoint
- Ability to test endpoints directly from the UI
- No additional dependencies required

## Benefits of tRPC

Unlike traditional REST APIs, tRPC provides:
- **End-to-end type safety** - No need for manual type definitions
- **Auto-completion** - Your IDE knows all available endpoints and their types
- **No code generation** - Types are inferred directly from your router
- **Smaller bundle size** - No OpenAPI spec needed

## Adding New API Endpoints

1. Add procedures to routers in `src/infrastructure/http/trpc/routers/`
2. Import and add them to `src/server/api/root.ts`
3. The documentation updates automatically!

## Type Safety

With tRPC, you get compile-time type checking:

```typescript
// Frontend code
const user = await trpc.auth.me.useQuery();
// TypeScript knows the exact shape of 'user'

// If you try to access a non-existent field:
user.data.nonExistentField; // TypeScript error!
```

## Why We Removed OpenAPI Generation

The previous OpenAPI generation script was designed for REST APIs. With tRPC:
- Documentation is generated from the actual code
- No separate spec files to maintain
- Always in sync with the implementation
- Better developer experience with auto-completion