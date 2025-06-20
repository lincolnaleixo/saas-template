# End Flow Commands

These commands are automatically executed after implementing new features:

1. **Update .env.example and .env.local if needed** - Update environment variable files if any new environment variables were added during implementation
2. **Update ./scripts/dev.sh and ./scripts/prod.sh if needed** - Update development and production scripts if any new services or configurations were added
3. **Lint and fix all the lint errors** - Run the project's linting tools and automatically fix any linting errors found
4. **Fix all the typescript errors** - Run TypeScript compiler and fix any type errors that were introduced
5. **Give me a nice summary what you did and what I need to test** - Provide a comprehensive summary of all changes made and detailed testing instructions
6. **Execute ./scripts/git.ts** - Run the git script to create a well-formatted commit with all changes