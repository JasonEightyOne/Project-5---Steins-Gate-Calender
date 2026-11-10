# Chronolab Calendar

A personal calendar designed like an engineer's logbook: green graph paper, ink and red pencil, with a strip of glowing nixie tubes showing today's date and the days until the next holiday. See `docs/design-plan.md`.

- **Import calendars:** subscribe to any `.ics` URL (one click for Malaysia public holidays) or upload an `.ics` file. Re-imports update existing events by UID and keep their reminders.
- **Mark your own days:** one-off, multi-day, timed, or repeating every year (birthdays, anniversaries).
- **Reminders:** per event, or calendar-wide (e.g. "every Malaysian holiday, 1 day before"), sent by **email (Gmail)** or **phone push (ntfy)**.

## Run it

```bash
pnpm install
```

```bash
cp .env.example .env.local   # then fill in email / ntfy settings
```

```bash
pnpm build && pnpm start      # web app on http://localhost:3000
```

```bash
pnpm worker                   # in a second terminal: sends reminders, syncs subscriptions daily
```

Both processes share the SQLite file at `DATABASE_PATH` (default `./data/calendar.db`).

## Deploy on Vercel

Vercel can't keep files on disk or run a background worker, so it needs two free services: **Turso** (a hosted SQLite database) and **cron-job.org** (a timer that triggers reminders).

**1. Create the database.** Sign up at <https://turso.tech>, create a database (for example `chronolab`), then copy two values:
- its **URL**, which starts with `libsql://`
- an **auth token**: in the dashboard, use *Create token*

With the Turso CLI it's:

```bash
turso db create chronolab
```

```bash
turso db show chronolab --url
```

```bash
turso db tokens create chronolab
```

The app creates its tables on first use.

**2. Add environment variables in Vercel.** Go to Project → Settings → Environment Variables and add:

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | the `libsql://…` URL |
| `TURSO_AUTH_TOKEN` | the token |
| `CRON_SECRET` | a long random string (for example from `openssl rand -hex 24`) |
| `NTFY_URL` and/or `SMTP_*`, `MAIL_TO` | your notification settings (see below) |

Then redeploy: Deployments → ⋯ → Redeploy.

**3. Turn on reminders.** At <https://cron-job.org>, create a free job:
- **URL:** `https://<your-app>.vercel.app/api/cron`
- **Schedule:** every minute
- **Advanced → Headers:** `Authorization` = `Bearer <your CRON_SECRET>`

Each call sends any reminders that are due. During 03:00–03:05 Malaysia time it also refreshes subscribed calendars. To refresh them right away, open `/api/cron?sync=1` with the same header.

## Notification setup

**Gmail:** turn on 2-Step Verification, create an App Password at <https://myaccount.google.com/apppasswords>, and put it in `SMTP_PASS`. Set `SMTP_USER` and `MAIL_TO` to your address.

**Phone push (ntfy):** install the free ntfy app (Android/iOS), subscribe to a long random topic name, and set `NTFY_URL=https://ntfy.sh/<that-topic>`. Anyone who knows the topic can read it, so keep the name hard to guess, or self-host ntfy.

Use **Notifications → Send test** in the app to check each channel.

## Theme note

The look is an original design inspired by retro sci-fi lab aesthetics, made with the `frontend-design` skill (see `docs/adding-skills.md`). It contains no characters, logos, artwork or text from any existing anime.
