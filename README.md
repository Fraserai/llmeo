# AUS LLMEO Platform

AUS LLMEO Platform is an Australian SaaS MVP that helps any business measure, monitor, and improve how it appears in AI-generated answers.

The product lets a business:

- create a business profile with Australian service-area context
- generate prompt sets across local discovery, best-of, trust, comparison, category, and solution-selection intent
- monitor mock multi-engine AI answer runs through an extensible engine abstraction
- see competitor mentions, source/citation patterns, and share-of-visibility signals
- receive prioritised recommendations for improving AI visibility

## MVP scope

This repository ships a working founder-style MVP with:

- email/password authentication using Auth.js credentials sessions
- workspace and business onboarding
- dashboard scoring and trend views
- prompt generation and prompt management
- competitor management
- citations/source analysis
- recommendations and reporting screens
- realistic seeded demo data for an Australian business
- mock engine providers structured for future live integrations

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- Prisma ORM
- PostgreSQL-ready schema
- Auth.js / NextAuth credentials auth
- Zod validation
- Recharts

## Architecture

High-level structure:

- `src/app`: routes, layouts, auth endpoints, and screen entry points
- `src/components`: UI primitives, layout shell, dashboard cards, and forms
- `src/lib`: env handling, Prisma client, shared helpers, AU constants
- `src/server/auth`: session and auth configuration
- `src/server/actions`: server actions for onboarding and workspace mutations
- `src/server/services`: service-layer business logic for catalog bootstrapping, prompt generation, mock engines, scoring, and workspace setup
- `prisma`: schema and seed data

Core models:

- `User`
- `Workspace`
- `WorkspaceMember`
- `Business`
- `Competitor`
- `PromptCategory`
- `Prompt`
- `Engine`
- `PromptRun`
- `PromptResult`
- `Mention`
- `CitationSource`
- `Recommendation`
- `VisibilitySnapshot`
- `Report`

## Local setup

1. Install dependencies.

```bash
pnpm install
```

2. Copy the environment file.

```bash
cp .env.example .env
```

3. Start a local PostgreSQL-compatible dev database.

Option A: Prisma local Postgres, which works well for this repo:

```bash
pnpm exec prisma dev
```

This prints a `DATABASE_URL`. Paste that into `.env`.

Option B: your own PostgreSQL instance.

- Point `DATABASE_URL` in `.env` to your Postgres database.
- A sample `docker-compose.yml` is included for standard Postgres setups.

4. Generate Prisma client, push schema, and seed demo data.

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

5. Run the app.

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo credentials

After seeding:

- email: `demo@ausllmeo.com.au`
- password: `Demo123!`

## Verification

This MVP was verified with:

- `pnpm lint`
- `pnpm build`
- runtime smoke checks against `/`, `/login`, and authenticated-route redirect behaviour

## Product notes

### Mock engine model

The MVP intentionally uses realistic mock engine providers behind a clean provider abstraction:

- ChatGPT-style source
- Google AI Overview-style source
- Perplexity-style source
- Gemini-style source

This keeps the UX and data model honest while making it straightforward to replace mock execution with live providers later.

### Scoring model

The AI Visibility Score is a transparent weighted blend of:

- mention presence across runs
- ranking/order in answers
- citation/source coverage
- share-of-visibility against competitors
- category coverage across prompt clusters

Supporting scores:

- Competitor Gap Score: how often competitors appear when the target business does not
- Opportunity Score: a refinement-friendly signal based on visibility weakness and competitor pressure

## Important implementation assumptions

- The platform is broadly usable for any Australian business, but the seeded demo uses a Queensland service business for realism.
- Authentication is email/password only in the MVP.
- Agency mode, billing, white-labelling, scheduling, notifications, and collaboration are intentionally prepared for later rather than fully implemented now.
- The app uses Australian wording and service-area examples by default.

## Future work

See [TODO.md](./TODO.md) for the next expansion areas.
