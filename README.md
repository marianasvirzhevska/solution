# Smart Sender · Webhooks (test task)

> Work in progress. The full README (decisions, credentials, limitations) comes in the final step.

## Requirements

- Node.js 20.19+ (see `.nvmrc`)
- pnpm 10 (`corepack enable` picks up the version from `packageManager`)

## Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `pnpm install`   | Install dependencies                          |
| `pnpm dev`       | Start the dev server                          |
| `pnpm test`      | Run tests once (Vitest)                       |
| `pnpm typecheck` | TypeScript in strict mode                     |
| `pnpm lint`      | ESLint (typescript-eslint strict, type-aware) |
| `pnpm format`    | Prettier                                      |
| `pnpm check`     | typecheck + lint + format check + tests       |
| `pnpm build`     | Production build                              |
