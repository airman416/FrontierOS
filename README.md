![Frontier OS](images/image.png)

# Frontier OS

**You can't make every athlete the best. But you *can* make them a lot better, a lot faster than everyone else.**

---

## The Problem

Most training programs fail for two reasons:

1. **No accountability.** Deliberate practice is painful. Without structure, athletes half-ass it - and half-assing creates an *illusion of comprehension*. They feel like they're improving when they're not.
2. **Ignoring how the brain actually works.** The bottleneck to learning any skill is *working memory*. It can only hold a few things at once. If you overload it, nothing sticks.

![Team Dashboard](images/team.png)

## How Frontier OS Fixes It

### A knowledge graph of every skill in the sport

Instead of a flat checklist, Frontier OS maps skills as a connected graph - from Sleep Hygiene all the way up to Peak Game Performance. Each node has prerequisites, so when an athlete completes a complex task like an intrasquad scrimmage, the system gives credit for *every underlying skill* that task required (conditioning, fielding, situational hitting, etc.).

This means coaches always know exactly what an athlete can and can't do - and what they should work on next.

![Skill Tree](images/skilltree.png)

### Effortful retrieval, not passive repetition

The fastest way to build long-term memory is to *make the brain work to recall things*. That's why Frontier OS uses frequent low-stakes testing - pressure at-bats, clutch hitting drills, random pitch sequences. Research shows this kind of retrieval practice doesn't just build stronger memory, it actually *reduces* test anxiety over time because athletes get used to performing under pressure.

### Built-in accountability

Every skill node is gated by objective benchmarks. No social promotion. Athletes advance only when they demonstrate mastery - not when they've logged enough hours. The system also adjusts intensity based on real-time readiness (CNS fatigue, sleep, etc.), so athletes train at their actual edge instead of coasting or overreaching.

### Learning science techniques at every step

| Technique | What it does |
|---|---|
| **Spaced repetition** | Small daily doses beat one marathon block |
| **Interleaving** | Randomized practice mirrors in-game chaos |
| **Testing effect** | Pressure reps expose real gaps |
| **Non-interference** | One motor pattern per micro-cycle so skills don't blur |
| **Automaticity** | Drill until subconscious - frees working memory for game reads |
| **Encompassings** | Complex tasks that exercise many graph nodes at once |

---

## What's New

The original Frontier OS shipped with a single hand-built baseball graph. Everything below was added on top.

### The AI builds the graph for you

Any sport, any philosophy. A coach types what they want - *"High-school softball, every athlete does carnivore, pre-season emphasis on defensive fundamentals"* - and the AI generates a complete knowledge graph: skills, prerequisites, levels, and short diagnostic prompts for each node. Baseball, basketball, soccer, swimming, tennis, wrestling, volleyball all work out of the box, and anything else can be typed in free-form.

After the first generation, coaches can keep iterating in a chat panel next to a live graph preview. *"Add a mental game lane,"* *"merge these two nodes,"* *"simplify the strength branch"* - the graph updates in place.

Each turn is **structured output**: the model returns a short coach-facing reply plus a JSON graph (skills, athletes, tasks, labels) that matches a fixed schema, so the visualizer and diagnostics plug in without fragile parsing. The system prompts spell out **how** graphs are assembled - tiered levels, universal foundations vs sport-specific nodes, valid prerequisite edges, quick onboarding diagnostics, and roster constraints - so free-form coach requirements steer *content* while *shape* stays consistent across sports.

![Builder form](images/builder-form.png)

![Builder graph](images/builder-graph.png)

### Team plan, then per-athlete fine-tunes

There are two layers:

- **Team Plan** - one shared baseline for everyone in the sport.
- **Athlete Fine-Tune** - each athlete can diverge from the baseline with their own AI-assisted adjustments (*"Emphasize rotator cuff prehab, swap plyos for low-impact alternatives"*).

