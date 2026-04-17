# FrontierOS API

Node.js + Fastify + TypeScript backend that owns every server-side concern
for FrontierOS:

- `/api/generate` — OpenRouter proxy with SSE streaming for graph generation.
- `/api/bootstrap` — single hydration endpoint used by the frontend on load.
- `/api/sport-plans/:sport` — team-plan CRUD, including server-side
  re-onboarding of athletes when the plan changes.
- `/api/athletes/:id/...` — per-athlete deltas, draft deltas, draft accept,
  legacy full-graph storage, training-state patches, and resets.
- `/api/import-legacy` — one-shot migration endpoint that slurps an existing
  `localStorage` payload into Postgres.

Persistence is Supabase Postgres accessed via Drizzle ORM (`postgres-js`
driver). Schema lives in `src/db/schema.ts`; every table carries a
`coach_id` so the single-tenant demo can grow into multi-coach / auth without
another migration.

## Layout

```
backend/
├── drizzle/                    # Generated SQL migrations (drizzle-kit)
├── scripts/
│   ├── migrate.ts              # npm run db:migrate
│   └── seed.ts                 # npm run db:seed (upsert default coach + athletes)
├── src/
│   ├── db/
│   │   ├── client.ts           # postgres-js + drizzle client
│   │   └── schema.ts           # Drizzle table definitions
│   ├── lib/                    # graphSchema, prompts, coach, reonboard, apiTypes
│   ├── routes/                 # bootstrap, generate, sportPlans, athleteGraphs, athleteState, importLegacy
│   ├── env.ts                  # Validated env loader
│   └── index.ts                # Fastify bootstrap + route registration
├── Dockerfile
├── drizzle.config.ts
├── fly.toml
├── package.json
├── tsconfig.json
├── tsconfig.scripts.json       # Allows scripts to import frontend .ts data
└── README.md
```

## Run locally

```bash
cd backend
npm install
cp .env.example .env            # then fill in DATABASE_URL + OPENROUTER_API_KEY
npm run db:push                 # first time: push schema to Supabase
npm run db:seed                 # upsert default coach + demo athletes
npm run dev                     # http://localhost:8080
```

Sanity check:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/bootstrap | jq '.athletes | length'
```

### Drizzle scripts

| Command                | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run db:generate`  | Diff `schema.ts` → generates a new SQL migration in `drizzle/`.  |
| `npm run db:push`      | Apply schema directly (good for dev / first deploy).             |
| `npm run db:migrate`   | Run pending SQL migrations against `DATABASE_URL`.               |
| `npm run db:seed`      | Upsert default coach + every athlete from `src/data/athletes.ts`.|
| `npm run db:studio`    | Launch Drizzle Studio for browsing/editing data.                 |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Database → Connection pooling → copy the `postgres://…?sslmode=require`
   URI into `DATABASE_URL`. Use the pooler (port `6543`) for Fly.io; the
   direct port is fine locally.
3. Run `npm run db:push` once from your workstation so the schema exists.
4. Run `npm run db:seed` to insert the default coach (`default-coach`) and
   the demo athlete roster.

## Run via Docker

```bash
cd backend
docker build -t frontieros-api .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL=postgres://... \
  -e OPENROUTER_API_KEY=sk-or-... \
  -e ALLOWED_ORIGINS=http://localhost:5173 \
  frontieros-api
```

## Deploy to Fly.io

1. Install flyctl and log in:

   ```bash
   brew install flyctl
   fly auth login
   ```

2. From `backend/`, launch the app (this reuses the committed `fly.toml`):

   ```bash
   cd backend
   fly launch --no-deploy --copy-config
   ```

   Pick a unique app name (update `app = "..."` in `fly.toml` if prompted).
   Say **no** to creating Postgres / Redis / Tigris — Supabase owns the DB.

3. Set secrets:

   ```bash
   fly secrets set \
     DATABASE_URL='postgres://postgres:<pw>@db.<ref>.supabase.co:6543/postgres?sslmode=require' \
     OPENROUTER_API_KEY='sk-or-...' \
     ALLOWED_ORIGINS='https://frontier-os.netlify.app,http://localhost:5173'
   ```

4. Deploy:

   ```bash
   fly deploy
   ```

5. Health-check and hydrate:

   ```bash
   curl https://<your-app>.fly.dev/healthz
   curl https://<your-app>.fly.dev/api/bootstrap
   ```

6. Point Netlify at the new origin. `netlify.toml` already redirects
   `/api/*` to `https://frontieros-api.fly.dev/api/:splat` — change that
   target if your Fly app uses a different name.

## Environment variables

| Name                   | Required | Default                            | Purpose                                              |
| ---------------------- | -------- | ---------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`         | yes      | —                                  | Supabase Postgres connection string                  |
| `OPENROUTER_API_KEY`   | yes      | —                                  | OpenRouter API key for `/api/generate`               |
| `ALLOWED_ORIGINS`      | no       | `*`                                | Comma-separated CORS origins                         |
| `DEFAULT_COACH_ID`     | no       | `00000000-0000-0000-0000-000000000001` | Coach UUID used for all writes while auth is disabled |
| `OPENROUTER_MODEL`     | no       | `google/gemini-2.5-flash`          | Override the model slug                              |
| `HTTP_REFERER`         | no       | `https://frontier-os.netlify.app`  | Sent to OpenRouter for app attribution               |
| `OPENROUTER_APP_TITLE` | no       | `Frontier OS`                      | Sent to OpenRouter for app attribution               |
| `LOG_LEVEL`            | no       | `info`                             | Pino log level                                       |
| `PORT`                 | no       | `8080`                             | Bind port (Fly.io sets this automatically)           |

## Auth roadmap

Every table already has `coach_id`, but every request currently falls back
to `DEFAULT_COACH_ID`. To turn this into a real multi-coach app, add auth
middleware in `src/index.ts` that resolves `request.coachId` from a bearer
token or Supabase JWT, then replace the usages of `getCurrentCoachId()` in
the route handlers.
