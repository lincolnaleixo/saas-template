# End Flow Commands

These commands are automatically executed after implementing new features:

1. **Update .env.example and .env.local if needed** - Update environment variable files if any new environment variables were added during implementation
2. **Update ./scripts files if needed** - Update scripts files inside the script folder if new services or configurations were added and if needed
3. **Lint and fix all the lint errors** - Run the project's linting tools and automatically fix any linting errors found
4. **Fix all the typescript errors** - Run TypeScript compiler and fix any type errors that were introduced
5. **Give me a nice summary what you did and what I need to test** - Provide a comprehensive summary of all changes made and detailed testing instructions
6. **Execute ./dev/git.ts** - Run the git script to create a well-formatted commit with all changes

- implementa
- escreve comments etc nas coisas que criou/alterou
- atualiza readme
- atualiza features.md
- git.ts