Only the differences are stored per athlete, and the UI highlights them: added nodes glow, modified nodes get an amber border, and removed nodes appear as ghosts so the coach can see exactly how this athlete's plan diverges from the team's.

![Athlete fine-tune](images/fine-tune.png)

### Onboarding diagnostic

Before an athlete starts training, the coach runs a quick diagnostic to figure out what the athlete already knows. The system picks only the skills it actually needs to ask about (the current "frontier"), shows the coach a one-line probe prompt, and takes **Pass / Partial / Fail** as the verdict.

Everything else is inferred:

- **Pass on a higher skill** → all its prerequisites are also marked known.
- **Fail on a prerequisite** → its dependent skills are marked not-known.
- **Partial** → the skill is flagged *conditional* and gets extra review reps before it's promoted to mastered.

A typical athlete is fully onboarded in a few dozen probes instead of hundreds. When one athlete is done, the UI offers to chain straight into the next un-onboarded athlete on the roster.

![Diagnostic runner](images/diagnostic.png)

### Re-onboarding when the plan changes

When a coach regenerates the team plan, previously-onboarded athletes don't have to redo everything. Their prior diagnostic results are fuzzy-matched onto the new graph by skill label, so mastery and conditional states carry over wherever the mapping is confident. Anything ambiguous is dropped (conservative) and the coach can override manually.

### Student detail view

Clicking an athlete opens their own page: today's tasks, their personalized skill tree scoped to their fine-tuned graph, spaced-repetition reviews that are due or coming up, and manual override buttons if the coach wants to flip a mastery state by hand. It's the single screen a coach uses during a session with one athlete.

![Student detail](images/student-detail.png)

---

## Workflow

The end-to-end coach flow, start to finish:

1. **Pick a sport** on the dashboard (or type in a custom one).
2. **Generate a team plan.** Describe your philosophy; the AI returns a full knowledge graph. Iterate in chat until it looks right.
3. **Onboard each athlete** with the diagnostic. A few dozen Pass / Partial / Fail calls, and the system knows where each athlete stands.
4. *(Optional)* **Fine-tune per athlete.** Describe what should be different for this kid; the AI diverges their plan from the team baseline.
5. **Run training.** Each athlete gets a daily task list generated from their current frontier, readiness, and spaced-repetition schedule. The coach tracks progress on the team heatmap and drills into individuals from the roster.

---

## Architecture at a glance

A single-page React app backed by a Node/Fastify API that owns both AI generation and persistence. For a directory-by-directory map of the repo (`src/`, `backend/`, etc.), see **[Repository structure](docs/repository-structure.md)**.

- **Frontend** - Vite + React + TypeScript + Tailwind. All the interactive graph rendering is React Flow with a dagre layout. The root is wrapped in a `StoreHydrator` that blocks first paint until `GET /api/bootstrap` resolves.
- **State** - one Zustand store (`useFrontierStore`) holds the team plan, each athlete's delta, diagnostic results, mastery, conditional states, review schedules, and dashboard tasks. Mutations apply optimistic updates in-memory and fire-and-forget the matching API request; persistence lives in Postgres.
- **Backend** - Node.js + Fastify + TypeScript in `backend/`, deployed to Fly.io. It exposes a single surface for the frontend:
  - `POST /api/generate` - streams graph generation through OpenRouter (replaces the old Netlify Function).
  - `GET /api/bootstrap` - one call that returns the coach's full world (athletes, sport plans, deltas, drafts, training state).
  - `PUT/DELETE /api/sport-plans/:sport` - team plan writes, including server-side re-onboarding of every athlete when the plan changes.
  - `PUT/DELETE/POST /api/athletes/:id/...` - per-athlete delta, draft delta, accept-draft, legacy full-graph, state patches, and resets.
  - `POST /api/import-legacy` - one-shot endpoint that migrates an existing `localStorage` snapshot into Postgres.
