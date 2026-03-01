# Ideas OS - Project Guidance

## Purpose
Ideas OS is a single-user private web app for notes, news evaluation, dictionary building, planning, and focused thinking.

## Stack
- Next.js App Router + TypeScript + Tailwind CSS
- Prisma + SQLite schema for local-first persistence
- Zod-ready validation patterns

## Run commands
- `npm install`
- `cp .env.example .env`
- `npm run dev -- --hostname 0.0.0.0 --port 3000`
- Optional DB setup: `npm run db:generate && npm run db:migrate && npm run db:seed`

## Conventions
- British English copy in UI and docs.
- Keep modules cohesive: notes, news, dictionary, assistant, focus.
- Prefer transparent rubric logic over opaque scoring claims.

## Architecture notes
- App Router pages per module.
- Shared sample data in `src/lib/data.ts` until live DB wiring is completed.
- Export endpoint at `/api/export` for backup path.
- Prisma schema already models cross-module links.

## Workflow rules
- Build in phases: shell, notes, search/linking, news, visuals, dictionary, assistant.
- Keep performance-first visuals and reduced motion support.
- Prioritise maintainability and sensible defaults over complexity.

## Assumptions
- Single-user private deployment first.
- SQLite is primary data store for v1.
- Manual-first data entry with later API/local model expansion.
