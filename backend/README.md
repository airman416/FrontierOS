# FrontierOS Generate API (FastAPI)

A small FastAPI service that mirrors `netlify/functions/generate.ts` and
proxies structured-output requests to OpenRouter with SSE streaming.

Use this when your graph generation runs longer than Netlify's sync-function
timeout (10s free / 26s Pro). Fly.io has no external request-duration cap,
so the full stream can finish cleanly.

## Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py         # FastAPI app + /api/generate + /healthz
│   ├── prompts.py      # Sport + athlete system prompts (ported from TS)
│   └── schemas.py      # Pydantic request models + OpenRouter JSON schema
├── Dockerfile
├── .dockerignore
├── fly.toml
├── requirements.txt
└── README.md
```

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export OPENROUTER_API_KEY=sk-or-...
uvicorn app.main:app --reload --port 8080
```

Then:

```bash
curl http://localhost:8080/healthz
```

## Run via Docker

```bash
cd backend
docker build -t frontieros-api .
docker run --rm -p 8080:8080 \
  -e OPENROUTER_API_KEY=sk-or-... \
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

   - Pick a unique app name (update `app = "..."` in `fly.toml` if prompted).
   - Say **no** to creating a Postgres / Redis / Tigris — none are needed.

3. Set secrets:

   ```bash
   fly secrets set OPENROUTER_API_KEY=sk-or-...
   # Optional — lock CORS to your frontend domain(s)
   fly secrets set ALLOWED_ORIGINS="https://frontier-os.netlify.app,http://localhost:5173"
   ```

4. Deploy:

   ```bash
   fly deploy
   ```

5. Health-check the public URL:

   ```bash
   curl https://<your-app>.fly.dev/healthz
   ```

## Environment variables

| Name                 | Required | Default                            | Purpose                                              |
| -------------------- | -------- | ---------------------------------- | ---------------------------------------------------- |
| `OPENROUTER_API_KEY` | yes      | —                                  | OpenRouter API key                                   |
| `ALLOWED_ORIGINS`    | no       | `*`                                | Comma-separated CORS origins                         |
| `OPENROUTER_MODEL`   | no       | `google/gemini-2.5-flash`          | Override the model slug                              |
| `HTTP_REFERER`       | no       | `https://frontier-os.netlify.app`  | Sent to OpenRouter for app attribution               |
| `OPENROUTER_APP_TITLE` | no     | `Frontier OS`                      | Sent to OpenRouter for app attribution               |
| `LOG_LEVEL`          | no       | `INFO`                             | Python logging level                                 |
| `PORT`               | no       | `8080`                             | Bind port (Fly.io sets this automatically)           |

## Point the frontend at Fly.io

The SPA reads `VITE_GENERATE_URL` and falls back to `/api/generate` when
unset — so the existing Netlify deploy keeps working with the embedded
function. To cut the Netlify frontend over to this backend, set the
variable in Netlify's site env and redeploy:

```
VITE_GENERATE_URL=https://<your-app>.fly.dev/api/generate
```

You can leave the Netlify function in place as a fallback or delete it
later once Fly.io is proven out.
