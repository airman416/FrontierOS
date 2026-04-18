# Deployment readiness

An honest review of what is and isn't ready to ship publicly, captured as of Apr 2026. Use this as a pre-launch checklist.

Two scenarios are considered:

- **Private demo** — 2–3 invited coaches, you on pager, small blast radius.
- **Public launch** — open sign-ups, real user data, no hand-holding.

---

## Hard blockers for anything public

### 1. No auth; coach id is a hardcoded env var

`backend/src/lib/coach.ts` always returns `env.DEFAULT_COACH_ID`. Every request from every browser writes to the same coach row. Combined with `ALLOWED_ORIGINS` defaulting to `*` (see `backend/src/env.ts` → `parseAllowedOrigins()` returns `true`), any site on the internet can call the API.

If two coaches use it at once, they **share and overwrite each other's athletes, plans, deltas, and training state**. This is not "multi-tenant later" — it's single-user-at-a-time.

### 2. Athlete-scoped write endpoints don't enforce coach ownership

`PATCH /api/athletes/:id/state`, `POST /api/athletes/:id/reset`, the graph delta routes, and `POST /api/import-legacy` all take an athlete id directly and write without checking that the athlete belongs to the current coach. Once auth is added, every one of these needs a coach-ownership check retrofitted. Today, a leaked ID lets anyone wipe it.

### 3. `POST /api/generate` is an open proxy to the OpenRouter key

- No rate limit, no auth, no abuse header check, no per-IP quota.
- A single attacker with a while-loop against `frontieros-api.fly.dev/api/generate` will drain the OpenRouter balance in minutes.
- `netlify.toml` redirects `/api/*` straight to Fly, so "hiding behind Netlify" does not apply.

### 4. CORS default is `*`

`ALLOWED_ORIGINS` unset → allow-all. Compounds #1 and #3. Must be set to the Netlify domain(s) on Fly before any public link exists.

---

## Real risks that will show up in the first week

### 5. Zero tests, zero CI

No `*.test.*` files, no `.github/workflows`. The diagnostic engine, re-onboarding fuzzy match, and delta merge are the exact pure-logic modules that deserve snapshot tests — and are where silent bugs will erode coach trust fastest. One schema change can make re-onboarding map the wrong skills with no one noticing.

### 6. Fire-and-forget writes

Per the README, mutations "apply optimistic updates in-memory and fire-and-forget the matching API request." Transient 5xx / offline / Fly cold-starts silently drop a coach's diagnostic calls. They won't know until the next page reload shows their work gone.

- **Minimum**: toast on failure + visible "unsaved" indicator.
- **Long-term**: queue with retry and backoff.

### 7. No observability

No Sentry, no logtail, no structured error reporting. When a coach says "it broke," you'll have Fly's ring buffer and nothing else. Sentry on client + server is ~30 min of work and should land before any real user does.

### 8. Fly machine is 1× shared CPU / 512 MB / `min_machines_running = 0`

- Cold start on the first `/api/bootstrap` of the day. That route runs 5 parallel queries — fine, but boot cost adds a noticeable first-request lag each morning.
- `bodyLimit: 8 MB` + streaming LLM call + potential fan-out re-onboard of every athlete can spike memory. 512 MB is tight beyond a handful of athletes per sport plan change.

### 9. "Regenerate team plan" is destructive with weak undo

`PUT /api/sport-plans/:sport` replaces the graph and fan-out re-onboards every athlete using `seedFromPriorDiagnostic`. A bad generation (or label-drift regression in the prompt) silently rewrites every athlete's mastery map. There is no versioned plan history, no "revert plan," no diff preview. One bad AI output can cost a coach a week of onboarding work.

### 10. Supabase free tier + pooler

- Free tier auto-pauses after ~7 days idle. First request after that is a 30+s cold start *plus* Fly cold start.
- Free tier backups are ~24h and can't be restored without upgrading. For real users, Pro ($25/mo) and a documented restore procedure are the floor.
- Migrations run via `npm run db:push` / scripts; no `drizzle-orm/migrator` call in the boot path. Forgetting to run it on a schema bump ships a broken endpoint.

### 11. Demo / reset endpoints are live in prod

`POST /api/reset-demo` wipes every athlete's training state for the current coach, with no auth. Fine for a demo; a footgun for anyone real.

### 12. Single OpenRouter model, no fallback

Default is `google/gemini-2.5-flash`. When OpenRouter has a 30-minute blip (they do), every "Generate" button returns 502 and the coach thinks the product is broken. At least one fallback model is cheap insurance.

---

## Product-level issues that slow adoption, not block launch

### 13. Demo seeds a real-looking baseball roster

First-time coaches see someone else's team. Decide the empty-state experience; the UX currently assumes pre-seeded athletes.

### 14. No onboarding path for *coaches*

The workflow in the README is good, but a new coach lands on a dashboard with no team, no sport picked, and (per #13) possibly a demo roster they didn't create. First 60 seconds matter.

### 15. "Fuzzy match by skill label" for re-onboarding is a trust minefield

When it's wrong, coaches lose confidence fast. Surfacing "here are the N skills we couldn't confidently carry over, please verify" as a required step after regeneration is probably non-negotiable.

---

## Minimal "ship it tomorrow" list (private demo)

For 2–3 invited coaches with you on pager:

- [ ] Lock `ALLOWED_ORIGINS` to the Netlify domain on Fly.
- [ ] Put **any** auth in front of `/api/generate` — even a shared bearer token handed out with invites. (`app.addHook('onRequest', …)` checking `Authorization`.) Plugs the OpenRouter cost bomb without building real auth.
- [ ] Add basic rate limit: `@fastify/rate-limit`, 30 req/min/IP globally, stricter on `/api/generate`.
- [ ] Gate or disable `/api/reset-demo` and `/api/import-legacy` in production.
- [ ] Add Sentry on both sides.
- [ ] Upgrade Supabase to Pro **or** accept the data-loss risk in writing.
- [ ] Put a visible "report a bug" link in the UI, since UI-side failures are otherwise invisible.

## "Public launch" list

For open sign-ups and real users — roughly one week of unglamorous hardening:

- [ ] Real coach auth (Supabase Auth or Clerk drops in cleanly — `coachId` is already threaded through every table).
- [ ] Coach-ownership checks on every write route that takes an `:athleteId` or sport param.
- [ ] Retries + toasts on mutations; kill the fire-and-forget pattern or wrap it.
- [ ] Smoke tests on diagnostic, delta, and re-onboard logic.
- [ ] Plan-version history with one-click revert.
- [ ] Post-regeneration "verify these N mappings" step before results commit.
- [ ] Fallback OpenRouter model + retry.
- [ ] Observability: Sentry, structured request logs, uptime checks on `/healthz`.
- [ ] Backup / restore runbook for Supabase.

---

## Summary

The architecture is in good shape for this: `coachId` is on every table, the delta model is clean, the route surface is small. This is not a rewrite. It is ~5 working days of hardening between "I can show this to friends" and "I can let strangers sign up."

"Deploy tomorrow" is honest only if the invite list is tiny, the bearer token and CORS lockdown are in place, and you accept that the first class of bugs will be silent write loss.