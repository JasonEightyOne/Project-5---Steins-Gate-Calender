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

## Notification setup

**Gmail:** turn on 2-Step Verification, create an App Password at <https://myaccount.google.com/apppasswords>, and put it in `SMTP_PASS`. Set `SMTP_USER` and `MAIL_TO` to your address.

**Phone push (ntfy):** install the free ntfy app (Android/iOS), subscribe to a long random topic name, and set `NTFY_URL=https://ntfy.sh/<that-topic>`. Anyone who knows the topic can read it, so keep the name hard to guess, or self-host ntfy.

Use **Notifications → Send test** in the app to check each channel.

## Theme note

The look is an original design inspired by retro sci-fi lab aesthetics, made with the `frontend-design` skill (see `docs/adding-skills.md`). It contains no characters, logos, artwork or text from any existing anime.
