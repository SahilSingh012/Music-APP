# RanaSongs

Punjabi, Haryanvi & Hindi music streaming app. No sign-up, no login, no paywall.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **Drizzle ORM** and **PostgreSQL**.
Playback streams the complete song through YouTube's embedded player (no API key required),
resolved on demand and cached in the database.

## Features

- 507-track catalogue across Punjabi / Haryanvi / Hindi, seeded automatically on first run
- Full player: play/pause, next/prev, seek, volume, mute, shuffle, repeat, queue, video panel
- Automatic YouTube resolution with ranked fallbacks when an upload blocks embedding
- Search across the local catalogue **plus** live online search for anything not in the library
- Likes, play history and playlists — all keyed to an anonymous device id (no accounts)
- Media Session integration (lock-screen / headset controls) and keyboard shortcuts
- Installable PWA with offline app shell
- Responsive: sidebar on desktop, drawer navigation on mobile

## Prerequisites

- Node.js 20+
- A PostgreSQL database

## Local development

```bash
npm install

# point the app at your database
cp .env.example .env.local
# then edit .env.local and set DATABASE_URL

# create the tables (once)
npx drizzle-kit push

npm run dev
```

Open http://localhost:3000. The catalogue seeds itself the first time the app touches the database.

## Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Development server                   |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | TypeScript, no emit                  |

## Environment variables

| Variable       | Required | Description                            |
| -------------- | -------- | -------------------------------------- |
| `DATABASE_URL` | yes      | PostgreSQL connection string           |
| `PGPOOL_MAX`   | no       | Max pool connections (default `10`)    |

TLS is enabled automatically in production and whenever the URL contains `sslmode=require`,
which covers Neon, Supabase, Vercel Postgres, Railway and RDS.

## Deploying to production

The app is a standard Next.js server app (it needs a Node runtime and a database — it cannot be
exported as a purely static site).

### Vercel (recommended)

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com), **Add New → Project** and import the repo.
3. Add the environment variable `DATABASE_URL` (Production, Preview and Development).
   You can create a free database with Vercel Postgres or [Neon](https://neon.tech).
4. Deploy.
5. Create the tables once against the production database:
   ```bash
   DATABASE_URL="<your production url>" npx drizzle-kit push
   ```
6. Visit `/api/health` — it should return `{"ok":true,"database":"connected"}`.

The catalogue seeds itself on the first request.

### Any Node host (Railway, Render, Fly.io, VPS)

```bash
npm ci
npm run build
npm run start   # honours $PORT
```

Set `DATABASE_URL` in the environment and run `npx drizzle-kit push` once.

## Health check

`GET /api/health` returns `200` when the database is reachable and `503` otherwise — use it as
your platform's readiness probe.

## API

| Route                     | Methods                | Purpose                              |
| ------------------------- | ---------------------- | ------------------------------------ |
| `/api/songs`              | GET                    | Catalogue with search/filter/sort     |
| `/api/search-online`      | GET                    | Live online search                    |
| `/api/resolve`            | POST                   | Resolve a song to a playable video    |
| `/api/likes`              | GET, POST              | Read / toggle likes                   |
| `/api/plays`              | GET, POST              | Play history                          |
| `/api/playlists`          | GET, POST              | List / create playlists               |
| `/api/playlists/[id]`     | POST, PATCH, DELETE    | Add song / rename / delete            |
| `/api/health`             | GET                    | Health probe                          |

## Note on outbound network access

Song resolution and online search scrape YouTube's public search page, and fonts load from the
Google Fonts CDN. Both need outbound HTTPS access from the server. If a host blocks them the app
still runs — it degrades to system fonts and shows a "couldn't find a stream" message with a
direct YouTube link instead of crashing.
