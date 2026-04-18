# Repository structure

Where the main code and config live in FrontierOS.

## Top level

| Area | Role |
|------|------|
| `package.json`, `vite.config.ts`, `src/` | **Frontend** — Vite + React + TypeScript SPA |
| `backend/` | **API** — separate Node package (Fastify), own `package.json`, deployed (e.g. Fly.io) |
| `public/` | Static assets served as-is (icons, favicon, sample avatars) |
| `images/` | Screenshots for the root README |
| `netlify.toml` | Static host + `/api/*` proxy to the backend |
| `backend/Dockerfile` | Container build for the API |
| `.env.example` | Frontend/env hints; backend env lives in `backend/.env.example` |

The `.netlify/` folder (if present) comes from local Netlify dev tooling; treat it as generated output, not primary source.

---

## Frontend (`src/`)

| Path | Contents |
|------|----------|
| `main.tsx`, `App.tsx`, `index.css` | App shell, top-level composition, global styles |
| `components/` | Feature screens and UI |
| `components/TeamDashboard.tsx` | Team overview / entry to sports and roster |
| `components/builder/` | Graph builder: sport picker, requirements, chat, live preview, node detail |
| `components/skill-tree/` | React Flow graph: lane/group nodes, skill nodes, layout context |
| `components/SkillTreeScreen.tsx`, `StudentDetailView.tsx`, `AthleteHome.tsx` | Athlete-centric views |
| `components/DiagnosticRunner.tsx` | Onboarding diagnostic flow |
| `components/StoreHydrator.tsx` | Blocks first paint until bootstrap data loads |
| `components/RoleToggle.tsx` | Coach vs athlete UI mode |
| `store/useFrontierStore.ts` | Zustand: team plans, athlete deltas, diagnostics, tasks, etc. |
| `lib/` | Shared logic: `api.ts` (HTTP), `generateApi.ts` (streaming generation), `graphSchema.ts` (JSON schema mirror), `diagnostic.ts`, `fire.ts` (spaced repetition), `graphDelta.ts`, `reonboard.ts`, `skillTreeLayout.ts`, `migrateLocalStorage.ts`, and helpers |
| `data/graph.ts`, `data/athletes.ts`, `data/student.ts` | Legacy/static seed graph and roster data |
| `onboarding/tourSteps.tsx` | Product tour |

---

## Backend (`backend/`)

| Path | Contents |
|------|----------|
| `src/index.ts` | Fastify app: CORS, `/healthz`, route registration |
| `src/env.ts` | Env parsing (DB, OpenRouter, CORS, port) |
| `src/routes/` | `generate` (AI SSE), `bootstrap`, `sportPlans`, `athleteGraphs`, `athleteState`, `importLegacy` |
| `src/lib/prompts.ts` | System prompts for team vs athlete graph generation |
| `src/lib/graphSchema.ts` | OpenRouter structured-output JSON schema (keep in sync with frontend `src/lib/graphSchema.ts`) |
| `src/lib/reonboard.ts`, `coach.ts`, `apiTypes.ts` | Re-onboarding, coach resolution, shared types |
| `src/db/schema.ts`, `src/db/client.ts` | Drizzle schema and Postgres client |
| `migrations/` | SQL migrations and Drizzle meta |
| `scripts/seed.ts`, `scripts/migrate.ts` | DB seed and migrate helpers |
| `drizzle.config.ts` | Drizzle CLI config |
| `fly.toml`, `Dockerfile` | Fly.io deploy |
| `README.md` | Backend-specific setup |

---

## How frontend and backend connect

- The browser calls `/api/*` (Vite proxy in dev, Netlify redirect in prod) → Fastify in `backend/`.
- Graph generation: `POST /api/generate` (`routes/generate.ts`) uses OpenRouter + `graphSchema` + `prompts`; the client streams and parses in `src/lib/generateApi.ts`.
- Persistence: `GET /api/bootstrap` and the REST routes keep `useFrontierStore` aligned with Postgres via Drizzle.

In short: **React app in `src/`, API and database in `backend/`, static assets in `public/`, deploy glue at the repo root.**
