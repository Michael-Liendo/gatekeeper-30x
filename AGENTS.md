# Conventions

Read this before touching the code. It applies to people and AI agents alike.

## Language

- **Code, names, comments, log messages and commits: English.**
- **Anything a person reads in the product: Spanish.** UI text, API error messages
  shown to users, and docs in `docs/`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), in English.
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `style`.
Scope is the module or area (`content-review`, `ui`, `api`, `docker`, `deps`).

```
feat(content-review): add editorial score policy
fix(api): return 400 when content body is empty
```

## Architecture (DDD-lite)

```
src/
├── app/                      # Next.js routes only. Thin: validate → use case → respond.
│   └── api/                  # Route handlers (server).
├── modules/
│   └── <module>/             # One bounded context per business area.
│       ├── domain/           # Entities, value objects, policies. Pure TS, no I/O.
│       ├── application/      # Use cases. Orchestrate domain + ports.
│       ├── infrastructure/   # Adapters: JEV, LLM, data sources.
│       └── ui/               # React components of the module.
├── shared/
│   ├── config/               # Validated env (zod).
│   ├── ui/                   # Generic UI components.
│   └── lib/                  # Small helpers.
data/                         # Simulated datasets. No real personal data.
docs/                         # Challenge, design, pitch, playbook (Spanish).
```

Rules:

- **Dependencies point inward:** `ui`/`infrastructure` → `application` → `domain`.
  `domain/` imports nothing outside itself.
- **Every JEV call goes through `infrastructure/jev-client.ts`.** Never call
  TypeSafe from a route or a component.
- **JEV decides, code computes.** Counting, arithmetic, dates and thresholds live
  in `domain/` policies, never inside a JEV question.
- **Thresholds and editorial rules are data, not code.** Keep them in config
  objects so the Media team can tune them.
- **Secrets stay on the server.** `shared/config/env.ts` is `server-only`.
- One file = one responsibility. Prefer small named exports over default exports
  (except Next.js pages/layouts).

## UI

- Tailwind v4. Use theme tokens from `src/app/globals.css`; don't hardcode colors.
- Server Components by default; add `"use client"` only where needed.

## Tooling

- Node `>=22.18` (see `.nvmrc`). **npm or pnpm** both work; no yarn.
- When adding/removing a dependency, update **both** `package-lock.json` and
  `pnpm-lock.yaml` (`npm install <pkg>` then `pnpm install`). CI checks both.
- Docker builds with `npm ci`.
- Biome for lint + format (tabs, 100 cols). Run `npm run check` before pushing.

## Data

- Only simulated or public data. No real personal data, ever.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
