# Ideas OS

A private personal command centre for notes, dictionary building, news judgement, planning, and immersive focus.

## Version
- **Current version:** `0.1.0`
- **Last update:** Initial MVP scaffold with full module shell, cross-module search, backup export route, Prisma schema + seed data, and immersive focus visual area.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS (dark, high-contrast design system)
- Prisma + SQLite schema for local-first data
- npm scripts for Codespaces-friendly workflow

## Run in GitHub Codespaces
1. Open repository in Codespaces.
2. Run `npm install`.
3. Copy env file: `cp .env.example .env`.
4. (Optional for DB features) run:
   - `npm run db:generate`
   - `npm run db:migrate`
   - `npm run db:seed`
5. Start dev server:
   - `npm run dev -- --hostname 0.0.0.0 --port 3000`
6. Open forwarded port `3000`.

## What is included in this MVP
- Dashboard with daily brief layout and module entry points
- Notes/diary module shell (folders, note types, tags, pinned/recent framing)
- News evaluation module shell (source profiles + article queue + rubric framing)
- Dictionary module shell with rich entry model examples
- Assistant module shell with tasks and daily planning
- Global search across notes, dictionary entries, articles, and tasks
- Cross-module data model in Prisma (including generic links)
- Backup export endpoint at `/api/export`
- Dedicated immersive “Observatory” focus page with lightweight animated particle scene and reduced-motion support

## Project structure
- `src/app/*`: module pages and API routes
- `src/components/*`: shell, search, visual components
- `src/lib/*`: shared data and search logic
- `prisma/*`: schema and seed script
- `.devcontainer/*`: Codespaces setup

## Notes
- In this environment, package installation from npm registry may be restricted.
- The repository is scaffolded to run normally in standard Codespaces with network access.
