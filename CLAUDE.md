# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## Project overview
**Chronolab Calendar**: a single-user calendar web app.
- Import calendars from `.ics` URLs (subscriptions, re-synced daily) or uploaded `.ics` files. Primary use: Malaysia public holidays.
- Mark personal days (one-off, multi-day, timed, yearly).
- Reminders per event or per calendar, delivered by email (Gmail SMTP) or ntfy phone push, sent by a background worker.
- Retro-sci-fi "lab" theme (nixie tubes, CRT phosphor). **It must stay original: never use characters, logos, art, quotes or names from Steins;Gate or any other existing work.** Users may drop their own images into `public/theme/` for private use.

Time zone: everything is in `APP_TIMEZONE` (default `Asia/Kuala_Lumpur`). Calendar dates are `YYYY-MM-DD` strings. Never use `Date` for calendar days.

## Stack
- **Framework:** Next.js (App Router) + TypeScript (`strict: true`)
- **Styling:** Tailwind CSS
- **Database:** SQLite via Drizzle ORM + better-sqlite3. The schema is in `src/db/schema.ts`; tables are created by `BOOTSTRAP_SQL` in `src/db/index.ts`. Keep the two in sync and use `ALTER TABLE` for changes to existing DBs.
- **ICS parsing:** node-ical. Date-only values come back as *process-local* midnight, so read them with local getters (see `src/lib/ics.ts`).
- **Worker:** `scripts/worker.ts` (node-cron, run with tsx)
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (end-to-end)
- **Package manager:** pnpm

## Commands
```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm start        # serve production build
pnpm worker       # reminder + sync worker (add --sync-now to sync immediately)
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest unit tests (tests/unit)
```
Run tests under a second server time zone too (`TZ=America/New_York pnpm test`) to catch date bugs.

## Folder layout
```
src/
  app/               # routes: / (month), /events/new, /events/[id], /calendars, /settings
    actions.ts       # all Server Actions
  components/        # nixie, flash, event-form, reminder-fields
  lib/
    dates.ts         # YYYY-MM-DD math, time zone conversion, month grid
    ics.ts           # .ics parsing + fetching
    sync.ts          # upsert imported events by UID (keeps reminders)
    occurrences.ts   # expand yearly events, group by day
    reminders.ts     # due-reminder detection + idempotent dispatch (with retries)
    notify.ts        # email + ntfy channels
    validation.ts    # Zod schemas
  db/
    schema.ts, index.ts
scripts/worker.ts
tests/
  unit/              # Vitest
  fixtures/          # sample .ics
```

## Conventions
- Use Server Components by default. Add `"use client"` only when interactivity needs it.
- Make data changes through **Server Actions**. Validate every input with a Zod schema.
- Do not use `any`. Prefer types inferred from Zod and Drizzle schemas.
- Keep components small and focused. Use named exports, not default exports, except where Next.js requires a default export (pages and layouts).
- Keep business logic in `src/lib`, not in components, so it stays unit-testable.
- Name files in kebab-case. Name components in PascalCase.

## Workflow rules
- Plan before any large or multi-file change, and agree on it before coding.
- Run `pnpm lint && pnpm typecheck && pnpm test` before every commit.
- Keep commits small and focused, with clear messages.
- Never commit secrets. Use `.env.local`, which git ignores, and document the variables in `.env.example`.
- **Commit and push early and often.** The cloud container is temporary, so unpushed work is lost.

## Definition of done
A feature is done when:
1. `pnpm build` succeeds.
2. Lint, typecheck, and tests pass.
3. It has been checked in the browser (`pnpm dev`), including the mobile layout.

## Roadmap
Done: scaffold, data model, ICS import and subscriptions, personal events, reminders (email and ntfy), worker, theme, unit tests.

Next:
1. Commit a Playwright end-to-end test for import, add event, and reminder.
2. Browser push notifications (service worker + VAPID).
3. Telegram/WhatsApp channel; Google Calendar export (`.ics` feed of "My Days").
4. Filter holidays by Malaysian state.
5. Deploy: a small VPS or home server with the web app and the worker (SQLite needs a persistent disk, so not Vercel serverless as-is).
6. Auth if it ever becomes multi-user.
