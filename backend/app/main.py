"""FastAPI entrypoint for the FrontierOS generate service.

Exposes:
  GET  /healthz            — liveness probe for Fly.io
  POST /api/generate       — SSE-streamed proxy to OpenRouter chat completions

This service is functionally equivalent to `netlify/functions/generate.ts`
so the SPA can target either deployment by setting `VITE_GENERATE_URL`.
"""

from __future__ import annotations

import json
import logging
import os
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .prompts import build_athlete_system_prompt, build_sport_system_prompt
from .schemas import GRAPH_JSON_SCHEMA, GenerateRequest

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.5-flash"

logger = logging.getLogger("frontieros.generate")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(title="FrontierOS Generate API", version="1.0.0")

_allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*").strip()
if _allowed_origins_raw == "*":
    _allowed_origins = ["*"]
else:
    _allowed_origins = [o.strip() for o in _allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/generate")
async def generate(body: GenerateRequest):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    mode = body.mode or "sport"
    if mode == "athlete":
        system_prompt = build_athlete_system_prompt(
            body.sport, body.requirements, body.athleteContext
        )
    else:
        system_prompt = build_sport_system_prompt(body.sport, body.requirements)

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for msg in body.history:
        messages.append({"role": msg.role, "content": msg.content})

    context_parts: list[str] = []
    if mode == "athlete" and body.baseGraph:
        context_parts.append(f"[Team baseline graph: {json.dumps(body.baseGraph)}]")
    if body.currentGraph:
        label = "Current athlete graph" if mode == "athlete" else "Current graph state for reference"
        context_parts.append(f"[{label}: {json.dumps(body.currentGraph)}]")

    if context_parts and messages and messages[-1]["role"] == "user":
        messages[-1]["content"] += "\n\n" + "\n\n".join(context_parts)

    payload = {
        "model": os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL),
        "messages": messages,
        "stream": True,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "graph_generation",
                "strict": True,
                "schema": GRAPH_JSON_SCHEMA,
            },
        },
        "provider": {"require_parameters": True},
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("HTTP_REFERER", "https://frontier-os.netlify.app"),
        "X-Title": os.getenv("OPENROUTER_APP_TITLE", "Frontier OS"),
    }

    # Generous read timeout — a full graph generation can take 30–90s on
    # slower providers, and Fly.io has no external request-duration cap.
    timeout = httpx.Timeout(connect=15.0, read=600.0, write=60.0, pool=60.0)
    client = httpx.AsyncClient(timeout=timeout)

    try:
        upstream_req = client.build_request(
            "POST", OPENROUTER_URL, headers=headers, json=payload
        )
        upstream = await client.send(upstream_req, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        logger.exception("Upstream request failed")
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc

    if upstream.status_code != 200:
        err_body = (await upstream.aread()).decode("utf-8", errors="replace")
        await upstream.aclose()
        await client.aclose()
        logger.warning(
            "OpenRouter returned %s: %s", upstream.status_code, err_body[:500]
        )
        return JSONResponse(
            status_code=upstream.status_code,
            content={"error": "OpenRouter error", "detail": err_body},
        )

    async def iter_upstream() -> AsyncIterator[bytes]:
        try:
            async for chunk in upstream.aiter_raw():
                if chunk:
                    yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        iter_upstream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Disable proxy buffering (nginx/Cloudflare) so SSE chunks flush
            # to the browser in real time instead of being batched.
            "X-Accel-Buffering": "no",
        },
    )
