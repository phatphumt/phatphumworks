# งานของฉัน · School Tasks

A single-user school task manager for a Thai school: a weekly timetable, date-only
todos, and one Discord digest in the evening (18:00 Asia/Bangkok by default).

**Production:** <https://wc20works.vercel.app>

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **shadcn/ui** on Base UI · Tailwind v4 · IBM Plex Sans Thai
- **Drizzle ORM + libSQL** — `file:local.db` in development, Turso in production
- **Discord webhook** — no bot account, no token
- **One passcode gate**, HMAC cookie, no session store

## What is inside

| Route | What it does |
|---|---|
| `/` | Today: overdue → today → a collapsible class schedule → digest status |
| `/tasks` | All open tasks, grouped by date, with filters and an inline quick-add |
| `/timetable` | Weekly timetable, period times, JSON import/export, tap a slot to edit |
| `/settings` | Discord webhook, digest time/window, period times, data import/export, theme, logout |
| `/export/month` | Monthly report of every task: PNG (4:5) download and A4 PDF via print |
| `/t/[id]` | Task detail: title, subject, due date, priority, notes, complete/delete |
| `/login` | Passcode gate (outside the app shell) |

The UI is Thai, uses **ค.ศ. (Gregorian) years only**, and supports light, dark, and
system themes. The app is designed around iOS grouped inset lists and a floating
tab bar; it is responsive from 375 px phones to a 248 px desktop sidebar.

## Run locally

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
npx drizzle-kit push --force
node scripts/seed.mjs
npm run dev
```

Open <http://localhost:3000> and enter `GATE_PASSCODE`.

`local.db` is the development database. `scripts/seed.mjs` loads
`data/schedule.example.json` and a few sample tasks; it is idempotent (lessons are
replaced, sample tasks are only inserted when the task table is empty).

## Environment

| Variable | Meaning |
|---|---|
| `GATE_PASSCODE` | Login passcode. Leave empty to disable the gate (local only). Changing it invalidates every existing cookie. |
| `CRON_TOKEN` | Shared secret for `/api/cron`. Generate with `openssl rand -hex 24`. |
| `DISCORD_WEBHOOK_URL` | Channel webhook. Settings can override it. |
| `TURSO_DATABASE_URL` | `file:local.db` locally, `libsql://…turso.io` in production. |
| `TURSO_AUTH_TOKEN` | Turso token (empty locally). |
| `NEXT_PUBLIC_APP_URL` | Public URL, shown on the Settings page. |
| `VAPID_PUBLIC_KEY` | Web Push public key (from `node scripts/gen-vapid.mjs`). |
| `VAPID_PRIVATE_KEY` | Web Push private key (keep secret). |
| `VAPID_SUBJECT` | `mailto:` or `https:` URL identifying the push sender. |

## The timetable JSON

`data/schedule.example.json` is both the seed and the import/export format:

```json
{
  "version": 1,
  "timezone": "Asia/Bangkok",
  "periodTimes": { "1": { "start": "08:30", "end": "09:20" } },
  "lessons": [
    {
      "dayOfWeek": 1,
      "period": 1,
      "subjectCode": "ค32101",
      "subjectName": "คณิตศาสตร์เพิ่มเติม"
    }
  ]
}
```

- `dayOfWeek`: **1 = จันทร์ … 7 = อาทิตย์** (ISO)
- `period`: **1–10**
- `(dayOfWeek, period)` must be unique; a missing entry is a free period
- `subjectCode` is the identity — the same code gets the same colour everywhere
- `periodTimes` is display-only; the digest is the only reminder

Import through **ตารางเรียน → นำเข้า** — it validates the file and shows a diff
(`เพิ่ม / ลบ / แก้`) before anything is written. Export from the same toolbar; the
export is accepted by the importer unchanged.

## The 18:00 digest

```
cron-job.org (every 15 min)
   └─ GET /api/cron?token=CRON_TOKEN
        ├─ before digestTime?          → 200 { skipped: "before-time" }
        ├─ already sent today?         → 200 { skipped: "already-sent" }
        ├─ open tasks due ≤ today + 7  → grouped embed
        └─ Discord 2xx?                → digest_log row (idempotency lock)
```

Idempotency lives in `digest_log.date` (primary key), so a duplicate call, a
retry, or a manual hit can never send twice. Because it only checks
`now >= digestTime`, a scheduler outage at 18:00 self-heals on the next tick.
Overdue tasks stay in the digest every day until they are ticked. Completed tasks
are archived seven days after completion by the same job.

The cron endpoint also accepts `Authorization: Bearer <CRON_TOKEN>`, which avoids
putting the secret in a URL that may end up in logs.

## Design system

The interface is a restrained **Apple iOS “Liquid Glass”** treatment (Level B):
opaque material, a hairline specular rim, a subtle sheen, and layered shadows.

