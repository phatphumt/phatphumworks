<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide — งานของฉัน / School Tasks

A single-user, Thai-language school task manager. Read `README.md` for the
product overview and deployment steps. This file is the working agreement for
changes in this repository.

## Non-negotiables

1. **Thai UI, Gregorian years.** All user-facing copy is Thai. Years are ค.ศ.
   only. Never let a bare `th-TH` Intl formatter emit a Buddhist-era year; use the
   helpers in `src/lib/time.ts` or pass `-u-ca-gregory`.
2. **Dates are labels, not instants.** `dueDate` is `YYYY-MM-DD` in
   `Asia/Bangkok`. Do not convert it through UTC or store a timestamp for it.
3. **iOS “Liquid Glass”, Level B, with no blur.** Keep the near-opaque glass
   material, specular rim, sheen, and layered shadows. Do **not** add
   `backdrop-filter` / `backdrop-blur` anywhere. Do not introduce purple-blue
   gradients or generic “AI dashboard” styling.
4. **Accessibility is part of the design.** Interactive targets are at least
   44 × 44 px; body text must stay at 4.5:1 or better; controls at 3:1; focus
   rings are never removed. Keep `prefers-reduced-motion` working.
5. **Keep the architecture.** This is a single-user app with a passcode gate, one
   Turso database, date-only todos, and one Discord digest. Don’t add accounts,
   teams, background workers, or a client-side database.

## Commands (Windows)

The shell is PowerShell. `npm.ps1` / `npx.ps1` are blocked by execution policy:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit
npx.cmd drizzle-kit push --force
node scripts/seed.mjs
```

Do not run `next build` while the dev server is running: both write `.next` and
the build can clobber the running dev state. Stop the dev server, build, then
restart it.

## Architecture map

```
src/proxy.ts                    passcode gate (Next 16 renamed middleware → proxy)
src/app/layout.tsx              Thai font, theme provider, toaster
src/app/(app)/layout.tsx        AppShell (sidebar ≥1024, floating tab bar <1024)
src/app/(app)/page.tsx          Today — server-fetches data, renders TodayView
src/app/(app)/tasks/page.tsx    Tasks
src/app/(app)/timetable/page.tsx
src/app/(app)/settings/page.tsx
src/app/(app)/t/[id]/page.tsx    Task detail
src/app/login/page.tsx          Gate, outside the shell
src/app/export/month/page.tsx   Monthly PNG (4:5) + A4 PDF report, outside the shell
src/app/api/*                   auth, tasks, slots, schedule, settings, cron, test-webhook
src/components/*                Feature folders + ui/ primitives
src/lib/db/schema.ts            lessons, tasks, settings, digest_log
src/lib/data.ts                 All database reads/writes
src/lib/time.ts                 Bangkok clock + date-only helpers
src/lib/validation.ts           Zod schemas + shared defaults (18:00, 7 days)
src/lib/digest.ts               Pure Discord embed builder
src/lib/subjects.ts             Code-derived subject palette
```

Server pages are `force-dynamic` and fetch through `src/lib/data.ts`. Client
components receive initial data as props and call API routes for mutations. Keep
database access on the server.

## Data rules

- `lessons` uses `(dayOfWeek, period)` as its primary key. `dayOfWeek` is ISO
  **1 = Monday … 7 = Sunday**; `period` is 1–10. A missing cell is free.
- `tasks` are ordered by `dueDate`, then priority, then creation. `doneAt` marks
  completion; the cron job sets `archivedAt` seven days later. Every UI query
  excludes archived rows.
- `settings` is a key/value table. Discord webhook, digest time/window, and period
  times live there; the webhook falls back to `DISCORD_WEBHOOK_URL`.
- `digest_log.date` is the **idempotency lock**. Never send a digest without first
  checking it, and never remove the row when a send fails.
- When adding a data export, restart the dev server. HMR can cache exports from
  `src/lib/data.ts`.

## UI conventions

- Design tokens live in `src/app/globals.css`: iOS system blue
  (`--primary`), readable blue text (`--primary-text`), grouped-list surfaces
  (`--card`, `--muted`, `--fill`), and `.glass`, `.group-card`, `.subject-chip`.
  Use tokens, not raw hex values, except inside the subject palette.
- Layout language: 15–17 px Thai copy, 13 px section headers, grouped inset cards
  with a 14 px radius, 44 px nav, 60 px floating tab bar, 248 px sidebar at `lg`.
- Navigation breakpoint is **1024 px** (`lg`); the timetable grid switches at
  **768 px** (`md`). Test 375, 390, 768, 1024, and 1440 px.
- Use the custom `DateField` for due dates. Do not reintroduce a native
  `<input type="date">`; it brings browser-locale and era surprises.
- Use the shared primitives in `src/components/ui/` (button, sheet, segmented,
  input, page-header, empty-state) rather than one-off controls.
- Subject colours come from `subjectStyle()` / `subjectColor()` and the
  `subject-chip` class. The palette is deliberately blue-free. Don’t hardcode a
  subject hue in a component.
- Sheets use the grabber + 44 px close button + sticky footer pattern. Keep it.

## Gate and digest invariants

- `src/proxy.ts` protects every page and API route except `/api/auth`,
  `/api/cron`, and static assets. If you add a route that must be callable
  without a session, update the matcher deliberately and document why.
- The gate cookie is an HMAC of `GATE_PASSCODE`; changing the passcode logs
  everyone out. Login is limited to five failed attempts per IP per ten minutes
  (in-memory, per instance).
- The cron route checks `CRON_TOKEN` from the query string or a Bearer header,
  runs only after `digestTime`, and skips if today’s row already has `sentAt`.
  Keep it idempotent and safe to retry.
- The digest is built by the pure `buildDigest()` function. Test it by calling it
  directly; don’t post test messages to the real channel unless asked.

## Definition of done

Before handing work back:

1. `npx.cmd tsc --noEmit` passes.
2. `npm.cmd run lint` passes (or the remaining warnings are pre-existing and
   explained).
3. `npm.cmd run build` passes, with the dev server stopped.
4. UI changes were checked at 375 / 390 / 768 / 1440, light and dark, including
   the task sheet, date picker, and task detail.
5. No `backdrop-filter`, no Buddhist-era dates, no sub-44 px targets, no secrets
   in source, and no debug/QA scripts left in the repository.

