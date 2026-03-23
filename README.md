# JobScout

JobScout is a Next.js application for discovering jobs, analyzing resumes, scoring role fit, and generating tailored resumes.

## Stack

- Next.js 16 App Router
- React 19
- Prisma + PostgreSQL/pgvector
- Supabase Auth + Storage
- OpenRouter-backed AI workflows

## Architecture

- `app/`: routes, server actions, and page-level composition
- `lib/domains/`: domain repositories, orchestration, and presentation helpers
- `lib/services/`: external integrations and AI/document utilities
- `components/`: reusable UI primitives and route-specific client components
- `prisma/`: schema and database configuration

The codebase follows a simple rule:

- Server components read from `lib/domains/*`
- Client components call `app/actions/*` for mutations
- Shared low-level concerns such as auth syncing and pgvector persistence live in reusable helpers

## Core Flows

1. Upload a resume and extract structured data + embeddings.
2. Sync jobs from supported sources.
3. Score resume/job fit with semantic similarity and skill analysis.
4. Tailor resume content for a selected role.
5. Export the tailored resume as PDF or LaTeX.

## Local Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

Required environment variables are validated in `lib/env.ts`.

## Notes

- Authentication is synchronized into the application database on session load and auth callback.
- Match skill breakdowns are normalized through a shared presenter so UI rendering stays resilient to stored JSON shape changes.
- pgvector reads/writes are isolated behind domain helpers instead of being duplicated across actions.
