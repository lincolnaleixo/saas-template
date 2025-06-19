# Zero‑Build SaaS Template

## ⚡ One‑Command Dev Loop

1. `bun install`
2. `bun run dev`

   * starts `bun --hot src/server.ts`
   * runs `bunx tsc --noEmit --watch` in parallel

## 🤖 AI‑Assisted Workflow With Claude Code

* Store reusable prompt snippets in `/prompts` (e.g. `style‑guide.md`, `db‑access.md`).
* `scripts/create‑page.ts` calls the **Claude Code tool**:

  * injects prompt snippets
  * generates route, tests and docs
  * updates the routes manifest automatically
* Each feature branch includes its Claude chat transcript in the PR description.
* CI gates: `tsc --noEmit`, `bun test`, `eslint`, `prettier --check`.

## 🔒 Quality and Safety Guardrails

* Strict TypeScript settings like `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
* ESLint and Prettier on pre‑commit hooks (husky).
* Tests first – Claude can draft them.
* Two human reviewers for every AI‑generated pull request.
* Security checklist: parameterised SQL and user input validation.

## 🚀 Deployment Cheatsheet

* `docker build -t my-saas .` uses the `oven/bun` base image.
* Push to host, then run `bun build src/server.ts --compile` for small cold start.
* Execute `scripts/migrate.ts` on release to apply migrations.

## ☑️ Developer First‑Feature Checklist

&#x20;  \[ ] Clone repo and copy \`.env.example\` to \`.env\` &#x20;

&#x20;  \[ ] \`bun install\` &#x20;

&#x20;  \[ ] \`bun run page my-feature\`  scaffolds new route with Claude Code &#x20;

&#x20;  \[ ] Chat with Claude Code, include prompt snippets &#x20;

&#x20;  \[ ] Ensure unit tests pass with \`bun test\` &#x20;

&#x20;  \[ ] Open PR, include transcript, pass CI, merge.