- **No backdrop blur anywhere.** `.glass` deliberately uses gradients and shadows
  instead of `backdrop-filter`; this is a product requirement, not an oversight.
- **iOS system blue** — `#0071E3` in light, `#0A84FF` in dark. Readable link/text
  tones are `#005BB5` / `#409CFF`.
- **Grouped inset lists** on an `#F2F2F7` (light) or `#000` (dark) page; cards are
  white / `#1C1C1E` with a 14 px radius.
- **Subject colours** derive from `subjectCode`: emerald, lime, gold, orange, red,
  pink, purple, stone. The palette intentionally contains no blue, indigo, cyan,
  or sky so it never competes with the system accent.
- **Touch targets** are at least 44 × 44 px; form controls are 48 px; the nav bar
  is 44 px and the floating tab bar is 60 px. Focus rings are never removed.
- **Typography** is IBM Plex Sans Thai with SF Pro fallbacks; body copy sits on a
  15–17 px scale with a 1.55 line height so Thai tone marks are not clipped.
  Negative tracking is avoided for the same reason.
- **Breakpoints** — the floating tab bar is the navigation below 1024 px; the
  248 px sidebar appears at `lg` (1024 px). The timetable switches from its grouped
  list to the weekly grid at `md` (768 px), where the full-width grid has room.
- `prefers-reduced-motion: reduce` collapses animations and transitions.

## Security notes

- The gate cookie is an HMAC-SHA256 of the passcode, not the passcode itself. It is
  `httpOnly`, `SameSite=Lax`, and `Secure` in production, and lasts 30 days.
- The login route allows five failed attempts per IP per ten minutes. The counter
  is in memory, so it is per server instance and resets on a cold start.
- `/api/auth` and `/api/cron` are excluded from the gate; every other API route and
  page is protected by `src/proxy.ts`. The cron route has its own constant-time
  token check.
- The settings page can clear all tasks and digest history. It keeps the timetable.

## Deploy (free tier)

1. **Turso** — `turso db create school-tasks`, then
   `turso db show school-tasks --url` and `turso db tokens create school-tasks`.
2. **Vercel** — `vercel link`, set every variable from the table above, `vercel --prod`.
   Apply the schema once with the production URL and token exported in your shell
   (drizzle-kit does not read `.env.local`):
   `npx drizzle-kit push --force`.
   Functions are pinned to Singapore (`sin1`) in `vercel.json` so they sit next to
   Turso and close to Thailand.
3. **cron-job.org** — new job, every 15 minutes,
   `https://<app>.vercel.app/api/cron?token=<CRON_TOKEN>`.

Vercel Hobby's built-in cron only runs once per day, which is why the scheduler is
external.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck only |
| `node scripts/seed.mjs` | Example timetable + sample tasks (idempotent) |
| `node scripts/gen-vapid.mjs` | Generate VAPID keys for push notifications |
| `node scripts/notify.mjs "ข้อความ"` | Post a message to the webhook (phase pings) |
| `npx drizzle-kit push --force` | Apply schema changes |

On Windows PowerShell, use `npx.cmd` / `npm.cmd` if the execution policy blocks
`npx.ps1` / `npm.ps1`.

## Layout

```
src/app/(app)/            # today, tasks, timetable, settings, /t/[id]
src/app/export/month      # monthly PNG (4:5) + A4 PDF report (outside the shell)
src/app/login             # passcode screen (outside the shell)
src/app/api/              # auth, tasks, slots, schedule, settings, cron, test-webhook
src/components/           # app shell + one folder per feature
src/components/ui/        # iOS-flavoured primitives (button, sheet, segmented, …)
src/lib/db/schema.ts      # lessons, tasks, settings, digest_log
src/lib/time.ts           # Asia/Bangkok + ค.ศ. formatting, date-only helpers
src/lib/subjects.ts       # code-derived subject palette
src/lib/digest.ts         # pure embed builder
src/proxy.ts              # Next 16 proxy (was middleware) — the gate
```

## Troubleshooting

- **The gate ignores my environment override.** Next loads `.env.local`; a non-empty
  shell value wins, an empty one does not. Set `GATE_PASSCODE` to a non-empty value
  in the shell you launch the server from.
- **A build while the dev server is running clobbers `.next`.** Stop the dev server
  before `npm run build`, then restart it.
- **A new export from `src/lib/data.ts` is not picked up.** HMR can cache module
  exports; restart the dev server.
- **Dates show a Buddhist year.** Do not use a bare `th-TH` Intl formatter for
  years. Use the helpers in `src/lib/time.ts` or add `-u-ca-gregory`.
- **The digest says `already-sent` during testing.** That is the idempotency lock.
  Delete today's row from `digest_log` in development, or use a test webhook.