- **Database** - Supabase Postgres accessed through Drizzle ORM (`postgres-js` driver). Schema lives in `backend/src/db/schema.ts`. Every table carries a `coach_id` so the single-tenant demo can grow into multi-coach/auth later.
- **Delta storage** - per-athlete graphs are stored as a *diff* against the team baseline (`added` / `removed` / `modified`) in `athlete_graph_deltas`. One team plan edit propagates to everyone automatically, and each athlete's divergences stay put.
- **Diagnostic engine** - a small pure-TS module (`lib/diagnostic.ts`) that picks the next skill to probe, applies verdicts, propagates them up and down the prerequisite graph, and infers the rest.
- **Spaced repetition** - a stability/due-date tracker (`lib/fire.ts`) schedules reviews for mastered skills; the dashboard surfaces what's due today.

## Tech stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | [Vite](https://vite.dev/), [React](https://react.dev/), TypeScript, [Tailwind CSS](https://tailwindcss.com/), [Zustand](https://github.com/pmndrs/zustand), [React Flow](https://reactflow.dev/), [dagre](https://github.com/dagrejs/dagre) |
| **Backend** | [Node.js](https://nodejs.org/), [Fastify](https://fastify.dev/), TypeScript, [Zod](https://zod.dev/) (request validation) |
| **Data** | [PostgreSQL](https://www.postgresql.org/) on [Supabase](https://supabase.com/), [Drizzle ORM](https://orm.drizzle.team/) with the [`postgres`](https://github.com/porsager/postgres) driver |
| **AI** | [OpenRouter](https://openrouter.ai/) (chat completions + structured graph output), SSE streaming from the backend |

## Deployment

Production is split across three services:

| Platform | Role |
| --- | --- |
| **[Netlify](https://www.netlify.com/)** | Hosts the static Vite build (`dist/`). `netlify.toml` redirects `/api/*` to the Fly.io API so the browser keeps calling same-origin `/api/...` and never needs a separate `VITE_API_URL` for normal deploys. |
| **[Fly.io](https://fly.io/)** | Runs the Node/Fastify server (`backend/`), image built from the repo `Dockerfile`. Exposes `GET /healthz` at the app root (not under `/api`). Graph generation and all REST endpoints live under `/api/...`. |
| **[Supabase](https://supabase.com/)** | Managed Postgres. Use the **connection pooler** URLs in env (`DATABASE_URL` for the app; session pooler for migrations - see `backend/README.md`). On the free tier, direct `db.<ref>.supabase.co` is often IPv6-only; the pooler is the reliable path from IPv4 networks and from Fly. |

Optional env override: set `VITE_API_URL` only if you want the browser to talk to a Fly (or staging) backend directly instead of going through Netlify’s `/api/*` redirect.

## Run locally

```bash
# 1. Start the API (needs DATABASE_URL + OPENROUTER_API_KEY in backend/.env)
cd backend
npm install
npm run db:push   # first time only - creates tables in Supabase
npm run db:seed   # seeds the default coach + demo athletes
npm run dev       # http://localhost:8080
```

```bash
# 2. Start the frontend (in a second shell, from the repo root)
npm install
npm run dev       # http://localhost:5173
```

Vite's dev server proxies `/api/*` to the backend (`VITE_BACKEND_URL`, defaults to `http://localhost:8080`). Copy `.env.example` to `.env` if you need to override that. In production, Netlify's `netlify.toml` redirect fronts the Fly.io backend at the same `/api/*` path so no extra env is required in the browser bundle.

### Migrating an existing browser state

If you already have a demo state saved in `localStorage`, the first load after this upgrade will quietly POST it to `/api/import-legacy` and clear the keys. Nothing to do manually - just open the app once while signed in to the backend.

### AI keys

Graph generation needs `OPENROUTER_API_KEY` set on the backend (Fly secret in production, `backend/.env` locally). Without it the app still runs but any "Generate" button will error.
