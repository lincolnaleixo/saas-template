### Development Automation

* Git workflow automated via `scripts/git.ts` with AI-powered commit messages
* Pre-commit hooks ensure code quality, schema validation, and migration tracking
* Database backups are automatically versioned with schema state
* API documentation is auto-generated from Zod schemas

## ☑️ Developer First‑Feature Checklist

&#x20;  \[ ] Clone repo and copy \`.env.example\` to \`.env\` &#x20;

&#x20;  \[ ] \`bun install\` &#x20;

&#x20;  \[ ] \`bun run page my-feature\`  scaffolds new route with Claude Code &#x20;

&#x20;  \[ ] Chat with Claude Code, include prompt snippets &#x20;

&#x20;  \[ ] Ensure unit tests pass with \`bun test\` &#x20;

&#x20;  \[ ] Open PR, include transcript, pass CI, merge.
